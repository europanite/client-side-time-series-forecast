#!/usr/bin/env node
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_CSV = "data/air_passengers.csv";
const DEFAULT_TRAIN_SIZE = 128;
const DEFAULT_HORIZON = 16;
const DEFAULT_PERIOD = 12;

const CHRONOS_MODEL_URL =
  "https://huggingface.co/OpenSTEF/chronos-2-small-onnx/resolve/main/chronos-2-small_int8.onnx";
const CHRONOS_CACHE = ".cache/chronos-2-small_int8.onnx";
const CHRONOS_PATCH_SIZE = 16;
const CHRONOS_INTERNAL_HORIZON = 42 * CHRONOS_PATCH_SIZE;
const CHRONOS_QUANTILES = [
  0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5,
  0.6, 0.7, 0.8, 0.9, 0.95, 0.99,
];
const CHRONOS_MEDIAN_INDEX = CHRONOS_QUANTILES.indexOf(0.5);

function parseArgs(argv) {
  const args = {
    csv: DEFAULT_CSV,
    valueColumn: "Passengers",
    trainSize: DEFAULT_TRAIN_SIZE,
    horizon: DEFAULT_HORIZON,
    period: DEFAULT_PERIOD,
    algorithm: "all",
    json: false,
    markdown: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--csv") args.csv = argv[++i];
    else if (arg === "--value-column") args.valueColumn = argv[++i];
    else if (arg === "--train-size") args.trainSize = Number(argv[++i]);
    else if (arg === "--horizon") args.horizon = Number(argv[++i]);
    else if (arg === "--period") args.period = Number(argv[++i]);
    else if (arg === "--algorithm") args.algorithm = argv[++i];
    else if (arg === "--json") args.json = true;
    else if (arg === "--markdown") args.markdown = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  const allowed = ["all", "last-value", "seasonal-naive", "xgboost", "lightgbm", "chronos"];
  if (!allowed.includes(args.algorithm)) {
    throw new Error(`algorithm must be one of: ${allowed.join(", ")}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/benchmark-air-passengers-fair.mjs [options]

Fair fixed-origin holdout benchmark.

Defaults:
  train observations: 128
  forecast horizon:   16
  seasonal period:    12

The holdout targets are never fed back to a model during forecasting.

Options:
  --csv <path>
  --value-column <column> (default Passengers)
  --train-size <n>
  --horizon <n>
  --period <n>
  --algorithm <all|last-value|seasonal-naive|xgboost|lightgbm|chronos>
  --json
  --markdown
  -h, --help
`);
}

function parseNumericSeriesCSV(csvText, valueColumn = "Passengers") {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  const headers = (lines.shift() ?? "").split(",").map((v) => v.trim());

  const dateIndex = headers.indexOf("Date");
  const valueIndex = headers.indexOf(valueColumn);
  if (dateIndex < 0 || valueIndex < 0) {
    throw new Error(`expected Date and ${valueColumn} columns`);
  }

  return lines.map((line, rowIndex) => {
    const cells = line.split(",").map((v) => v.trim());
    const value = Number(cells[valueIndex]);
    if (!Number.isFinite(value)) {
      throw new Error(`invalid numeric value at row ${rowIndex + 2}`);
    }
    return { date: cells[dateIndex], value };
  });
}

function validateProtocol(series, args) {
  if (!Number.isInteger(args.trainSize) || args.trainSize <= 0) {
    throw new Error("train-size must be a positive integer");
  }
  if (!Number.isInteger(args.horizon) || args.horizon <= 0) {
    throw new Error("horizon must be a positive integer");
  }
  if (!Number.isInteger(args.period) || args.period <= 0) {
    throw new Error("period must be a positive integer");
  }
  if (args.trainSize + args.horizon > series.length) {
    throw new Error(
      `train-size + horizon exceeds series length ${series.length}`
    );
  }
  if (args.horizon > CHRONOS_INTERNAL_HORIZON) {
    throw new Error(
      `horizon must be <= Chronos internal horizon ${CHRONOS_INTERNAL_HORIZON}`
    );
  }
}

function splitHoldout(series, trainSize, horizon) {
  return {
    train: series.slice(0, trainSize),
    test: series.slice(trainSize, trainSize + horizon),
  };
}

function seasonalScale(train, period) {
  if (train.length <= period) return NaN;

  let sum = 0;
  let count = 0;
  for (let i = period; i < train.length; i += 1) {
    sum += Math.abs(train[i].value - train[i - period].value);
    count += 1;
  }
  return count ? sum / count : NaN;
}

function metrics(predictions, train, period) {
  let absError = 0;
  let squaredError = 0;
  let ape = 0;
  let sape = 0;
  let mapeCount = 0;
  let smapeCount = 0;

  for (const row of predictions) {
    const error = row.predicted - row.actual;
    const abs = Math.abs(error);
    absError += abs;
    squaredError += error * error;

    if (row.actual !== 0) {
      ape += abs / Math.abs(row.actual);
      mapeCount += 1;
    }

    const denominator =
      Math.abs(row.actual) + Math.abs(row.predicted);
    if (denominator !== 0) {
      sape += (2 * abs) / denominator;
      smapeCount += 1;
    }
  }

  const n = predictions.length;
  const mae = absError / n;
  const scale = seasonalScale(train, period);

  return {
    count: n,
    mae,
    rmse: Math.sqrt(squaredError / n),
    mape: mapeCount ? (ape / mapeCount) * 100 : NaN,
    smape: smapeCount ? (sape / smapeCount) * 100 : NaN,
    mase: Number.isFinite(scale) && scale !== 0 ? mae / scale : NaN,
  };
}

function runLastValue(train, test) {
  const last = train.at(-1).value;
  return test.map((actual) => ({ date: actual.date, actual: actual.value, predicted: last }));
}

function runSeasonalNaive(train, test, period) {
  const history = train.map((point) => ({ ...point }));
  const predictions = [];

  for (const actual of test) {
    const seasonalIndex = history.length - period;
    const predicted =
      seasonalIndex >= 0
        ? history[seasonalIndex].value
        : history[history.length - 1].value;

    predictions.push({
      date: actual.date,
      actual: actual.value,
      predicted,
    });

    // No leakage: append the prediction, never the holdout truth.
    history.push({ date: actual.date, value: predicted });
  }

  return predictions;
}

function toLoadedRows(series) {
  return {
    headers: ["Date", "Passengers"],
    datetimeKey: "Date",
    targetKey: "Passengers",
    rows: series.map((point) => ({
      Date: point.date,
      Passengers: String(point.value),
    })),
  };
}

// Mirrors frontend/app/src/api.ts buildFeatures().
function buildFeatures(rows, datetimeKey, targetKey) {
  const MAX_LAG = 3;
  const ROLLING_WINDOW = 7;

  const values = rows.map((row) => Number(row[targetKey]));
  const n = rows.length;

  const getValue = (index) => {
    if (!values.length) return NaN;
    const i = Math.max(0, Math.min(values.length - 1, index));
    return values[i];
  };

  const rollingMean = (index) => {
    const end = Math.max(0, Math.min(values.length - 1, index));
    const start = Math.max(0, end - (ROLLING_WINDOW - 1));
    const slice = values.slice(start, end + 1).filter(Number.isFinite);
    if (!slice.length) return NaN;
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  };

  const buildRowFeatures = (t, isFuture) => {
    const baseIndex = isFuture ? n - 1 : t - 1;
    const features = [];

    for (let lag = 1; lag <= MAX_LAG; lag += 1) {
      features.push(getValue(baseIndex - lag));
    }

    const current = getValue(baseIndex);
    const previous = getValue(baseIndex - 1);
    features.push(current - previous);
    features.push(rollingMean(baseIndex));

    const timeIndex = isFuture ? n : t;
    features.push(timeIndex);
    features.push(Math.sin((2 * Math.PI * timeIndex) / 7));
    features.push(Math.cos((2 * Math.PI * timeIndex) / 7));
    features.push(Math.sin((2 * Math.PI * timeIndex) / 30));
    features.push(Math.cos((2 * Math.PI * timeIndex) / 30));
    features.push(Math.sin((2 * Math.PI * timeIndex) / 365));
    features.push(Math.cos((2 * Math.PI * timeIndex) / 365));

    return features.map((value) => (Number.isFinite(value) ? value : 0));
  };

  const X = [];
  const y = [];
  for (let t = 1; t < n; t += 1) {
    const target = Number(rows[t]?.[targetKey]);
    if (!Number.isFinite(target)) continue;
    X.push(buildRowFeatures(t, false));
    y.push(target);
  }

  return {
    X,
    y,
    lastFeatureRow: buildRowFeatures(n, true),
  };
}

function findFirstExistingPath(paths) {
  return paths.find((candidate) => existsSync(candidate)) ?? null;
}

function frontendRequire() {
  const packageJsonPath = findFirstExistingPath([
    resolve(process.cwd(), "frontend/app/package.json"),
    "/app/package.json",
  ]);

  if (!packageJsonPath) {
    throw new Error("could not locate frontend/app/package.json");
  }

  return createRequire(packageJsonPath);
}

async function resolveXGBoostCtor(mod) {
  if (!mod) return null;
  if (typeof mod.then === "function") {
    return resolveXGBoostCtor(await mod);
  }
  if (mod.default) {
    const ctor = await resolveXGBoostCtor(mod.default);
    if (ctor) return ctor;
  }
  if (typeof mod.XGBoost === "function") return mod.XGBoost;
  if (typeof mod === "function") return mod;
  return null;
}

async function loadXGBoostCtor() {
  const requireFromApp = frontendRequire();
  let mod;

  try {
    mod = requireFromApp("ml-xgboost");
  } catch (error) {
    if (error?.code !== "ERR_REQUIRE_ESM") throw error;
    const resolved = requireFromApp.resolve("ml-xgboost");
    mod = await import(pathToFileURL(resolved).href);
  }

  const ctor = await resolveXGBoostCtor(mod);
  if (!ctor) throw new Error("ml-xgboost constructor not found");
  return ctor;
}

function installLocalXGBoostWasmFetch() {
  const wasmPath = findFirstExistingPath([
    resolve(
      process.cwd(),
      "frontend/app/public/vendor/ml-xgboost/xgboost.wasm"
    ),
    "/app/public/vendor/ml-xgboost/xgboost.wasm",
  ]);

  if (!wasmPath) throw new Error("xgboost.wasm not found");

  const wasm = readFileSync(wasmPath);
  const originalFetch = globalThis.fetch?.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;

    if (typeof url === "string" && url.includes("xgboost.wasm")) {
      return new Response(wasm, {
        status: 200,
        headers: { "Content-Type": "application/wasm" },
      });
    }

    if (originalFetch) return originalFetch(input, init);
    throw new Error(`fetch unavailable for ${String(url)}`);
  };

  return () => {
    if (originalFetch) globalThis.fetch = originalFetch;
    else delete globalThis.fetch;
  };
}

async function trainXGBoost(train) {
  const loaded = toLoadedRows(train);
  const { X, y } = buildFeatures(
    loaded.rows,
    loaded.datetimeKey,
    loaded.targetKey
  );

  const restoreFetch = installLocalXGBoostWasmFetch();

  try {
    const XGBoost = await loadXGBoostCtor();
    const booster = new XGBoost({
      booster: "gbtree",
      objective: "reg:linear",
      max_depth: 4,
      eta: 0.1,
      min_child_weight: 1,
      subsample: 0.8,
      colsample_bytree: 1,
      silent: 1,
      iterations: 200,
    });

    await booster.train(X, y);
    return booster;
  } finally {
    restoreFetch();
  }
}

async function predictXGBoostNext(history, model) {
  const loaded = toLoadedRows(history);
  const { lastFeatureRow } = buildFeatures(
    loaded.rows,
    loaded.datetimeKey,
    loaded.targetKey
  );

  const prediction = await model.predict([lastFeatureRow]);
  return Array.isArray(prediction)
    ? Number(prediction[0])
    : Number(prediction);
}

function mean(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return NaN;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function seasonalContinuation(history, period) {
  const values = history.map((point) => point.value).filter(Number.isFinite);
  if (!values.length) return NaN;
  if (values.length <= period) return values[values.length - 1];

  const anchor = values[values.length - period];
  const recent = values.slice(Math.max(0, values.length - period));
  const previous = values.slice(
    Math.max(0, values.length - period * 2),
    Math.max(0, values.length - period)
  );
  const levelShift = mean(recent) - mean(previous);

  return Number.isFinite(anchor + levelShift)
    ? anchor + levelShift
    : values[values.length - 1];
}

async function runXGBoost(train, test, period) {
  const model = await trainXGBoost(train);
  const history = train.map((point) => ({ ...point }));
  const predictions = [];

  for (const actual of test) {
    const raw = await predictXGBoostNext(history, model);
    const predicted = raw;

    if (!Number.isFinite(predicted)) {
      throw new Error(`non-finite XGBoost forecast for ${actual.date}`);
    }

    predictions.push({
      date: actual.date,
      actual: actual.value,
      predicted,
    });

    // No leakage: recurse on our own forecast.
    history.push({ date: actual.date, value: predicted });
  }

  return predictions;
}

async function loadLightGBMFactory() {
  const requireFromApp = frontendRequire();
  let mod;

  try {
    mod = requireFromApp("@wlearn/lightgbm");
  } catch (error) {
    if (error?.code !== "ERR_REQUIRE_ESM") throw error;
    const resolved = requireFromApp.resolve("@wlearn/lightgbm");
    mod = await import(pathToFileURL(resolved).href);
  }

  const factory =
    mod?.LGBModel ??
    mod?.default?.LGBModel ??
    mod?.default;

  if (!factory || typeof factory.create !== "function") {
    throw new Error(
      "@wlearn/lightgbm did not expose LGBModel.create()"
    );
  }

  return factory;
}

async function trainLightGBM(train) {
  const loaded = toLoadedRows(train);
  const { X, y } = buildFeatures(
    loaded.rows,
    loaded.datetimeKey,
    loaded.targetKey
  );

  const LGBModel = await loadLightGBMFactory();
  const model = await LGBModel.create({
    task: "regression",
    learning_rate: 0.1,
    num_leaves: 31,
    max_depth: 4,
    subsample: 0.8,
    colsample_bytree: 1,
    numRound: 200,
    verbosity: -1,
  });

  await model.fit(X, y);
  return model;
}

async function predictLightGBMNext(history, model) {
  const loaded = toLoadedRows(history);
  const { lastFeatureRow } = buildFeatures(
    loaded.rows,
    loaded.datetimeKey,
    loaded.targetKey
  );

  const prediction = await model.predict([lastFeatureRow]);
  return Number(prediction[0]);
}

async function runLightGBM(train, test, period) {
  const model = await trainLightGBM(train);
  const history = train.map((point) => ({ ...point }));
  const predictions = [];

  try {
    for (const actual of test) {
      const raw = await predictLightGBMNext(history, model);
      const predicted = raw;

      if (!Number.isFinite(predicted)) {
        throw new Error(
          `non-finite LightGBM forecast for ${actual.date}`
        );
      }

      predictions.push({
        date: actual.date,
        actual: actual.value,
        predicted,
      });

      // No leakage: recurse on our own forecast.
      history.push({ date: actual.date, value: predicted });
    }
  } finally {
    if (typeof model.dispose === "function") {
      model.dispose();
    }
  }

  return predictions;
}

async function loadChronosBytes() {
  const cachePath = resolve(process.cwd(), CHRONOS_CACHE);

  if (existsSync(cachePath)) {
    return new Uint8Array(readFileSync(cachePath));
  }

  console.error(`downloading Chronos model to ${CHRONOS_CACHE} ...`);
  const response = await fetch(CHRONOS_MODEL_URL);

  if (!response.ok) {
    throw new Error(
      `Chronos download failed: ${response.status} ${response.statusText}`
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, bytes);
  return bytes;
}

async function runChronos(train, test) {
  const requireFromApp = frontendRequire();
  const ort = requireFromApp("onnxruntime-web");

  // In Node, onnxruntime-web resolves its bundled local WASM runtime.
  // Do not force the browser CDN path here: Node's ESM loader rejects
  // https: module imports for the runtime glue module.
  ort.env.wasm.numThreads = 1;

  const clean = train.map((point) => Number(point.value));
  const paddingLength =
    (CHRONOS_PATCH_SIZE - (clean.length % CHRONOS_PATCH_SIZE)) %
    CHRONOS_PATCH_SIZE;
  const contextLength = clean.length + paddingLength;

  const context = new Float32Array(contextLength);
  context.fill(Number.NaN);
  context.set(clean, paddingLength);

  const attentionMask = new Float32Array(contextLength);
  attentionMask.fill(1, paddingLength);

  const futureCovariates =
    new Float32Array(CHRONOS_INTERNAL_HORIZON);
  const futureCovariatesMask =
    new Float32Array(CHRONOS_INTERNAL_HORIZON);
  const groupIds = BigInt64Array.from([0n]);

  const modelBytes = await loadChronosBytes();
  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  try {
    const results = await session.run({
      context: new ort.Tensor(
        "float32",
        context,
        [1, contextLength]
      ),
      group_ids: new ort.Tensor(
        "int64",
        groupIds,
        [1]
      ),
      attention_mask: new ort.Tensor(
        "float32",
        attentionMask,
        [1, contextLength]
      ),
      future_covariates: new ort.Tensor(
        "float32",
        futureCovariates,
        [1, CHRONOS_INTERNAL_HORIZON]
      ),
      future_covariates_mask: new ort.Tensor(
        "float32",
        futureCovariatesMask,
        [1, CHRONOS_INTERNAL_HORIZON]
      ),
    });

    const output = results.quantile_preds;
    if (!output) throw new Error("Chronos did not return quantile_preds");

    const dims = output.dims.map(Number);
    if (
      dims.length !== 3 ||
      dims[0] !== 1 ||
      dims[1] !== CHRONOS_QUANTILES.length
    ) {
      throw new Error(`unexpected Chronos output shape [${dims.join(", ")}]`);
    }

    const outputLength = dims[2];
    if (test.length > outputLength) {
      throw new Error("Chronos output shorter than requested horizon");
    }

    return test.map((actual, timeIndex) => {
      const index =
        CHRONOS_MEDIAN_INDEX * outputLength + timeIndex;

      return {
        date: actual.date,
        actual: actual.value,
        predicted: Number(output.data[index]),
      };
    });
  } finally {
    await session.release();
  }
}

function resultFor(name, predictions, train, period) {
  return {
    algorithm: name,
    trainSize: train.length,
    testSize: predictions.length,
    protocol: "fixed-origin-no-test-feedback",
    ...metrics(predictions, train, period),
    predictions,
  };
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "N/A";
}

function markdown(results, args) {
  const rows = results.map((result) =>
    `| ${result.algorithm} | ${result.trainSize} | ${result.testSize} | ` +
    `${formatNumber(result.mae)} | ${formatNumber(result.rmse)} | ` +
    `${formatNumber(result.mape)}% | ${formatNumber(result.smape)}% | ` +
    `${formatNumber(result.mase)} |`
  );

  const notes = [];
  if (args.algorithm === "all") {
    rows.push(
      `| VARMA experimental | ${args.trainSize} | ${args.horizon} | ` +
      "N/A | N/A | N/A | N/A | N/A |"
    );
    notes.push(
      "",
      "> VARMA is N/A here because AirPassengers is univariate while this",
      "> repository's VARMA implementation requires at least two numeric series."
    );
  }

  return [
    `### AirPassengers fair ${args.horizon}-step holdout`,
    "",
    `Train: first ${args.trainSize}; holdout: next ${args.horizon}.`,
    "No holdout target is fed back during forecasting.",
    "",
    "| Model | Train | Horizon | MAE | RMSE | MAPE | sMAPE | MASE |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows,
    ...notes,
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));
const csvPath = resolve(process.cwd(), args.csv);
const series = parseNumericSeriesCSV(readFileSync(csvPath, "utf8"), args.valueColumn);

validateProtocol(series, args);
const { train, test } = splitHoldout(
  series,
  args.trainSize,
  args.horizon
);

const requested =
  args.algorithm === "all"
    ? ["last-value", "seasonal-naive", "xgboost", "lightgbm", "chronos"]
    : [args.algorithm];

const results = [];

for (const name of requested) {
  console.error(`running ${name} ...`);

  let predictions;
  if (name === "last-value") {
    predictions = runLastValue(train, test);
  } else if (name === "seasonal-naive") {
    predictions = runSeasonalNaive(train, test, args.period);
  } else if (name === "xgboost") {
    predictions = await runXGBoost(train, test, args.period);
  } else if (name === "lightgbm") {
    predictions = await runLightGBM(train, test, args.period);
  } else {
    predictions = await runChronos(train, test);
  }

  results.push(
    resultFor(
      name === "chronos"
        ? "Chronos-2-small INT8 ONNX"
        : name === "lightgbm"
          ? "LightGBM WASM"
          : name,
      predictions,
      train,
      args.period
    )
  );
}

if (args.json) {
  console.log(
    JSON.stringify(
      {
        dataset: args.csv,
        valueColumn: args.valueColumn,
        protocol: "fixed-origin-no-test-feedback",
        trainSize: args.trainSize,
        horizon: args.horizon,
        period: args.period,
        results,
        skipped: [
          {
            algorithm: "VARMA experimental",
            reason:
              "A univariate series does not support the current VARMA implementation (>=2 numeric series).",
          },
        ],
      },
      null,
      2
    )
  );
} else if (args.markdown || args.algorithm === "all") {
  console.log(markdown(results, args));
} else {
  console.log(JSON.stringify(results[0], null, 2));
}
