import { buildFeatures } from "./api";
import type { LoadedData } from "./core";

/**
 * Local, deterministic Ridge regression for comparison with the browser's
 * tree models. Uses exactly the same engineered supervised features as
 * trainModel() and trainLightGBMModel(), and returns the same predict() API.
 *
 * Minimize mean squared error + lambda * sum(weight^2). The intercept is
 * unpenalized. Feature scaling is fitted on training rows only.
 */
export type RidgeModel = {
  predict(rows: number[][]): number[];
};

const RIDGE_LAMBDA = 0.3;
const MIN_SCALE = 1e-8;

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
  const n = values.length;
  const a = matrix.map((row, i) => [...row, values[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12)
      throw new Error("Ridge: singular normal equations");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let k = col; k <= n; k += 1) a[col][k] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let k = col; k <= n; k += 1) a[row][k] -= factor * a[col][k];
    }
  }
  return a.map(row => row[n]);
}

export function fitRidgeFeatures(
  features: number[][],
  targets: number[],
  lambda = RIDGE_LAMBDA
): RidgeModel {
  const n = features.length;
  const dimension = features[0]?.length ?? 0;
  if (!n || !dimension || targets.length !== n ||
      features.some(row => row.length !== dimension) ||
      !Number.isFinite(lambda) || lambda <= 0 ||
      !features.every(row => row.every(Number.isFinite)) ||
      !targets.every(Number.isFinite)) {
    throw new Error("Ridge: expected finite, rectangular training data and positive lambda");
  }

  const means = Array(dimension).fill(0) as number[];
  for (const row of features)
    for (let j = 0; j < dimension; j += 1) means[j] += row[j] / n;
  const scales = Array(dimension).fill(0) as number[];
  for (const row of features)
    for (let j = 0; j < dimension; j += 1)
      scales[j] += ((row[j] - means[j]) ** 2) / n;
  for (let j = 0; j < dimension; j += 1)
    scales[j] = Math.max(Math.sqrt(scales[j]), MIN_SCALE);

  const targetMean = targets.reduce((sum, value) => sum + value, 0) / n;
  const gram = Array.from({ length: dimension }, () => Array(dimension).fill(0) as number[]);
  const rhs = Array(dimension).fill(0) as number[];
  for (let i = 0; i < n; i += 1) {
    const normalized = features[i].map((v, j) => (v - means[j]) / scales[j]);
    const centeredTarget = targets[i] - targetMean;
    for (let j = 0; j < dimension; j += 1) {
      rhs[j] += normalized[j] * centeredTarget;
      for (let k = 0; k < dimension; k += 1)
        gram[j][k] += normalized[j] * normalized[k];
    }
  }
  // n * lambda produces the objective mean((Xw-y)^2) + lambda*||w||^2.
  for (let j = 0; j < dimension; j += 1) gram[j][j] += n * lambda;
  const weights = solveLinearSystem(gram, rhs);

  return {
    predict(rows: number[][]): number[] {
      return rows.map(row => {
        if (row.length !== dimension || !row.every(Number.isFinite))
          throw new Error("Ridge: unexpected feature width or non-finite input");
        return row.reduce(
          (value, v, j) => value + weights[j] * (v - means[j]) / scales[j],
          targetMean
        );
      });
    },
  };
}

export function trainRidgeModel(data: LoadedData, targetKey: string): RidgeModel {
  const { X, y } = buildFeatures(data.rows, data.datetimeKey!, targetKey);
  return fitRidgeFeatures(X, y);
}
