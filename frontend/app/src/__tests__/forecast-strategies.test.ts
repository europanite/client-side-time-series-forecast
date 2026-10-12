import { buildFeatures, buildDirectLogReturnFeatures } from "../api";
import { trainDirectForecast, forecastDirectNextN, assertForecastStrategy, DEFAULT_FORECAST_OPTIONS } from "../forecast-strategies";
import { forecastNextN } from "../core";

// Use real frontend Ridge, not a second toy direct-model implementation.
const rows = Array.from({ length: 84 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  target: 100 + i * 2 + 4 * Math.sin(i * Math.PI / 7),
  peer: 200 + 0.5 * i + 3 * Math.cos(i * Math.PI / 7),
}));
const data = { rows, headers: ["date", "target", "peer"], datetimeKey: "date" };

describe("generic forecast strategies", () => {
  it("defaults to direct 16-step forecasting", () => {
    expect(DEFAULT_FORECAST_OPTIONS).toEqual({horizon:16, strategy:"direct"});
  });
  it("rejects unsupported model/strategy combinations", () => {
    expect(() => assertForecastStrategy("varma", "direct")).toThrow();
    expect(() => assertForecastStrategy("chronos", "recursive")).toThrow();
    expect(() => assertForecastStrategy("ridge", "joint")).toThrow();
    expect(() => assertForecastStrategy("varma", "joint")).not.toThrow();
    expect(() => assertForecastStrategy("ridge", "direct")).not.toThrow();
  });

  it("fits 16 independent Ridge horizons and forecasts from one actual origin", async () => {
    const completed: number[] = [];
    const direct = await trainDirectForecast(data, "target", "ridge", 16,
      step => completed.push(step));
    expect(completed).toEqual(Array.from({length:16}, (_, i) => i + 1));
    expect(direct.models).toHaveLength(16);
    const forecast = forecastDirectNextN(data, "target", direct);
    expect(forecast).toHaveLength(16);
    expect(forecast.every(point => Number.isFinite(point.value))).toBe(true);
    expect(forecast[0].label).toBe("2026-03-26");
    expect(() => forecastDirectNextN(data, "peer", direct)).toThrow(/mismatch/);
    expect(() => forecastDirectNextN(data, "target", direct, 17)).toThrow(/mismatch/);
    const prev = forecastNextN(data, "target", {predict: () => [rows.at(-1)!.target]}, 16);
    expect(prev[0].value).toBe(rows.at(-1)!.target);
    expect(buildFeatures(rows, "date", "target").lastFeatureRow.length).toBeGreaterThan(6);
  });

  it("univariate direct Ridge works without exogenous variables", async () => {
    const alone = {rows: rows.map(({ date, target }) => ({ date, target })),
      headers: ["date", "target"], datetimeKey:"date"};
    const direct = await trainDirectForecast(alone, "target", "ridge", 3);
    expect(forecastDirectNextN(alone, "target", direct).map(p => Number.isFinite(p.value)))
      .toEqual([true,true,true]);
  });
  it("trains cumulative log returns from the correct historical origin, without look-ahead", async () => {
    const h = 3;
    const direct = buildDirectLogReturnFeatures(rows, "date", "target", h);
    expect(direct.y[0]).toBeCloseTo(Math.log(rows[9].target / rows[6].target), 12);
    // Seven rows are warm-up history: buildFeatures requires an eighth row
    // to materialize the training feature at t=7 (using only rows 0..6).
    const firstStep = buildFeatures(rows.slice(0, 8), "date", "target");
    expect(direct.X[0]).toEqual(firstStep.X[0]);
    expect(direct.X[0][0]).toBeCloseTo(rows[6].peer, 12);
    expect(direct.X[0][6]).toBeCloseTo(rows[6].target, 12);
    const futureChanged = rows.map((r, i) => i <= 6 ? r : {...r, target: r.target * 10, peer: r.peer * 10});
    expect(buildDirectLogReturnFeatures(futureChanged, "date", "target", h).X[0]).toEqual(direct.X[0]);
    const fitted = await trainDirectForecast(data, "target", "ridge", h, undefined, "log_return");
    expect(fitted.targetMode).toBe("log_return");
    expect(forecastDirectNextN(data, "target", fitted).every(p => Number.isFinite(p.value) && p.value > 0)).toBe(true);
    fitted.dispose();
  });

  it("rejects nonpositive prices and restores a zero return to the current price", async () => {
    const invalid = {...data, rows: rows.map((r,i)=>i===20 ? {...r,target:0} : r)};
    expect(() => buildDirectLogReturnFeatures(invalid.rows,"date","target",2)).toThrow(/positive/);
    const fitted = await trainDirectForecast(data,"target","ridge",2,undefined,"log_return");
    fitted.models.forEach(m => { m.predict = () => [0]; });
    const values = forecastDirectNextN(data,"target",fitted).map(p=>p.value);
    expect(values).toEqual([rows.at(-1)!.target,rows.at(-1)!.target]);
    fitted.models[0].predict = () => [10000];
    expect(() => forecastDirectNextN(data,"target",fitted)).toThrow(/Invalid/);
    fitted.dispose();
  });

});
