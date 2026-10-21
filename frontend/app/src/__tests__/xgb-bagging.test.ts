import { trainXGBoostFeatures } from "../core";
import { trainXGBoostBaggedFeatures } from "../xgb-bagging";
import { trainDirectForecast, forecastDirectNextN } from "../forecast-strategies";

jest.mock("../core", () => ({trainXGBoostFeatures: jest.fn()}));

const mockedTrain = trainXGBoostFeatures as jest.MockedFunction<typeof trainXGBoostFeatures>;
const X = Array.from({length: 24}, (_, index) => [index, index * 2]);
const y = X.map(row => row[0] + 100);

beforeEach(() => jest.clearAllMocks());

it("trains exactly two independently bootstrapped XGBoost models and averages predictions", async () => {
  const disposed = [jest.fn(), jest.fn()];
  mockedTrain
    .mockResolvedValueOnce({predict: () => [10, 20], dispose: disposed[0]})
    .mockResolvedValueOnce({predict: () => [30, 40], dispose: disposed[1]});

  const ensemble = await trainXGBoostBaggedFeatures(X, y);
  expect(mockedTrain).toHaveBeenCalledTimes(2);
  const first = mockedTrain.mock.calls[0];
  const second = mockedTrain.mock.calls[1];
  expect(first[0]).toHaveLength(X.length);
  expect(second[0]).toHaveLength(X.length);
  expect(first[0]).not.toEqual(second[0]);
  for (const [sampleX, sampleY] of [first, second]) {
    expect(new Set(sampleX.map(row => row[0])).size).toBeLessThan(X.length);
    sampleX.forEach((row, index) => expect(sampleY[index]).toBe(y[row[0]]));
  }
  expect(ensemble.predict([[1], [2]])).toEqual([20, 30]);
  ensemble.dispose();
  disposed.forEach(dispose => expect(dispose).toHaveBeenCalledTimes(1));
});

it("reuses the same bootstrap samples for identical training data", async () => {
  mockedTrain.mockImplementation(async () => ({predict: () => [0]}));
  await trainXGBoostBaggedFeatures(X, y);
  const sampledX = mockedTrain.mock.calls.map(([features]) => features);
  mockedTrain.mockClear();
  await trainXGBoostBaggedFeatures(X, y);
  expect(mockedTrain.mock.calls.map(([features]) => features)).toEqual(sampledX);
});

it("fits two boosters at every direct horizon and returns their average", async () => {
  const rows = Array.from({length: 48}, (_, i) => ({
    Date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
    target: 100 + i,
  }));
  const data = {rows, headers: ["Date", "target"], datetimeKey: "Date"};
  let fitted = 0;
  mockedTrain.mockImplementation(async () => {
    const value = ++fitted;
    return {predict: () => [value * 10]};
  });
  const model = await trainDirectForecast(data, "target", "xgboost_bag2", 2);
  expect(mockedTrain).toHaveBeenCalledTimes(4);
  expect(forecastDirectNextN(data, "target", model).map(point => point.value))
    .toEqual([15, 35]);
  model.dispose();
});

it("disposes the first fitted model if fitting the second fails", async () => {
  const dispose = jest.fn();
  mockedTrain.mockResolvedValueOnce({predict: () => [1], dispose});
  mockedTrain.mockRejectedValueOnce(new Error("second model failed"));
  await expect(trainXGBoostBaggedFeatures(X, y)).rejects.toThrow("second model failed");
  expect(dispose).toHaveBeenCalledTimes(1);
});

it("rejects misaligned data and non-finite ensemble predictions", async () => {
  await expect(trainXGBoostBaggedFeatures([[1]], [1])).rejects.toThrow(/aligned/);
  await expect(trainXGBoostBaggedFeatures(X, y.slice(1))).rejects.toThrow(/aligned/);
  mockedTrain
    .mockResolvedValueOnce({predict: () => [Infinity]})
    .mockResolvedValueOnce({predict: () => [10]});
  const ensemble = await trainXGBoostBaggedFeatures(X, y);
  expect(() => ensemble.predict([[1]])).toThrow(/Invalid bagged/);
});
