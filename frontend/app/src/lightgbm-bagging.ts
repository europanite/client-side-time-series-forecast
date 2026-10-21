import { buildFeatures } from "./api";
import { trainLightGBMFeatures, type LightGBMModel } from "./lightgbm";
import type { LoadedData } from "./core";

/** Two independently bootstrapped LightGBM regressors, averaged equally. */
export type BaggedLightGBMModel = {
  predict(rows: number[][]): number[];
  dispose(): void;
};

/** Deterministic bootstrap sampling keeps browser benchmarks reproducible. */
function bootstrapIndices(length: number, seed: number): number[] {
  let state = seed >>> 0;
  const indices: number[] = [];
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    indices.push(Math.floor((state / 0x100000000) * length));
  }
  return indices;
}

export async function trainLightGBMBaggedFeatures(
  X: number[][],
  y: number[],
): Promise<BaggedLightGBMModel> {
  if (X.length < 2 || X.length !== y.length) {
    throw new Error("Bagged LightGBM requires aligned supervised samples");
  }

  const models: LightGBMModel[] = [];
  try {
    // The same two bootstrap seeds as XGBoost Bagging ×2 enable fair comparisons.
    for (const seed of [0x243f6a88, 0x9e3779b9]) {
      const indices = bootstrapIndices(X.length, seed);
      const sampleX = indices.map(index => X[index]);
      const sampleY = indices.map(index => y[index]);
      models.push(await trainLightGBMFeatures(sampleX, sampleY));
    }
  } catch (error) {
    for (const model of models) model.dispose();
    throw error;
  }

  return {
    predict(rows) {
      const first = models[0].predict(rows);
      const second = models[1].predict(rows);
      return rows.map((_, index) => {
        const average = (Number(first[index]) + Number(second[index])) / 2;
        if (!Number.isFinite(average)) {
          throw new Error(`Invalid bagged LightGBM prediction at row ${index + 1}`);
        }
        return average;
      });
    },
    dispose() {
      for (const model of models) model.dispose();
    },
  };
}

export async function trainLightGBMBaggedModel(
  data: LoadedData,
  targetKey: string,
): Promise<BaggedLightGBMModel> {
  const { X, y } = buildFeatures(data.rows, data.datetimeKey ?? "", targetKey);
  return trainLightGBMBaggedFeatures(X, y);
}
