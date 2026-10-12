import type * as XLSXType from "xlsx";

/**
 * Parse a CSV string to rows of objects.
 * If you later want PapaParse, you can plug it in via window.__parseCSV.
 */
export function parseCSV(csvText: string): { rows: any[]; headers: string[] } {
  // @ts-ignore optional hook
  if (typeof window !== "undefined" && window.__parseCSV) {
    // @ts-ignore
    return window.__parseCSV(csvText);
  }
  return simpleCSV(csvText);
}

/** Minimal CSV parser (no quotes/escapes magic, just enough for this demo). */
function simpleCSV(text: string): { rows: any[]; headers: string[] } {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], headers: [] };

  const lines = trimmed.split(/\r?\n/);
  const headers = (lines[0] ?? "")
    .split(",")
    .map((h) => h.trim());

  const rows = lines
    .slice(1)
    .filter((line) => line.length > 0)
    .map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i];
      });
      return obj;
    });

  return { rows, headers };
}

/**
 * Feature builder (rich version):
 * - uses all non-datetime, non-target columns as exogenous numeric series
 * - adds lags, differences, rolling means
 * - adds target-series history (lags, diff, rolling mean)
 * - adds cross-series interactions (spread / ratio / product)
 * - adds time index + Fourier encodings
 *
 * Returns supervised rows aligned to next-step prediction; the first 7
 * observations are warm-up history, not supervised training samples.
 * Future features and training features use the exact same origin policy.
 */
export function buildFeatures(
  rows: any[],
  datetimeKey: string,
  targetKey: string
): { X: number[][]; y: number[]; lastFeatureRow: number[] } {
  const MAX_LAG = 3;
  const ROLLING_WINDOW = 7;
  // A supervised row at time t predicts target[t] using observations <= t-1.
  const WARMUP = Math.max(MAX_LAG, ROLLING_WINDOW);
  const EPS = 1e-9;

  if (!rows.length) {
    return { X: [], y: [], lastFeatureRow: [] };
  }

  const headers = Object.keys(rows[0] ?? {});

  // Exogenous series = all non-datetime, non-target columns
  const featureKeys = headers.filter(
    (h) => h !== datetimeKey && h !== targetKey
  );

  const toNum = (v: any): number =>
    v === "" || v == null || (typeof v === "number" && Number.isNaN(v))
      ? NaN
      : Number(v);

  // Numeric series map (exogenous + target)
  const seriesKeys: string[] = [...featureKeys];
  if (targetKey && headers.includes(targetKey)) {
    seriesKeys.push(targetKey);
  }

  const seriesMap: Record<string, number[]> = {};
  for (const key of seriesKeys) {
    seriesMap[key] = rows.map((r) => toNum(r[key]));
  }

  const n = rows.length;

  const getValue = (key: string, t: number): number => {
    const arr = seriesMap[key];
    if (!arr || !arr.length) return NaN;
    // Never substitute the first observation for unavailable history.
    if (t < 0) return NaN;
    return arr[Math.min(t, arr.length - 1)];
  };

  const rollingMean = (key: string, t: number): number => {
    const arr = seriesMap[key];
    if (!arr || !arr.length) return NaN;

    const end = t >= arr.length ? arr.length - 1 : t;
    const start = Math.max(0, end - (ROLLING_WINDOW - 1));

    let sum = 0;
    let count = 0;
    for (let i = start; i <= end; i += 1) {
      const v = arr[i];
      if (Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    if (count === 0) return NaN;
    return sum / count;
  };

  // Cross features may include the target only at the latest KNOWN timestamp.
  const allKeysForCross: string[] = [...seriesKeys];

  const buildRowFeatures = (t: number): number[] => {
    const feats: number[] = [];

    // At forecast origin t, all features come from t-1 or earlier.
    // This is identical for historical training rows and an unseen next row.
    const baseIndex = t - 1;

    // --- 1) exogenous values known before t ---
    for (const key of featureKeys) {
      const cur = getValue(key, baseIndex);
      feats.push(cur);
    }

    // --- 2) Lag diff rolling mean ---
    for (const key of featureKeys) {
      const cur = getValue(key, baseIndex);

      // Lags up to MAX_LAG
      for (let lag = 1; lag <= MAX_LAG; lag += 1) {
        feats.push(getValue(key, baseIndex - lag));
      }

      // First difference vs previous step
      const prev = getValue(key, baseIndex - 1);
      feats.push(cur - prev);

      // Rolling mean (window = ROLLING_WINDOW)
      feats.push(rollingMean(key, baseIndex));
    }

    // --- 3) Target's own history. This is essential for UNIVARIATE data:
    // previously a lone target got only time-index/Fourier features.
    const targetLast = getValue(targetKey, baseIndex);
    feats.push(targetLast);
    for (let lag = 1; lag <= MAX_LAG; lag += 1) {
      feats.push(getValue(targetKey, baseIndex - lag));
    }
    feats.push(targetLast - getValue(targetKey, baseIndex - 1));
    feats.push(rollingMean(targetKey, baseIndex));

    // 4) Cross-series interactions using ONLY the last known observation
    for (let i = 0; i < allKeysForCross.length; i += 1) {
      const ki = allKeysForCross[i];
      const vi = getValue(ki, baseIndex);

      for (let j = i + 1; j < allKeysForCross.length; j += 1) {
        const kj = allKeysForCross[j];
        const vj = getValue(kj, baseIndex);

        // Spread
        feats.push(vi - vj);

        // Ratio (with small epsilon to avoid 0-div)
        const denom =
          Math.abs(vj) < EPS ? (vj >= 0 ? EPS : -EPS) : vj;
        feats.push(vi / denom);

        // Product
        feats.push(vi * vj);
      }
    }

    // 5) Time encodings (index + Fourier)
    const timeIndex = t;
    feats.push(timeIndex);
    feats.push(Math.sin((2 * Math.PI * timeIndex) / 24));
    feats.push(Math.cos((2 * Math.PI * timeIndex) / 24));
    feats.push(Math.sin((2 * Math.PI * timeIndex) / 168));
    feats.push(Math.cos((2 * Math.PI * timeIndex) / 168));

    return feats;
  };

  const X: number[][] = [];
  const y: number[] = [];

  // Skip warm-up rows rather than leaking row 0 as fabricated early history.
  for (let t = WARMUP; t < n; t += 1) {
    X.push(buildRowFeatures(t));

    const series = seriesMap[targetKey];
    const targetVal =
      series && series.length > t
        ? series[t]
        : toNum(rows[t]?.[targetKey]);
    y.push(targetVal);
  }

  // +1 step feature row (future step)
  const lastFeatureRow = n > WARMUP ? buildRowFeatures(n) : [];

  return { X, y, lastFeatureRow };
}

/**
 * Direct h-step supervised pairs without exposure to unseen observations.
 * The feature at origin t uses rows <= t-1, and label is target[t+h-1].
 * Forecasting at the final origin n always uses buildFeatures(...).lastFeatureRow.
 */
export function buildDirectFeatures(
  rows: any[],
  datetimeKey: string,
  targetKey: string,
  horizon: number
): { X: number[][]; y: number[]; lastFeatureRow: number[] } {
  if (!Number.isSafeInteger(horizon) || horizon < 1) {
    throw new Error("Direct horizon must be a positive integer");
  }
  const { X, y, lastFeatureRow } = buildFeatures(rows, datetimeKey, targetKey);
  const count = y.length - horizon + 1;
  if (count < 2 || lastFeatureRow.length === 0) {
    throw new Error(`Insufficient observations for direct horizon ${horizon}`);
  }
  return { X: X.slice(0, count), y: y.slice(horizon - 1), lastFeatureRow };
}

/**
 * For direct forecasting, the origin for each label is the last observed
 * target (t-1). Learn cumulative log return log(y[t+h-1]/y[t-1]), not a
 * one-day return falsely reused at every horizon. No future data enter X.
 * Strictly positive target observations are required; reject invalid data.
 */
export function buildDirectLogReturnFeatures(
  rows: any[], datetimeKey: string, targetKey: string, horizon: number
): { X: number[][]; y: number[]; lastFeatureRow: number[] } {
  const direct = buildDirectFeatures(rows, datetimeKey, targetKey, horizon);
  const firstOriginIndex = rows.length - direct.X.length - horizon;
  const returns = direct.y.map((futureValue, index) => {
    const origin = Number(rows[firstOriginIndex + index]?.[targetKey]);
    if (!Number.isFinite(origin) || origin <= 0 ||
        !Number.isFinite(futureValue) || futureValue <= 0) {
      throw new Error("Direct log-return training requires strictly positive target prices");
    }
    return Math.log(futureValue / origin);
  });
  const latestPrice = Number(rows.at(-1)?.[targetKey]);
  if (!Number.isFinite(latestPrice) || latestPrice <= 0) {
    throw new Error("Direct log-return forecast requires a positive last price");
  }
  return {...direct, y: returns};
}

/**
 * Parse XLSX ArrayBuffer into rows and headers using npm `xlsx`.
 */
export async function parseXLSX(
  buf: ArrayBuffer
): Promise<{ rows: any[]; headers: string[] }> {
  const XLSX = (await import("xlsx")) as typeof XLSXType;

  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: true });
  const headers = rows.length ? Object.keys(rows[0]) : [];

  return { rows, headers };
}
