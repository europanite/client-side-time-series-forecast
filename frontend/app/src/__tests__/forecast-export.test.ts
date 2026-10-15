import {
  buildForecastExportRows, forecastExportMatrix, forecastToCSV,
} from "../forecast-export";

describe("forecast export", () => {
  const metadata = { model: "ridge", strategy: "direct", target: "Sales" };
  it("preserves labels, raw precision and prediction intervals", () => {
    const rows = buildForecastExportRows(
      [{ label: "2026-10-16", value: 123.456789 }, { label: "2026-10-17", value: 80 }],
      metadata, [{ lower: 100, upper: 140 }, { lower: 70, upper: 90 }],
    );
    expect(forecastExportMatrix(rows)[1]).toEqual([
      "ridge", "direct", "Sales", 1, "2026-10-16", 123.456789, 100, 140,
    ]);
    expect(forecastToCSV(rows)).toContain("123.456789,100,140");
  });

  it("uses blank cells for models without uncertainty bounds", () => {
    const rows = buildForecastExportRows([{ label: "day 1", value: 10 }], metadata);
    expect(forecastToCSV(rows)).toContain("day 1,10,,\r\n");
  });

  it("quotes CSV labels and protects against spreadsheet formula injection", () => {
    const rows = buildForecastExportRows([
      { label: '2026-10-16, "opening"', value: 1 },
    ], { ...metadata, target: "=HYPERLINK(\"https://example.org\")" });
    const csv = forecastToCSV(rows);
    expect(csv.startsWith("Model,Strategy")).toBe(true);
    expect(csv.charCodeAt(0)).not.toBe(0xFEFF);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.org"")"');
    expect(csv).toContain('"2026-10-16, ""opening"""');
  });
});
