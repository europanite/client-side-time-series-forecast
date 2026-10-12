import {
  loadFromCSV,
  loadFromXLSX,
  trainModel,
  predictNext,
  forecastNextN,
  type LoadedData,
} from "../core";
import { parseXLSX, buildFeatures } from "../api";
import { initXGBoostCtor } from "../xgb";
import { DEFAULT_FORECAST_HORIZON } from "../forecast-config";

// --- mocks setup ---

jest.mock("../api", () => {
  const actual = jest.requireActual("../api");
  return {
    __esModule: true,
    ...actual,
    parseXLSX: jest.fn(actual.parseXLSX),
    buildFeatures: jest.fn(actual.buildFeatures),
  };
});

jest.mock("../xgb");

const mockedParseXLSX = parseXLSX as jest.MockedFunction<typeof parseXLSX>;
const mockedBuildFeatures = buildFeatures as jest.MockedFunction<
  typeof buildFeatures
>;
const mockedInitXGBoostCtor =
  initXGBoostCtor as jest.MockedFunction<typeof initXGBoostCtor>;

// --- tests ---

describe("loadFromCSV", () => {
  it("infers datetimeKey from headers containing date/time", async () => {
    const csv = `Date,value
2025-01-01,10`;

    const data = await loadFromCSV(csv);

    expect(data.headers).toEqual(["Date", "value"]);
    expect(data.datetimeKey).toBe("Date");
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toEqual({ Date: "2025-01-01", value: "10" });
  });

  it("returns null datetimeKey when no date/time-like column", async () => {
    const csv = `x,y
1,2`;

    const data = await loadFromCSV(csv);

    expect(data.headers).toEqual(["x", "y"]);
    expect(data.datetimeKey).toBeNull();
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toEqual({ x: "1", y: "2" });
  });
});

describe("loadFromXLSX", () => {
  it("uses parseXLSX and infers datetimeKey", async () => {
    const rows = [{ timestamp: "2025-01-01", v: 1 }];

    mockedParseXLSX.mockResolvedValueOnce({
      rows,
      headers: ["timestamp", "v"],
    });

    const buf = new ArrayBuffer(8);
    const data = await loadFromXLSX(buf);

    expect(mockedParseXLSX).toHaveBeenCalledTimes(1);
    expect(data.headers).toEqual(["timestamp", "v"]);
    expect(data.datetimeKey).toBe("timestamp");
    expect(data.rows).toEqual(rows);
  });
});

describe("trainModel & predictNext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls initXGBoostCtor, trains model, and predicts using lastFeatureRow", async () => {
    const rows = [
      { datetime: "t0", a: "1", target: "10" },
      { datetime: "t1", a: "3", target: "30" },
    ];

    const fakeFeatures = {
      X: [
        [1],
        [3],
      ],
      y: [10, 30],
      lastFeatureRow: [3],
    };

    mockedBuildFeatures.mockReturnValue(fakeFeatures as any);

    class FakeXGBoost {
      public trainedX: number[][] | null = null;
      public trainedY: number[] | null = null;

      constructor(_config: any) {}

      train(X: number[][], y: number[]): void {
        this.trainedX = X;
        this.trainedY = y;
      }

      predict(rowsIn: number[][]): number[] {
        const ys = this.trainedY ?? [];
        const mean =
          ys.length === 0
            ? 0
            : ys.reduce((sum, v) => sum + v, 0) / ys.length; // (10 + 30) / 2 = 20
        return rowsIn.map(() => mean);
      }
    }

    mockedInitXGBoostCtor.mockResolvedValueOnce(FakeXGBoost as any);

    const data: LoadedData = {
      rows,
      headers: ["datetime", "a", "target"],
      datetimeKey: "datetime",
    };

    const booster = await trainModel(data, "target");

    expect(mockedInitXGBoostCtor).toHaveBeenCalledTimes(1);
    expect(mockedBuildFeatures).toHaveBeenCalledWith(
      data.rows,
      "datetime",
      "target"
    );
    expect(booster).toBeInstanceOf(FakeXGBoost);

    const yhat = predictNext(data, "target", booster);
    expect(yhat).toBeCloseTo(20);
  });

  it("uses the shared 16-step horizon by default", () => {
    mockedBuildFeatures.mockReturnValue({
      X: [[100]],
      y: [100],
      lastFeatureRow: [100],
    } as any);

    const data: LoadedData = {
      rows: [{ date: "2026-01-01", target: "100" }],
      headers: ["date", "target"],
      datetimeKey: "date",
    };

    const model = {
      predict: jest.fn(() => [100]),
    };

    const points = forecastNextN(data, "target", model);

    expect(DEFAULT_FORECAST_HORIZON).toBe(16);
    expect(points).toHaveLength(DEFAULT_FORECAST_HORIZON);
    expect(points[0].label).toBe("2026-01-02");
    expect(points[points.length - 1].label).toBe("2026-01-17");
  });


  it("returns model predictions without forced seasonal postprocessing", () => {
    mockedBuildFeatures.mockReturnValue({
      X: [[10]], y: [10], lastFeatureRow: [10],
    } as any);
    const data: LoadedData = {
      rows: Array.from({length: 20}, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, "0")}`, target: "10",
      })),
      headers: ["date", "target"], datetimeKey: "date",
    };
    const model = { predict: () => [30] };
    const points = forecastNextN(data, "target", model, 1);
    expect(points[0].value).toBe(30);
    expect(() => forecastNextN(data, "target", {predict:()=>[NaN]}, 1))
      .toThrow(/Non-finite forecast/);
  });

});
