import * as ort from "onnxruntime-web";
import type { LoadedData } from "./core";
import { DEFAULT_FORECAST_HORIZON } from "./forecast-config";
import { duplicateTimesFMInput, fillTimesFMGaps, parseTimesFMTransformersOutput, timesFMInput, TIMESFM_ONNX_BATCH } from "./timesfm-data";
import type { TimesFMForecast } from "./timesfm-data";

// This is the Hugging Face *Transformers* TimesFM 2.5 ONNX export.
// The @agentix-e/timesfm-ts ONNX uses a DIFFERENT graph and is not compatible.
// The remote model is downloaded only when TimesFM is selected and Forecast is pressed.
const DEFAULT_MODEL_URL =
  "https://huggingface.co/pdufour/timesfm-2.5-200m-transformers-onnx/resolve/main/onnx/model.onnx";
const CONFIGURED_MODEL_URL = import.meta.env.VITE_TIMESFM_MODEL_URL as string | undefined;
const MIN_MODEL_BYTES = 50 * 1024 * 1024;
type Progress = (message: string) => void;
let currentSource: File | string | null = null;
let currentSession: Promise<ort.InferenceSession> | null = null;

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";

/** Read model bytes on demand; never proxy the user's history to a server. */
async function modelBytes(source: File | string, progress?: Progress): Promise<Uint8Array> {
  if (typeof source !== "string") {
    progress?.("reading TimesFM 2.5 model from local file ...");
    return new Uint8Array(await source.arrayBuffer());
  }
  progress?.("downloading TimesFM 2.5 ONNX (~1 GB) ...");
  const response = await fetch(source);
  if (!response.ok) throw new Error(`TimesFM download failed: HTTP ${response.status}`);
  const total = Number(response.headers.get("content-length") ?? 0);
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  // Stream directly into one allocated buffer when Content-Length is exposed.
  // Avoid constructing a second full-size model buffer on memory-limited clients.
  if (!Number.isSafeInteger(total) || total < MIN_MODEL_BYTES || total > 3 * 1024 ** 3) {
    progress?.("reading TimesFM ONNX response (size not provided) ...");
    return new Uint8Array(await response.arrayBuffer());
  }
  const model = new Uint8Array(total);
  const reader = response.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (received + value.byteLength > model.length) {
      throw new Error("TimesFM download exceeds HTTP Content-Length");
    }
    model.set(value, received);
    received += value.byteLength;
    if (received === value.byteLength || received % (32 * 1024 * 1024) < value.byteLength) {
      progress?.(`TimesFM downloaded ${(received / 1048576).toFixed(0)} MiB / ${(total / 1048576).toFixed(0)} MiB`);
    }
  }
  if (received !== total) throw new Error("TimesFM download ended before Content-Length");
  return model;
}

async function openSession(source: File | string, progress?: Progress): Promise<ort.InferenceSession> {
  const bytes = await modelBytes(source, progress);
  if (bytes.byteLength < MIN_MODEL_BYTES || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    throw new Error("Expected the uncompressed ~1 GB pdufour/TimesFM 2.5 ONNX (not a ZIP or other model format)");
  }
  progress?.("initializing TimesFM 2.5 ONNX Runtime Web (WASM) ...");
  try {
    return await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  } catch (error) {
    throw new Error(`TimesFM ONNX initialization failed. Use the pdufour Transformers export, not the timesfm-ts release model. ${String(error)}`);
  }
}

export function hasTimesFMModelSource(_file?: File | null): boolean {
  return true; // Defaults to the published ONNX URL; a user-selected File takes precedence.
}

export async function releaseTimesFM(): Promise<void> {
  const pending = currentSession;
  currentSession = null;
  currentSource = null;
  if (pending) {
    try { await (await pending).release(); } catch { /* No session to release if loading failed */ }
  }
}

export async function forecastTimesFMNext16(
  data: LoadedData,
  target: string,
  file?: File | null,
  onProgress?: Progress,
): Promise<TimesFMForecast> {
  const input = fillTimesFMGaps(timesFMInput(data, target));
  const source = file ?? CONFIGURED_MODEL_URL ?? DEFAULT_MODEL_URL;
  if (currentSource !== source || !currentSession) {
    await releaseTimesFM();
    currentSource = source;
    const pending = openSession(source, onProgress);
    currentSession = pending;
    void pending.catch(() => {
      if (currentSession === pending) {
        currentSource = null;
        currentSession = null;
      }
    });
  }
  const session = await currentSession;
  // Refuse unknown model signatures rather than returning plausible but wrong values.
  if (session.inputNames.length !== 1 || session.inputNames[0] !== "past_values" ||
      !session.outputNames.includes("full_predictions") ||
      !session.outputNames.includes("mean_predictions")) {
    throw new Error("Incompatible TimesFM ONNX graph: expected past_values / full_predictions / mean_predictions");
  }
  onProgress?.(`running TimesFM 2.5 (${DEFAULT_FORECAST_HORIZON} steps) ...`);
  // This ONNX artifact rejects batch=1 (actual ORT error: expected 2).
  // Duplicate the same target history rather than injecting a different series.
  const batchedInput = duplicateTimesFMInput(input);
  const feeds: Record<string, ort.Tensor> = {
    past_values: new ort.Tensor("float32", batchedInput, [TIMESFM_ONNX_BATCH, input.length]),
  };
  const output = await session.run(feeds);
  const forecast = output.full_predictions;
  if (!forecast || !("dims" in forecast) || !("data" in forecast)) {
    throw new Error("TimesFM ONNX returned no full_predictions tensor");
  }
  return parseTimesFMTransformersOutput(
    { dims: forecast.dims, data: forecast.data as ArrayLike<number> }, data,
  );
}
