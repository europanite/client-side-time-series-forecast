import { duplicateTimesFMInput, fillTimesFMGaps, parseTimesFMTransformersOutput, timesFMInput, TIMESFM_ONNX_BATCH } from "../timesfm-data";

const rows = Array.from({length: 32}, (_, i) => ({
  date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
  price: String(100 + i),
  peer: String(i * 99),
}));
const data = { rows, headers: ["date", "price", "peer"], datetimeKey: "date" };

describe("TimesFM browser adapter", () => {
  it("keeps temporal gaps and excludes exogenous columns", () => {
    const broken = {...data, rows: rows.map((row, i) => i === 12 ? {...row, price:""} : row)};
    const input = timesFMInput(broken, "price");
    expect(input).toHaveLength(32);
    expect(Number.isNaN(input[12])).toBe(true);
    expect(input[13]).toBe(113);
    expect(() => timesFMInput(broken, "peer_missing")).toThrow(/Invalid/);
  });
  it("requires at least 16 observations before model loading", () => {
    expect(() => timesFMInput({...data, rows:rows.slice(0, 15)}, "price"))
      .toThrow(/16 numeric/);
  });
it("interpolates missing TimesFM context values without changing alignment", () => {
  const v = Float32Array.from([NaN, 10, NaN, NaN, 16, NaN]);
  expect(Array.from(fillTimesFMGaps(v))).toEqual([10, 10, 12, 14, 16, 16]);
  expect(Number.isNaN(v[2])).toBe(true);
  expect(() => fillTimesFMGaps(Float32Array.from([NaN]))).toThrow(/no valid/);
});

it("duplicates the SAME context for the model's required batch size 2", () => {
  const context = Float32Array.from([10, 20, 30]);
  const batched = duplicateTimesFMInput(context);
  expect(TIMESFM_ONNX_BATCH).toBe(2);
  expect(Array.from(batched)).toEqual([10, 20, 30, 10, 20, 30]);
  expect(Array.from(context)).toEqual([10, 20, 30]);
  expect(() => duplicateTimesFMInput(Float32Array.from([1, NaN]))).toThrow(/finite/);
});

it("parses real Transformers-style [batch,horizon,10] outputs (not the timesfm-ts layout)", () => {
  const n = 16;
  const raw = Float32Array.from({length:n*10}, (_, i) => Math.floor(i/10) + i%10);
  const result = parseTimesFMTransformersOutput({dims:[1,n,10],data:raw}, data);
  expect(result.points).toHaveLength(n);
  expect(result.points[0].value).toBe(5);
  expect(result.points[15].value).toBe(20);
  expect(result.lower[0]).toBe(1);
  expect(result.upper[0]).toBe(9);
  // A fixed-batch export returns [2,H,10]; the second row must never leak
  // into the evaluated forecast, even if its values differ wildly.
  const batch2 = Float32Array.from([
    ...raw,
    ...Array.from({length:n*10}, () => 999999),
  ]);
  const fixedBatchResult = parseTimesFMTransformersOutput({dims:[2,n,10],data:batch2},data);
  expect(fixedBatchResult).toEqual(result);
  expect(() => parseTimesFMTransformersOutput({dims:[3,n,10],data:Float32Array.from([...batch2,...raw])},data))
    .toThrow(/shape/);
  expect(() => parseTimesFMTransformersOutput({dims:[1,n,9],data:raw},data))
    .toThrow(/shape/);
  expect(() => parseTimesFMTransformersOutput({dims:[1,2,10],data:raw},data))
    .toThrow(/shape/);
});

});
