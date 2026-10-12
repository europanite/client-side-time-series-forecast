import { buildFeatures } from "./api";
import type { LoadedData } from "./core";

export type LightGBMModel = {
  fit(X: number[][], y: number[]): unknown | Promise<unknown>;
  predict(X: number[][]): ArrayLike<number>;
  dispose(): void;
};

type LightGBMFactory = {
  create(params?: Record<string, unknown>): Promise<LightGBMModel>;
};

function resolveFactory(mod: any): LightGBMFactory | null {
  const candidates = [mod?.LGBModel, mod?.default?.LGBModel, mod?.default];

  for (const candidate of candidates) {
    if (candidate && typeof candidate.create === "function") {
      return candidate as LightGBMFactory;
    }
  }

  return null;
}

export async function trainLightGBMModel(
  data: LoadedData,
  targetKey: string
): Promise<LightGBMModel> {
  const { X, y } = buildFeatures(
    data.rows,
    data.datetimeKey!,
    targetKey
  );

  return trainLightGBMFeatures(X, y);
}

/** Fit the exact same in-browser LightGBM on horizon-aligned pairs. */
export async function trainLightGBMFeatures(
  X: number[][],
  y: number[]
): Promise<LightGBMModel> {
  if (X.length < 2 || X.length !== y.length) {
    throw new Error("LightGBM requires aligned supervised samples");
  }
  const mod: any = await import("@wlearn/lightgbm");
  const LGBModel = resolveFactory(mod);

  if (!LGBModel) {
    throw new Error(
      "@wlearn/lightgbm did not expose LGBModel.create()."
    );
  }

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
