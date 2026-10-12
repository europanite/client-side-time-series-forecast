import { parseCSV, parseXLSX, buildFeatures } from "./api";
import { initXGBoostCtor } from "./xgb";
import { DEFAULT_FORECAST_HORIZON } from "./forecast-config";
import { forecastTimeLabels } from "./forecast-time";

export type LoadedData = {
  rows: any[];
  headers: string[];
  datetimeKey: string | null;
};

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function loadFromCSV(text: string): Promise<LoadedData> {
  const { rows, headers } = parseCSV(text);
  const datetimeKey =
    headers.find((h) =>
      h.toLowerCase().includes("date") || h.toLowerCase().includes("time")
    ) || null;
  return { rows, headers, datetimeKey };
}

export async function loadFromXLSX(buf: ArrayBuffer): Promise<LoadedData> {
  const { rows, headers } = await parseXLSX(buf); // ensure `await` is present
  const datetimeKey =
    headers.find((h) =>
      h.toLowerCase().includes("date") || h.toLowerCase().includes("time")
    ) || null;
  return { rows, headers, datetimeKey };
}

export async function trainModel(
  data: LoadedData,
  targetKey: string
): Promise<any> {
  const { X, y } = buildFeatures(
    data.rows,
    data.datetimeKey!,
    targetKey
  );
  return trainXGBoostFeatures(X, y);
}

/** Fit the same browser XGBoost implementation on supplied aligned pairs. */
export async function trainXGBoostFeatures(
  X: number[][],
  y: number[]
): Promise<any> {
  if (X.length < 2 || X.length !== y.length) {
    throw new Error("XGBoost requires aligned supervised samples");
  }
  const XGBoost = await initXGBoostCtor();
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
  booster.train(X, y);
  return booster;
}

export function predictNext(
  data: LoadedData,
  targetKey: string,
  model: any
): number {
  const { lastFeatureRow } = buildFeatures(
    data.rows,
    data.datetimeKey!,
    targetKey
  );
  const pred = model.predict([lastFeatureRow]);
  const first =
    pred != null &&
    typeof pred !== "number" &&
    typeof pred.length === "number"
      ? pred[0]
      : pred;
  return Number(first);
}

export type ForecastPoint = {
  label: string;
  value: number;
};

export function forecastNextN(
  data: LoadedData,
  targetKey: string,
  model: any,
  horizon = DEFAULT_FORECAST_HORIZON
): ForecastPoint[] {
  const rows = data.rows.map((row) => ({ ...row }));
  const period = inferSeasonalPeriod(rows, data.datetimeKey);
  const points: ForecastPoint[] = [];
  const labels = forecastTimeLabels(data.rows, data.datetimeKey, horizon);

  for (let step = 1; step <= horizon; step += 1) {
    const rawPrediction = predictNext({ ...data, rows }, targetKey, model);
    if (!Number.isFinite(rawPrediction)) {
      throw new Error(`Non-finite forecast from model for ${targetKey}`);
    }
    const value = rawPrediction;
    const label = labels[step - 1];
    const nextRow = buildNextRow(rows, data, targetKey, value, label, period);

    rows.push(nextRow);
    points.push({ label, value });
  }

  return points;
}

function buildNextRow(
  rows: any[],
  data: LoadedData,
  targetKey: string,
  targetValue: number,
  label: string,
  period: number
): Record<string, any> {
  const previous = rows[rows.length - 1] ?? {};
  const next: Record<string, any> = { ...previous };

  if (data.datetimeKey) {
    next[data.datetimeKey] = label;
  }

  for (const key of data.headers) {
    if (key === data.datetimeKey) continue;

    const previousValue = Number(previous[key]);
    if (!Number.isFinite(previousValue)) continue;

    next[key] =
      key === targetKey
        ? targetValue
        : seasonalContinuation(rows, key, period);
  }

  return next;
}

function seasonalContinuation(rows: any[], key: string, period: number): number {
  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return NaN;

  if (values.length <= period) {
    return values[values.length - 1];
  }

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

function mean(values: number[]): number {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (!finiteValues.length) return NaN;

  return (
    finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
  );
}

function inferSeasonalPeriod(rows: any[], datetimeKey: string | null): number {
  if (!datetimeKey || rows.length < 3) return 7;

  const dates = rows
    .map((row) => parseDateLike(row[datetimeKey]))
    .filter((date): date is Date => !!date);

  if (dates.length < 3) return 7;

  const diffs = [];
  for (let i = 1; i < dates.length; i += 1) {
    const days =
      (dates[i].getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000);
    if (Number.isFinite(days) && days > 0) diffs.push(days);
  }

  if (!diffs.length) return 7;

  const medianDays = diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)];
  if (medianDays >= 0.5 && medianDays <= 1.5) return 7;
  if (medianDays >= 25 && medianDays <= 35) return 12;

  return Math.min(12, Math.max(2, Math.round(7 / medianDays)) || 7);
}
