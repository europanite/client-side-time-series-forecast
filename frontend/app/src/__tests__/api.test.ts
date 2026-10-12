import { parseCSV, buildFeatures, buildDirectFeatures, buildDirectLogReturnFeatures, parseXLSX } from "../api";

describe("parseCSV", () => {
  it("parses simple CSV into rows and headers", () => {
    const text = `
datetime,a,b,target
2025-01-01,1,2,3
2025-01-02,4,5,6
`.trim();

    const { rows, headers } = parseCSV(text);

    expect(headers).toEqual(["datetime", "a", "b", "target"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      datetime: "2025-01-01",
      a: "1",
      b: "2",
      target: "3",
    });
  });

  it("returns empty arrays for blank input", () => {
    const { rows, headers } = parseCSV("   ");
    expect(rows).toEqual([]);
    expect(headers).toEqual([]);
  });
});

describe("buildFeatures: past-only training features", () => {
  const rows = Array.from({ length: 24 }, (_, i) => ({
    datetime: `2026-01-${String(i + 1).padStart(2, "0")}`,
    a: String(100 + i * 2),
    b: String(50 + i),
    target: String(300 + i * 3),
  }));

  it("drops 7 warm-up rows and aligns each target with its previous history", () => {
    const { X, y, lastFeatureRow } = buildFeatures(rows, "datetime", "target");
    expect(X).toHaveLength(rows.length - 7);
    expect(y).toEqual(rows.slice(7).map((r) => Number(r.target)));
    expect(X[0].length).toBeGreaterThan(7);
    expect(lastFeatureRow).toHaveLength(X[0].length);
    // The first features at t=7 are the last KNOWN peer prices, at t=6.
    expect(X[0].slice(0, 2)).toEqual([112, 56]);
    expect(lastFeatureRow.slice(0, 2)).toEqual([146, 73]);
  });

  it("a historical training feature exactly equals a genuine next-step inference feature", () => {
    for (const origin of [8, 12, 20]) {
      const training = buildFeatures(rows, "datetime", "target");
      const pastOnly = buildFeatures(rows.slice(0, origin), "datetime", "target");
      expect(training.X[origin - 7]).toEqual(pastOnly.lastFeatureRow);
      // Changing the unknown target AND peer at t and all later observations
      // cannot change the features used for the prediction at t.
      const mutated = rows.map((r, i) => i < origin ? r : {
        ...r, a: "999999", b: "-7777", target: "-999999",
      });
      const after = buildFeatures(mutated, "datetime", "target");
      expect(after.X[origin - 7]).toEqual(training.X[origin - 7]);
    }
  });

  it("preserves the same feature width in recursive forecast input", () => {
    const original = buildFeatures(rows, "datetime", "target");
    const extended = buildFeatures([...rows, {
      datetime: "2026-01-25", a: "150", b: "75", target: "372",
    }], "datetime", "target");
    expect(extended.X.at(-1)).toEqual(original.lastFeatureRow);
  });


  it("includes target history for a univariate series, without contemporaneous labels", () => {
    const uni = rows.map(({ datetime, target }) => ({ datetime, target }));
    const full = buildFeatures(uni, "datetime", "target");
    expect(full.X[0].slice(0, 6)).toEqual([318, 315, 312, 309, 3, 309]);
    const origin = 13;
    const prefix = buildFeatures(uni.slice(0, origin), "datetime", "target");
    expect(full.X[origin - 7]).toEqual(prefix.lastFeatureRow);
    const futureEdited = uni.map((r, i) => i < origin ? r : ({...r, target: "99999"}));
    expect(buildFeatures(futureEdited, "datetime", "target").X[origin - 7])
      .toEqual(full.X[origin - 7]);
  });

  it("shifts direct horizon labels without leaking any future input", () => {
    const one = buildDirectFeatures(rows, "datetime", "target", 1);
    const four = buildDirectFeatures(rows, "datetime", "target", 4);
    expect(one.X).toEqual(buildFeatures(rows, "datetime", "target").X);
    expect(four.X.length).toBe(one.X.length - 3);
    expect(four.y[0]).toBe(Number(rows[10].target));
    expect(four.X[0]).toEqual(one.X[0]);
    expect(four.lastFeatureRow).toEqual(one.lastFeatureRow);
    expect(() => buildDirectFeatures(rows, "datetime", "target", 100)).toThrow(/Insufficient/);
    expect(() => buildDirectFeatures(rows, "datetime", "target", 0)).toThrow(/positive/);
  });

  it("log-return targets use the last observed price of each historical origin", () => {
    const direct = buildDirectLogReturnFeatures(rows,"datetime","target",4);
    expect(direct.y[0]).toBeCloseTo(Math.log(330/318),12);
    expect(direct.y[1]).toBeCloseTo(Math.log(333/321),12);
    expect(direct.X).toEqual(buildDirectFeatures(rows,"datetime","target",4).X);
  });

  it("returns empty structures for no rows", () => {
    const { X, y, lastFeatureRow } = buildFeatures([], "datetime", "target");
    expect(X).toEqual([]);
    expect(y).toEqual([]);
    expect(lastFeatureRow).toEqual([]);
  });
});


jest.mock("xlsx", () => {
  return {
    read: (_buf: Uint8Array) => ({
      SheetNames: ["Sheet1"],
      Sheets: {
        Sheet1: {
          "!ref": "A1:B3",
        },
      },
    }),
    utils: {
      sheet_to_json: () => [
        { datetime: "2025-01-01", x: 1 },
        { datetime: "2025-01-02", x: 2 },
      ],
    },
  };
});

describe("parseXLSX", () => {
  it("parses XLSX buffer via xlsx utils", async () => {
    const buf = new ArrayBuffer(8);
    const { rows, headers } = await parseXLSX(buf);

    expect(rows).toHaveLength(2);
    expect(headers).toEqual(["datetime", "x"]);
  });
});
