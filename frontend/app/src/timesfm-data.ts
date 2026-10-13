import type { ForecastPoint, LoadedData } from "./core";
import { DEFAULT_FORECAST_HORIZON } from "./forecast-config";
import { forecastTimeLabels } from "./forecast-time";

export const TIMESFM_MAX_CONTEXT = 1024;
// This third-party ONNX graph currently requires a fixed batch dimension of 2.
// Duplicate the same context, then use only the first output row.
export const TIMESFM_ONNX_BATCH = 2;
const MIN_OBSERVATIONS = 16;
export type TimesFMForecast = {
  points: ForecastPoint[];
  lower: number[];
  median: number[];
  upper: number[];
};

export function timesFMInput(data: LoadedData, target: string): Float32Array {
  if (!data.headers.includes(target) || target === data.datetimeKey) {
    throw new Error(`Invalid TimesFM target: ${target}`);
  }
  // Retain rows instead of filtering missing values: deleting a row changes
  // temporal spacing. The upstream model can handle NaN gaps.
  const values = data.rows.slice(-TIMESFM_MAX_CONTEXT).map((row) => {
    const raw = row[target];
    if (raw === null || raw === undefined || String(raw).trim() === "") return NaN;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  });
  if (values.filter(Number.isFinite).length < MIN_OBSERVATIONS) {
    throw new Error(`TimesFM 2.5 requires at least ${MIN_OBSERVATIONS} numeric observations.`);
  }
  return Float32Array.from(values);
}

/** Fill missing observations without deleting time steps. TimesFM's Transformers
 * ONNX export expects a fully finite [batch, context] float32 tensor. */
export function fillTimesFMGaps(input: Float32Array): Float32Array {
  const output = Float32Array.from(input);
  let previous = -1;
  for (let i = 0; i < output.length; i += 1) {
    if (!Number.isFinite(output[i])) continue;
    if (previous < 0) {
      output.fill(output[i], 0, i);
    } else if (i > previous + 1) {
      const start = output[previous], end = output[i];
      const length = i - previous;
      for (let j = previous + 1; j < i; j += 1) {
        output[j] = start + (end - start) * (j - previous) / length;
      }
    }
    previous = i;
  }
  if (previous < 0) throw new Error("TimesFM context has no valid numeric observations");
  output.fill(output[previous], previous + 1);
  if (!Array.from(output).every(Number.isFinite)) {
    throw new Error("TimesFM context contains non-finite values after interpolation");
  }
  return output;
}

/** Build the ONNX input for an export that fixes the batch dimension at 2.
 * Both input rows represent the SAME series; this is not extra training data.
 * The returned tensor must be shaped [2, contextLength].
 */
export function duplicateTimesFMInput(input: Float32Array): Float32Array {
  if (!input.length || !Array.from(input).every(Number.isFinite)) {
    throw new Error("TimesFM ONNX context must contain finite observations");
  }
  const batched = new Float32Array(TIMESFM_ONNX_BATCH * input.length);
  for (let row = 0; row < TIMESFM_ONNX_BATCH; row += 1) {
    batched.set(input, row * input.length);
  }
  return batched;
}

/** Parse the Hugging Face Transformers TimesFM 2.5 ONNX output, NOT timesfm-ts.
 * full_predictions is row-major [B, H, 10] (mean + nine quantiles).
 * q10 = channel 1; median = channel 5; q90 = channel 9. */
export function parseTimesFMTransformersOutput(
  output: { dims: readonly number[]; data: ArrayLike<number> },
  data: LoadedData,
  horizon = DEFAULT_FORECAST_HORIZON,
): TimesFMForecast {
  if (!Number.isSafeInteger(horizon) || horizon <= 0) throw new Error("Invalid TimesFM horizon");
  const dims = output.dims;
  // Some exports permit batch=1, while this particular model requires batch=2.
  // In either case the first output row corresponds to our requested series.
  if (dims.length !== 3 || (dims[0] !== 1 && dims[0] !== TIMESFM_ONNX_BATCH) ||
      dims[1] < horizon || dims[2] !== 10 ||
      output.data.length !== dims[0] * dims[1] * dims[2]) {
    throw new Error(`Unexpected TimesFM full_predictions shape: [${dims.join(",")}] (expected [1|2,H,10])`);
  }
  const labels = forecastTimeLabels(data.rows, data.datetimeKey, horizon);
  const points: ForecastPoint[] = [], lower: number[] = [], median: number[] = [], upper: number[] = [];
  for (let step = 0; step < horizon; step += 1) {
    const offset = step * dims[2];
    const l = Number(output.data[offset + 1]);
    const m = Number(output.data[offset + 5]);
    const u = Number(output.data[offset + 9]);
    if (![l, m, u].every(Number.isFinite) || l > u) {
      throw new Error(`TimesFM returned invalid quantiles at step ${step + 1}`);
    }
    lower.push(l); median.push(m); upper.push(u);
    points.push({ label: labels[step], value: m });
  }
  return { points, lower, median, upper };
}
