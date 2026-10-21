import { buildDirectFeatures, buildDirectLogReturnFeatures } from "./api";
import { trainXGBoostFeatures, type ForecastPoint, type LoadedData } from "./core";
import { trainXGBoostBaggedFeatures } from "./xgb-bagging";
import { trainLightGBMFeatures } from "./lightgbm";
import { trainLightGBMBaggedFeatures } from "./lightgbm-bagging";
import { fitRidgeFeatures } from "./ridge";
import { forecastTimeLabels } from "./forecast-time";
import { DEFAULT_FORECAST_HORIZON } from "./forecast-config";

/** Orthogonal concepts: output series count != forecast horizon strategy. */
export type ForecastStrategy = "recursive" | "direct" | "joint";
export type SupervisedModelKind = "xgboost" | "xgboost_bag2" | "lightgbm" | "lightgbm_bag2" | "ridge";
export type DirectTargetMode = "price" | "log_return";
export type ForecastOptions = {
  horizon: number;
  strategy: ForecastStrategy;
};

export const DEFAULT_FORECAST_OPTIONS: ForecastOptions = {
  horizon: DEFAULT_FORECAST_HORIZON,
  strategy: "direct",
};

/** Direct multi-horizon: one independent fitted model for each lead time. */
export type DirectForecastModel = {
  strategy: "direct";
  kind: SupervisedModelKind;
  targetKey: string;
  targetMode: DirectTargetMode;
  horizon: number;
  models: Array<{ predict: (X: number[][]) => ArrayLike<number>; dispose?: () => unknown }>;
  dispose(): void;
};

export function assertForecastStrategy(kind: string, strategy: ForecastStrategy): void {
  if (kind === "varma" && strategy === "joint") return;
  if ((kind === "chronos" || kind === "timesfm") && strategy === "direct") return;
  if (["xgboost", "xgboost_bag2", "lightgbm", "lightgbm_bag2", "ridge"].includes(kind) &&
      (strategy === "recursive" || strategy === "direct")) return;
  throw new Error(`${kind} does not support ${strategy} forecasting`);
}

export async function trainDirectForecast(
  data: LoadedData,
  targetKey: string,
  kind: SupervisedModelKind,
  horizon = DEFAULT_FORECAST_HORIZON,
  onProgress?: (step: number, total: number) => void,
  targetMode: DirectTargetMode = "price",
): Promise<DirectForecastModel> {
  assertForecastStrategy(kind, "direct");
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 64) {
    throw new Error("Direct horizon must be 1–64 steps");
  }
  if (targetMode !== "price" && targetMode !== "log_return") {
    throw new Error(`Unsupported direct target representation: ${targetMode}`);
  }
  const models: DirectForecastModel["models"] = [];
  try {
    for (let step = 1; step <= horizon; step += 1) {
      const { X, y } = targetMode === "log_return"
        ? buildDirectLogReturnFeatures(data.rows, data.datetimeKey ?? "", targetKey, step)
        : buildDirectFeatures(data.rows, data.datetimeKey ?? "", targetKey, step);
      const fitted = kind === "ridge"
        ? fitRidgeFeatures(X, y)
        : kind === "xgboost"
          ? await trainXGBoostFeatures(X, y)
          : kind === "xgboost_bag2"
            ? await trainXGBoostBaggedFeatures(X, y)
            : kind === "lightgbm_bag2"
              ? await trainLightGBMBaggedFeatures(X, y)
              : await trainLightGBMFeatures(X, y);
      models.push(fitted);
      onProgress?.(step, horizon);
    }
  } catch (err) {
    for (const model of models) model.dispose?.();
    throw err;
  }
  return {
    strategy: "direct", kind, targetKey, targetMode, horizon, models,
    dispose() { for (const model of models) model.dispose?.(); },
  };
}

export function forecastDirectNextN(
  data: LoadedData,
  targetKey: string,
  trained: DirectForecastModel,
  horizon = trained.horizon,
): ForecastPoint[] {
  if (targetKey !== trained.targetKey || !Number.isSafeInteger(horizon) ||
      horizon < 1 || horizon > trained.horizon || trained.models.length < horizon) {
    throw new Error("Direct model target/horizon mismatch; retrain first");
  }
  const feature = buildDirectFeatures(
    data.rows, data.datetimeKey ?? "", targetKey, 1
  ).lastFeatureRow;
  const labels = forecastTimeLabels(data.rows, data.datetimeKey, horizon);
  const originPrice = Number(data.rows.at(-1)?.[targetKey]);
  if (trained.targetMode === "log_return" &&
      (!Number.isFinite(originPrice) || originPrice <= 0)) {
    throw new Error("Direct log-return forecast requires a positive last price");
  }
  return trained.models.slice(0, horizon).map((model, index) => {
    const output = model.predict([feature]);
    const prediction = Number(typeof output === "number" ? output : output[0]);
    const value = trained.targetMode === "log_return"
      ? originPrice * Math.exp(prediction)
      : prediction;
    if (!Number.isFinite(value) || (trained.targetMode === "log_return" && value <= 0)) {
      throw new Error(`Invalid direct prediction at step ${index + 1}`);
    }
    return { label: labels[index], value };
  });
}
