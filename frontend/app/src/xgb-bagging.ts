import { buildFeatures } from "./api";
import { trainXGBoostFeatures, type LoadedData } from "./core";

/** Two independently bootstrapped XGBoost regressors with equal-weight predictions. */
export type BaggedXGBoostModel = {
  predict(rows: number[][]): number[];
  dispose(): void;
};

type Predictor = {
  predict(rows: number[][]): ArrayLike<number> | number;
  dispose?: () => unknown;
};

/** Fixed seeds keep the two bootstrap samples reproducible across browser runs. */
function bootstrapIndices(length: number, seed: number): number[] {
  let state = seed >>> 0;
  const indices: number[] = [];
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    indices.push(Math.floor((state / 0x100000000) * length));
  }
  return indices;
}

export async function trainXGBoostBaggedFeatures(
  X: number[][],
  y: number[],
): Promise<BaggedXGBoostModel> {
  if (X.length < 2 || X.length !== y.length) {
    throw new Error("Bagged XGBoost requires aligned supervised samples");
  }

  const models: Predictor[] = [];
  try {
    for (const seed of [0x243f6a88, 0x9e3779b9]) {
      const indices = bootstrapIndices(X.length, seed);
      const sampleX = indices.map(index => X[index]);
      const sampleY = indices.map(index => y[index]);
      models.push(await trainXGBoostFeatures(sampleX, sampleY));
    }
  } catch (error) {
    for (const model of models) model.dispose?.();
    throw error;
  }

  return {
    predict(rows) {
      const predictions = models.map(model => model.predict(rows));
      return rows.map((_, index) => {
        const first = predictions[0];
        const second = predictions[1];
        const a = typeof first === "number" ? first : first[index];
        const b = typeof second === "number" ? second : second[index];
        const average = (Number(a) + Number(b)) / 2;
        if (!Number.isFinite(average)) {
          throw new Error(`Invalid bagged XGBoost prediction at row ${index + 1}`);
        }
        return average;
      });
    },
    dispose() {
      for (const model of models) model.dispose?.();
    },
  };
}

export async function trainXGBoostBaggedModel(
  data: LoadedData,
  targetKey: string,
): Promise<BaggedXGBoostModel> {
  const { X, y } = buildFeatures(data.rows, data.datetimeKey ?? "", targetKey);
  return trainXGBoostBaggedFeatures(X, y);
}
