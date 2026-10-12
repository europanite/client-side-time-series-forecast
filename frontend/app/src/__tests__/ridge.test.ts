import { fitRidgeFeatures, trainRidgeModel } from "../ridge";
import { forecastNextN, loadFromCSV } from "../core";
import { DEFAULT_FORECAST_HORIZON } from "../forecast-config";

describe("Ridge baseline", () => {
  it("fits a constant target with unpenalized intercept", () => {
    const model = fitRidgeFeatures([[1], [2], [3], [4]], [50, 50, 50, 50]);
    expect(model.predict([[5], [7]])).toEqual([50, 50]);
  });

  it("learns a positive slope and rejects invalid inputs", () => {
    const model = fitRidgeFeatures([[0], [1], [2], [3]], [1, 3, 5, 7]);
    expect(model.predict([[4]])[0]).toBeGreaterThan(7);
    expect(() => model.predict([[1, 2]])).toThrow(/width/);
    expect(() => fitRidgeFeatures([[0], [Number.NaN]], [1, 2])).toThrow(/finite/);
    expect(() => fitRidgeFeatures([[1, 2], [3]], [1, 2])).toThrow(/rectangular/);
  });

  it("reuses the same 16-step forecast function as XGBoost and LightGBM", async () => {
    const csv = ["Date,Target,Peer",
      ...Array.from({length: 90}, (_, i) => {
        const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
        return `${date},${100 + i * 0.1},${200 + i * 0.2}`;
      })].join("\n");
    const data = await loadFromCSV(csv);
    const model = trainRidgeModel(data, "Target");
    const points = forecastNextN(data, "Target", model);
    expect(points).toHaveLength(DEFAULT_FORECAST_HORIZON);
    expect(points.every(p => Number.isFinite(p.value))).toBe(true);
  });
});
