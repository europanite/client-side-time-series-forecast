import { trainLightGBMFeatures } from "../lightgbm";
import { trainLightGBMBaggedFeatures } from "../lightgbm-bagging";
import { trainDirectForecast, forecastDirectNextN } from "../forecast-strategies";

jest.mock("../lightgbm", () => ({trainLightGBMFeatures: jest.fn()}));

const mockedTrain = trainLightGBMFeatures as jest.MockedFunction<typeof trainLightGBMFeatures>;
const X = Array.from({length: 24}, (_, index) => [index, index * 2]);
const y = X.map(row => row[0] + 100);

beforeEach(() => jest.clearAllMocks());

it("trains two independent bootstraps and equally averages their predictions", async () => {
  const disposed = [jest.fn(), jest.fn()];
  mockedTrain
    .mockResolvedValueOnce({fit: jest.fn(), predict: () => [10, 20], dispose: disposed[0]})
    .mockResolvedValueOnce({fit: jest.fn(), predict: () => [30, 40], dispose: disposed[1]});

  const ensemble = await trainLightGBMBaggedFeatures(X, y);
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

it("uses reproducible bootstrap samples", async () => {
  mockedTrain.mockImplementation(async () => ({fit: jest.fn(), predict: () => [0], dispose: jest.fn()}));
  await trainLightGBMBaggedFeatures(X, y);
  const samples = mockedTrain.mock.calls.map(([features]) => features);
  mockedTrain.mockClear();
  await trainLightGBMBaggedFeatures(X, y);
  expect(mockedTrain.mock.calls.map(([features]) => features)).toEqual(samples);
});

it("fits four LightGBM boosters for two direct horizons", async () => {
  const rows = Array.from({length: 48}, (_, i) => ({
    Date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
    target: 100 + i,
  }));
  const data = {rows, headers: ["Date", "target"], datetimeKey: "Date"};
  let fitted = 0;
  mockedTrain.mockImplementation(async () => {
    const value = ++fitted;
    return {fit: jest.fn(), predict: () => [value * 10], dispose: jest.fn()};
  });
  const model = await trainDirectForecast(data, "target", "lightgbm_bag2", 2);
  expect(mockedTrain).toHaveBeenCalledTimes(4);
  expect(forecastDirectNextN(data, "target", model).map(point => point.value))
    .toEqual([15, 35]);
  model.dispose();
});

it("disposes the first booster if fitting the second fails", async () => {
  const dispose = jest.fn();
  mockedTrain.mockResolvedValueOnce({fit: jest.fn(), predict: () => [1], dispose});
  mockedTrain.mockRejectedValueOnce(new Error("second fit failed"));
  await expect(trainLightGBMBaggedFeatures(X, y)).rejects.toThrow("second fit failed");
  expect(dispose).toHaveBeenCalledTimes(1);
});

it("rejects invalid supervision and non-finite predictions", async () => {
  await expect(trainLightGBMBaggedFeatures([[1]], [1])).rejects.toThrow(/aligned/);
  await expect(trainLightGBMBaggedFeatures(X, y.slice(1))).rejects.toThrow(/aligned/);
  mockedTrain
    .mockResolvedValueOnce({fit: jest.fn(), predict: () => [Infinity], dispose: jest.fn()})
    .mockResolvedValueOnce({fit: jest.fn(), predict: () => [10], dispose: jest.fn()});
  const ensemble = await trainLightGBMBaggedFeatures(X, y);
  expect(() => ensemble.predict([[1]])).toThrow(/Invalid bagged/);
});
