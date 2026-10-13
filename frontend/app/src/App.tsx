import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native-web";
import type { ForecastPoint, LoadedData } from "./core";
import {
  loadFromCSV,
  loadFromXLSX,
  trainModel,
  forecastNextN,
} from "./core";
import { forecastVarmaNextN, trainVarmaModel } from "./varma";
import { trainLightGBMModel } from "./lightgbm";
import { trainRidgeModel } from "./ridge";
import { trainDirectForecast, forecastDirectNextN,
  type ForecastStrategy, type SupervisedModelKind, type DirectTargetMode } from "./forecast-strategies";
import { forecastChronosNext16 } from "./chronos";
import { forecastTimesFMNext16, hasTimesFMModelSource, releaseTimesFM } from "./timesfm";
import { DEFAULT_FORECAST_HORIZON } from "./forecast-config";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
);


type LineDataset = ChartData<"line">["datasets"][number];
type ModelKind = "xgboost" | "lightgbm" | "varma" | "chronos" | "timesfm" | "ridge";


export default function App() {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState<LoadedData | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [modelKind, setModelKind] = useState<ModelKind>("xgboost");
  const [timesFMFile, setTimesFMFile] = useState<File | null>(null);
  const [predicting, setPredicting] = useState(false);
  // Default to direct 16-step forecasting; recursive is an advanced setting.
  const [strategy, setStrategy] = useState<"recursive" | "direct">("direct");
  // Generic series may be zero or negative, so price level stays the default.
  const [directTargetMode, setDirectTargetMode] = useState<DirectTargetMode>("price");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const effectiveStrategy: ForecastStrategy =
    modelKind === "varma" ? "joint" : (modelKind === "chronos" || modelKind === "timesfm") ? "direct" : strategy;
  const [model, setModel] = useState<any>(null);
  const [forecast, setForecast] = useState<string>("");
  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([]);

  useEffect(() => () => { void releaseTimesFM(); }, []);

  useEffect(() => {
    return () => {
      if (model && typeof model.dispose === "function") {
        model.dispose();
      }
    };
  }, [model]);

  useEffect(() => {
    let cancelled = false;

    async function loadSampleData(): Promise<void> {
      setStatus("loading sample data ...");

      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}sample_data.csv`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`failed to load sample_data.csv (${response.status})`);
        }

        const text = await response.text();
        const loaded = await loadFromCSV(text);

        if (cancelled) return;

        setData(loaded);
        setTarget(guessTarget(loaded));
        setModel(null);
        setForecast("");
        setForecastPoints([]);
        setStatus("sample data loaded");
      } catch (err: any) {
        if (cancelled) return;
        setStatus(`error: ${err.message || String(err)}`);
      }
    }

    void loadSampleData();

    return () => {
      cancelled = true;
    };
  }, []);


  // Load sample data at startup (so the app starts with data already loaded)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus("loading sample data ...");
      try {
        // Vite base is "/client_side_time_series_forecast/" on GitHub Pages
        const url = `${import.meta.env.BASE_URL}sample_data.csv`;
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) {
          throw new Error(`failed to fetch sample_data.csv (${resp.status})`);
        }

        const text = await resp.text();
        const loaded = await loadFromCSV(text);

        if (cancelled) return;
        setData(loaded);
        setTarget(guessTarget(loaded));
        setModel(null);
        setForecast("");
        setStatus("data loaded");
      } catch (err: any) {
        if (cancelled) return;
        setStatus(`error: ${err.message || String(err)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(`reading ${file.name} ...`);

    const ext = file.name.toLowerCase().split(".").pop();
    try {
      if (ext === "csv") {
        const text = await file.text();
        const loaded = await loadFromCSV(text);
        setData(loaded);
        setTarget(guessTarget(loaded));
        setStatus("data loaded");
      } else if (ext === "xlsx") {
        const buf = await file.arrayBuffer();
        const loaded = await loadFromXLSX(buf);
        setData(loaded);
        setTarget(guessTarget(loaded));
        setStatus("data loaded");
      } else {
        throw new Error("Unsupported file type (use .csv or .xlsx)");
      }

      setModel(null);
      setForecast("");
      setForecastPoints([]);
    } catch (err: any) {
      setStatus(`error: ${err.message || String(err)}`);
    }
  }

  function guessTarget(loaded: LoadedData): string | null {
    return loaded.headers.find((h) => h !== loaded.datetimeKey) ?? null;
  }

  async function handleTrain(): Promise<void> {
    if (!data || !target) return;

    if (modelKind === "chronos" || modelKind === "timesfm") {
      setStatus(`${modelKind} is pretrained; training is not required`);
      return;
    }

    setStatus("training ...");
    try {
      const trainedModel =
        (modelKind === "xgboost" || modelKind === "lightgbm" || modelKind === "ridge") &&
        effectiveStrategy === "direct"
          ? await trainDirectForecast(data, target, modelKind as SupervisedModelKind,
              DEFAULT_FORECAST_HORIZON, (done, total) => setStatus(`training direct ${done}/${total} ...`),
              directTargetMode)
        : modelKind === "varma"
          ? trainVarmaModel(data)
          : modelKind === "lightgbm"
            ? await trainLightGBMModel(data, target)
            : modelKind === "ridge"
              ? trainRidgeModel(data, target)
              : await trainModel(data, target);
      setModel(trainedModel);
      setForecast("");
      setForecastPoints([]);
      setStatus(`${modelKind} (${effectiveStrategy}) trained`);
    } catch (err: any) {
      setStatus(`error: ${err.message || String(err)}`);
    }
  }

  async function handlePredict(): Promise<void> {
    if (!data || !target) return;
    if (modelKind !== "chronos" && modelKind !== "timesfm" && !model) return;
    if (predicting) return;

    if (modelKind === "timesfm") {
      setPredicting(true);
      setStatus("loading TimesFM 2.5 ...");
      try {
        const result = await forecastTimesFMNext16(data, target, timesFMFile,
          message => setStatus(message));
        setForecastPoints(result.points);
        setForecast([
          `Model="timesfm" Target="${target}" → next ${DEFAULT_FORECAST_HORIZON} pretrained forecasts:`,
          ...result.points.map((point, index) =>
            `${point.label}: ${point.value.toFixed(4)} (p10=${result.lower[index].toFixed(4)}, p90=${result.upper[index].toFixed(4)})`),
        ].join("\n"));
        setStatus(`predicted ${DEFAULT_FORECAST_HORIZON} steps with TimesFM 2.5`);
      } catch (err: any) {
        setStatus(`error: ${err.message || String(err)}`);
      } finally { setPredicting(false); }
      return;
    }

    if (modelKind === "chronos") {
      setStatus("loading Chronos-2 ...");

      try {
        const result = await forecastChronosNext16(
          data,
          target,
          (message) => setStatus(message)
        );
        setForecastPoints(result.points);
        setForecast(
          [
            `Model="chronos" Target="${target}" → next ${DEFAULT_FORECAST_HORIZON} pretrained forecasts:`,
            ...result.points.map((point, index) =>
              [
                `${point.label}: ${point.value.toFixed(4)}`,
                `(p10=${result.lower[index].toFixed(4)},`,
                `p90=${result.upper[index].toFixed(4)})`,
              ].join(" ")
            ),
          ].join("\n")
        );
        setStatus(`predicted ${DEFAULT_FORECAST_HORIZON} steps with Chronos-2`);
      } catch (err: any) {
        setStatus(`error: ${err.message || String(err)}`);
      }
      return;
    }

    setStatus(`predicting ${DEFAULT_FORECAST_HORIZON} steps ...`);

    try {
      const points =
        modelKind === "varma"
          ? forecastVarmaNextN(data, target, model, DEFAULT_FORECAST_HORIZON)
          : effectiveStrategy === "direct"
            ? forecastDirectNextN(data, target, model, DEFAULT_FORECAST_HORIZON)
            : forecastNextN(data, target, model, DEFAULT_FORECAST_HORIZON);
      setForecastPoints(points);

      setForecast(
        [
          `Model="${modelKind}" Strategy="${effectiveStrategy}" Target="${target}" → next ${DEFAULT_FORECAST_HORIZON} forecasts:`,
          ...points.map(
            (point) => `${point.label}: ${point.value.toFixed(4)}`
          ),
        ].join("\n")
      );
      setStatus(`predicted ${DEFAULT_FORECAST_HORIZON} steps`);
    } catch (err: any) {
      setStatus(`error: ${err.message || String(err)}`);
    }
  }

  const chart = buildChartData(data, target, forecastPoints);
  const REPO_URL =
    "https://github.com/europanite/client_side_time_series_forecast";
  const isPretrained = modelKind === "chronos" || modelKind === "timesfm";
  const canTrain = !!data && !!target && !isPretrained && !predicting;
  const canForecast = !!data && !!target && !predicting &&
    (modelKind === "chronos" ||
      (modelKind === "timesfm" && hasTimesFMModelSource(timesFMFile)) ||
      !!model);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000000ff",
        padding: 24,
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={() =>
          window.open(REPO_URL, "_blank", "noopener,noreferrer")
        }
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            marginBottom: 12,
            color: "#ffffffff",
            textDecorationLine: "underline",
          }}
        >
          Client-Side Time-Series Forecast
        </Text>
        <Text style={{ color: "#ffffffff", marginBottom: 16 }}>
          A browser-based multivariate time series forecasting tool. No installation, No registration, or No payment is required.
        </Text>
      </Pressable>

      {/* File input */}
      <View
        style={{
          width: "100%",
          maxWidth: 960,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #5a5a5a",
            background: "#111827",
            color: "#e5e7eb",
            flex: 1,
          }}
        />
        <Text style={{ marginLeft: 12, color: "#9ca3af" }}>
          Status: {status}
        </Text>
      </View>

      {/* Controls */}
      <View
        style={{
          width: "100%",
          maxWidth: 960,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#9ca3af" }}>Target:</Text>
        <select
          value={target ?? ""}
          onChange={(e) => {
            setTarget(e.target.value || null);
            setModel(null);
            setForecast("");
            setForecastPoints([]);
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #4b5563",
            background: "#111827",
            color: "#e5e7eb",
            minWidth: 120,
          }}
        >
          <option value="">(select)</option>
          {data?.headers
            .filter((h) => h !== data.datetimeKey)
            .map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
        </select>

        <Text style={{ color: "#9ca3af" }}>Model:</Text>
        <select
          disabled={predicting}
          value={modelKind}
          onChange={(e) => {
            if (modelKind === "timesfm" && e.target.value !== "timesfm") {
              void releaseTimesFM();
            }
            setModelKind(e.target.value as ModelKind);
            setModel(null);
            setForecast("");
            setForecastPoints([]);
          }}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #4b5563",
            background: "#111827",
            color: "#e5e7eb",
            minWidth: 170,
          }}
        >
          <option value="xgboost">XGBoost</option>
          <option value="lightgbm">LightGBM</option>
          <option value="varma">VARMA experimental</option>
          <option value="chronos">Chronos-2 pretrained</option>
          <option value="timesfm">TimesFM 2.5 pretrained (experimental)</option>
          <option value="ridge">Ridge (linear baseline)</option>
        </select>

        <Pressable
          onPress={handleTrain}
          disabled={!canTrain}
          style={{
            width: 100,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: canTrain ? "#22c55e" : "#371f1f",
            opacity: canTrain ? 1 : 0.4,
          }}
        >
          <Text style={{ color: "#020817", fontWeight: "600" }}>
            {isPretrained ? "Pretrained" : "Train"}
          </Text>
        </Pressable>

        <Pressable
          onPress={handlePredict}
          disabled={!canForecast}
          style={{
            width: 110,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: canForecast ? "#38bdf8" : "#371f1f",
            opacity: canForecast ? 1 : 0.4,
          }}
        >
          <Text style={{ color: "#020817", fontWeight: "600" }}>
            {predicting ? "Running ..." : `Forecast +${DEFAULT_FORECAST_HORIZON}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          accessibilityLabel="Open settings"
          style={{ paddingVertical: 8, paddingHorizontal: 14,
            borderRadius: 8, borderWidth: 1, borderColor: "#64748b",
            backgroundColor: "#111827" }}
        >
          <Text style={{ color: "#e5e7eb" }}>⚙ Settings</Text>
        </Pressable>
      </View>

      {modelKind === "timesfm" && (
        <div style={{ width: "100%", maxWidth: 960, color: "#e5e7eb", marginBottom: 14 }}>
          <label htmlFor="timesfm-model">TimesFM 2.5 ONNX model (optional: select local .onnx): </label>
          <input id="timesfm-model" type="file" accept=".onnx" disabled={predicting}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0] ?? null;
              setTimesFMFile(selected);
              void releaseTimesFM();
              setForecast(""); setForecastPoints([]);
              setStatus(selected ? `TimesFM model selected: ${selected.name}` : "TimesFM model not selected");
            }} />
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
            Uses only the target series. Default: downloads ~1 GB TimesFM 2.5 Transformers ONNX
            when Forecast is clicked. You can instead select that specific ONNX export locally.
            The incompatible timesfm-ts release ONNX is not supported. No server inference;
            high browser RAM is required.
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.78)", padding: 16,
            display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forecast-settings-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setSettingsOpen(false);
            }}
            style={{ width: "100%", maxWidth: 460, borderRadius: 16,
              background: "#111827", border: "1px solid #4b5563",
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              padding: 24, color: "#e5e7eb", textAlign: "left" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between",
              gap: 12, alignItems: "center" }}>
              <h2 id="forecast-settings-title" style={{ margin: 0, fontSize: 20 }}>
                Settings
              </h2>
              <button type="button" autoFocus onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
                style={{ color: "#e5e7eb", background: "#374151", border: 0,
                  borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>
                Close
              </button>
            </div>
            <h3 style={{ fontSize: 15, marginTop: 28, marginBottom: 12 }}>
              Advanced forecasting
            </h3>
            <label htmlFor="forecast-strategy" style={{ display: "block", marginBottom: 8 }}>
              Forecast strategy
            </label>
            {isPretrained || modelKind === "varma" ? (
              <p style={{ color: "#cbd5e1", marginTop: 0 }}>
                {modelKind === "varma"
                  ? "Joint multiseries forecasting (fixed for VARMA)"
                  : `Pretrained direct 16-step forecasting (fixed for ${modelKind === "timesfm" ? "TimesFM 2.5" : "Chronos-2"})`}
              </p>
            ) : (
              <>
                <select
                  id="forecast-strategy"
                  value={strategy}
                  onChange={(event) => {
                    setStrategy(event.target.value as "recursive" | "direct");
                    setModel(null);
                    setForecast("");
                    setForecastPoints([]);
                  }}
                  style={{ padding: 10, width: "100%", borderRadius: 8,
                    color: "#e5e7eb", background: "#030712",
                    border: "1px solid #64748b" }}
                >
                  <option value="direct">Direct 16-step (default)</option>
                  <option value="recursive">Recursive 16-step (advanced)</option>
                </select>
                {strategy === "direct" && (
                  <>
                    <label htmlFor="direct-target-mode" style={{ display: "block", marginTop: 18, marginBottom: 8 }}>
                      Direct prediction target
                    </label>
                    <select id="direct-target-mode" value={directTargetMode}
                      onChange={(event) => {
                        setDirectTargetMode(event.target.value as DirectTargetMode);
                        setModel(null);
                        setForecast("");
                        setForecastPoints([]);
                      }}
                      style={{ padding: 10, width: "100%", borderRadius: 8,
                        color: "#e5e7eb", background: "#030712",
                        border: "1px solid #64748b" }}>
                      <option value="price">Original values (default)</option>
                      <option value="log_return">Cumulative log return (positive series only)</option>
                    </select>
                  </>
                )}
                <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.5 }}>
                  Direct trains 16 horizon-specific models, without estimating future
                  peer inputs. Recursive trains one model and iteratively predicts
                  16 steps; training is faster, but later forecasts reuse predictions.
                  Changing strategy or target representation requires retraining.
                  Log-return predictions are converted back to the original units for display.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <View
        style={{
          width: "100%",
          maxWidth: 960,
          height: 360,
          backgroundColor: "#000000ff",
          borderRadius: 16,
          padding: 12,
        }}
      >
        {chart ? (
          <Line data={chart.data} options={chart.options} />
        ) : (
          <Text
            style={{
              color: "#6b7280",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Upload a CSV/XLSX file to visualize all series.
          </Text>
        )}
      </View>

      {/* Output */}
      <ScrollView
        style={{
          width: "100%",
          maxWidth: 960,
          marginTop: 12,
          backgroundColor: "#000000ff",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <Text
          style={{
            color: "#e5e7eb",
            fontFamily: "monospace",
          }}
        >
          {forecast || "Prediction result will appear here."}
        </Text>
      </ScrollView>
    </View>
  );
}


function buildChartData(
  data: LoadedData | null,
  target: string | null,
  forecastPoints: ForecastPoint[]
): { data: ChartData<"line">; options: ChartOptions<"line"> } | null {
  if (!data || !data.rows.length) return null;

  const useDatetime =
    !!data.datetimeKey && data.headers.includes(data.datetimeKey);

  const observedLabels: string[] = useDatetime
    ? data.rows.map((r) => String(r[data.datetimeKey as string] ?? ""))
    : data.rows.map((_, i) => String(i)); // unify as string

  const labels = [
    ...observedLabels,
    ...forecastPoints.map((point) => point.label),
  ];

  const numericKeys = data.headers.filter((h) => {
    if (h === data.datetimeKey) return false;
    const v = data.rows[0]?.[h];
    const n = Number(v);
    return Number.isFinite(n);
  });

  if (!numericKeys.length) return null;

  const palette = [
    "#22c55e",
    "#60a5fa",
    "#f59e0b",
    "#ef4444",
    "#a78bfa",
    "#14b8a6",
  ];

  const targetSeriesColor =
    target && numericKeys.includes(target)
      ? palette[numericKeys.indexOf(target) % palette.length]
      : palette[0];

  const datasets: LineDataset[] = numericKeys.map((k, i) => ({
    label: k,
    data: [
      ...data.rows.map((r) => Number(r[k])),
      ...forecastPoints.map(() => null),
    ],
    borderColor: palette[i % palette.length],
    backgroundColor: palette[i % palette.length],
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.25,
  }));

  const chartDatasets: LineDataset[] = [...datasets];

  if (target && forecastPoints.length > 0) {
    chartDatasets.push({
      label: `${target} forecast`,
      data: [
        ...data.rows.map(() => null),
        ...forecastPoints.map((point) => point.value),
      ],
      borderColor: targetSeriesColor,
      backgroundColor: targetSeriesColor,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 3,
      tension: 0.25,
    });
  }

  return {
    data: {
      labels,
      datasets: chartDatasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: { display: true },
        y: { display: true },
      },
    },
  };
}
