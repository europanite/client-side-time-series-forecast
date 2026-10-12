import type { ForecastPoint, LoadedData } from "./core";
import { DEFAULT_FORECAST_HORIZON } from "./forecast-config";
import { forecastTimeLabels } from "./forecast-time";

export type VarmaModel = {
  kind: "varma-experimental";
  keys: string[];
  lag: number;
  maLag: number;
  means: number[];
  scales: number[];
  intercept: number[];
  coefficients: number[][];
  residualCorrection: number[];
  seasonalLag: number;
  seasonalBlend: number;
  lastVectors: number[][];
};

export type VarmaOptions = {
  lag?: number;
  maLag?: number;
  ridge?: number;
  maxSeries?: number;
  seasonalLag?: number;
  seasonalBlend?: number;
};

const DEFAULT_LAG = 7;
const DEFAULT_MA_LAG = 1;
const DEFAULT_RIDGE = 1e-2;
const DEFAULT_MAX_SERIES = 8;
const DEFAULT_SEASONAL_LAG = 7;
const DEFAULT_SEASONAL_BLEND = 0; // opt-in; no assumed seasonality

export function trainVarmaModel(
  data: LoadedData,
  options: VarmaOptions = {}
): VarmaModel {
  const lag = Math.max(1, Math.floor(options.lag ?? DEFAULT_LAG));
  const maLag = Math.max(0, Math.floor(options.maLag ?? DEFAULT_MA_LAG));
  const ridge = Math.max(0, options.ridge ?? DEFAULT_RIDGE);
  const maxSeries = Math.max(1, Math.floor(options.maxSeries ?? DEFAULT_MAX_SERIES));
  const seasonalLag = Math.max(
    1,
    Math.floor(options.seasonalLag ?? DEFAULT_SEASONAL_LAG)
  );
  const seasonalBlend = clamp(
    options.seasonalBlend ?? DEFAULT_SEASONAL_BLEND,
    0,
    0.95
  );

  const keys = getNumericKeys(data).slice(0, maxSeries);
  if (keys.length < 2) {
    throw new Error("VARMA experimental requires at least two numeric series.");
  }

  const vectors = buildNumericVectors(data.rows, keys);
  if (vectors.length <= lag) {
    throw new Error(`VARMA experimental requires more than ${lag} usable rows.`);
  }

  const { normalized, means, scales } = normalizeVectors(vectors);
  const featureCount = keys.length * lag;
  const outputCount = keys.length;
  const sampleCount = normalized.length - lag;

  const features: number[][] = [];
  const targets: number[][] = [];
  for (let i = lag; i < normalized.length; i += 1) {
    features.push(buildLagFeature(normalized, i, lag));
    targets.push(normalized[i]);
  }

  const design = features.map((row) => [1, ...row]);
  const solved = solveMultiOutputRidge(design, targets, ridge);
  const intercept = solved[0] ?? new Array(outputCount).fill(0);
  const coefficients = Array.from({ length: outputCount }, (_, outputIndex) =>
    Array.from({ length: featureCount }, (_, featureIndex) =>
      solved[featureIndex + 1]?.[outputIndex] ?? 0
    )
  );

  const residuals: number[][] = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const predicted = predictNormalizedVector(features[i], intercept, coefficients);
    residuals.push(targets[i].map((value, j) => value - predicted[j]));
  }

  const residualCorrection = averageLastRows(residuals, maLag, outputCount);

  return {
    kind: "varma-experimental",
    keys,
    lag,
    maLag,
    means,
    scales,
    intercept,
    coefficients,
    residualCorrection,
    seasonalLag,
    seasonalBlend,
    lastVectors: normalized.slice(-Math.max(lag, seasonalLag)),
  };
}

export function forecastVarmaNextN(
  data: LoadedData,
  targetKey: string,
  model: VarmaModel,
  horizon = DEFAULT_FORECAST_HORIZON
): ForecastPoint[] {
  const targetIndex = model.keys.indexOf(targetKey);
  if (targetIndex < 0) {
    throw new Error(`VARMA experimental model does not include target: ${targetKey}`);
  }

  const history = model.lastVectors.map((row) => [...row]);
  const points: ForecastPoint[] = [];
  let labelRows = data.rows.map((row) => ({ ...row }));
  const labels = forecastTimeLabels(data.rows, data.datetimeKey, horizon);

  for (let step = 1; step <= horizon; step += 1) {
    const feature = buildLagFeature(history, history.length, model.lag);
    const normalizedPrediction = predictNormalizedVector(
      feature,
      model.intercept,
      model.coefficients
    ).map((value, i) => value + (model.residualCorrection[i] ?? 0));

    const seasonalIndex = history.length - model.seasonalLag;
    const stabilizedPrediction =
      seasonalIndex >= 0
        ? blendVectors(
            normalizedPrediction,
            history[seasonalIndex],
            model.seasonalBlend
          )
        : normalizedPrediction;

    history.push(stabilizedPrediction);
    const originalScalePrediction = denormalizeVector(
      stabilizedPrediction,
      model.means,
      model.scales
    );

    const label = labels[step - 1];
    const nextRow = buildPredictedRow(
      labelRows[labelRows.length - 1] ?? {},
      data,
      model.keys,
      originalScalePrediction,
      label
    );
    labelRows = [...labelRows, nextRow];

    points.push({ label, value: originalScalePrediction[targetIndex] });
  }

  return points;
}

function getNumericKeys(data: LoadedData): string[] {
  return data.headers.filter((key) => {
    if (key === data.datetimeKey) return false;
    return data.rows.some((row) => Number.isFinite(Number(row[key])));
  });
}

function buildNumericVectors(rows: any[], keys: string[]): number[][] {
  const lastSeen = new Array(keys.length).fill(NaN);
  const vectors: number[][] = [];

  for (const row of rows) {
    const vector = keys.map((key, index) => {
      const value = Number(row[key]);
      if (Number.isFinite(value)) {
        lastSeen[index] = value;
        return value;
      }
      return lastSeen[index];
    });

    if (vector.every((value) => Number.isFinite(value))) {
      vectors.push(vector);
    }
  }

  return vectors;
}

function normalizeVectors(vectors: number[][]): {
  normalized: number[][];
  means: number[];
  scales: number[];
} {
  const dimension = vectors[0]?.length ?? 0;
  const means = new Array(dimension).fill(0);
  const scales = new Array(dimension).fill(1);

  for (let j = 0; j < dimension; j += 1) {
    const values = vectors.map((row) => row[j]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      Math.max(1, values.length - 1);
    means[j] = mean;
    scales[j] = Math.sqrt(variance) || 1;
  }

  return {
    means,
    scales,
    normalized: vectors.map((row) =>
      row.map((value, j) => (value - means[j]) / scales[j])
    ),
  };
}

function buildLagFeature(vectors: number[][], endIndex: number, lag: number): number[] {
  const feature: number[] = [];
  for (let offset = 1; offset <= lag; offset += 1) {
    const vector = vectors[endIndex - offset];
    if (!vector) break;
    feature.push(...vector);
  }
  return feature;
}

function solveMultiOutputRidge(
  design: number[][],
  targets: number[][],
  ridge: number
): number[][] {
  const nFeatures = design[0]?.length ?? 0;
  const nOutputs = targets[0]?.length ?? 0;
  const xtx = Array.from({ length: nFeatures }, () =>
    new Array(nFeatures).fill(0)
  );
  const xty = Array.from({ length: nFeatures }, () =>
    new Array(nOutputs).fill(0)
  );

  for (let i = 0; i < design.length; i += 1) {
    const row = design[i];
    const target = targets[i];
    for (let a = 0; a < nFeatures; a += 1) {
      for (let b = 0; b < nFeatures; b += 1) {
        xtx[a][b] += row[a] * row[b];
      }
      for (let out = 0; out < nOutputs; out += 1) {
        xty[a][out] += row[a] * target[out];
      }
    }
  }

  for (let i = 1; i < nFeatures; i += 1) {
    xtx[i][i] += ridge;
  }

  return solveLinearSystem(xtx, xty);
}

function solveLinearSystem(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const m = b[0]?.length ?? 0;
  const matrix = a.map((row, i) => [...row, ...b[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) {
        pivot = row;
      }
    }

    if (pivot !== col) {
      [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    }

    const pivotValue = matrix[col][col];
    if (Math.abs(pivotValue) < 1e-12) {
      matrix[col][col] = pivotValue >= 0 ? 1e-12 : -1e-12;
    }

    const divisor = matrix[col][col];
    for (let j = col; j < n + m; j += 1) {
      matrix[col][j] /= divisor;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = matrix[row][col];
      for (let j = col; j < n + m; j += 1) {
        matrix[row][j] -= factor * matrix[col][j];
      }
    }
  }

  return matrix.map((row) => row.slice(n));
}

function predictNormalizedVector(
  feature: number[],
  intercept: number[],
  coefficients: number[][]
): number[] {
  return intercept.map((base, outputIndex) => {
    let value = base;
    for (let i = 0; i < feature.length; i += 1) {
      value += (coefficients[outputIndex]?.[i] ?? 0) * feature[i];
    }
    return value;
  });
}

function blendVectors(
  prediction: number[],
  anchor: number[],
  anchorWeight: number
): number[] {
  return prediction.map(
    (value, index) => value * (1 - anchorWeight) + (anchor[index] ?? value) * anchorWeight
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function averageLastRows(rows: number[][], count: number, dimension: number): number[] {
  if (count <= 0 || !rows.length) return new Array(dimension).fill(0);
  const selected = rows.slice(-count);
  return Array.from({ length: dimension }, (_, j) =>
    selected.reduce((sum, row) => sum + (row[j] ?? 0), 0) / selected.length
  );
}

function denormalizeVector(
  vector: number[],
  means: number[],
  scales: number[]
): number[] {
  return vector.map((value, i) => value * scales[i] + means[i]);
}

function buildPredictedRow(
  previous: Record<string, any>,
  data: LoadedData,
  keys: string[],
  values: number[],
  label: string
): Record<string, any> {
  const next: Record<string, any> = { ...previous };
  if (data.datetimeKey) next[data.datetimeKey] = label;

  keys.forEach((key, index) => {
    next[key] = values[index];
  });

  return next;
}
