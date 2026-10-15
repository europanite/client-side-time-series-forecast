import type { ForecastPoint } from "./core";

export type ForecastBand = { lower: number; upper: number };
export type ForecastMetadata = {
  model: string;
  strategy: string;
  target: string;
};
export type ForecastExportRow = ForecastMetadata & {
  step: number;
  date: string;
  predicted: number;
  p10: number | null;
  p90: number | null;
};

export const FORECAST_EXPORT_HEADERS = [
  "Model", "Strategy", "Target", "Step", "Date / period", "Forecast", "P10", "P90",
];

export function buildForecastExportRows(
  points: readonly ForecastPoint[],
  metadata: ForecastMetadata,
  bands: readonly ForecastBand[] | null = null,
): ForecastExportRow[] {
  return points.map((point, index) => ({
    ...metadata,
    step: index + 1,
    date: point.label,
    predicted: point.value,
    p10: bands?.[index]?.lower ?? null,
    p90: bands?.[index]?.upper ?? null,
  }));
}

export function forecastExportMatrix(rows: readonly ForecastExportRow[]): (string | number | null)[][] {
  return [
    [...FORECAST_EXPORT_HEADERS],
    ...rows.map(row => [
      row.model, row.strategy, row.target, row.step, row.date,
      row.predicted, row.p10, row.p90,
    ]),
  ];
}

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  // Untrusted CSV header labels must not become formulas in spreadsheet apps.
  const safeValue = /^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return /[,"\r\n]/.test(safeValue)
    ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
}

export function forecastToCSV(rows: readonly ForecastExportRow[]): string {
  return forecastExportMatrix(rows)
    .map(row => row.map(csvCell).join(","))
    .join("\r\n") + "\r\n";
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to start the download before revoking the blob URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveForecastCSV(rows: readonly ForecastExportRow[], basename: string): void {
  if (!rows.length) return;
  download(new Blob([forecastToCSV(rows)], { type: "text/csv;charset=utf-8" }), `${basename}.csv`);
}

export async function saveForecastXLSX(rows: readonly ForecastExportRow[], basename: string): Promise<void> {
  if (!rows.length) return;
  // XLSX is already used for importing files. Load it only when exporting.
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet(forecastExportMatrix(rows));
  sheet["!cols"] = [
    { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 8 },
    { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Forecast");
  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }), `${basename}.xlsx`);
}
