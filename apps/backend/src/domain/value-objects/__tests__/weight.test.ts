import { BusinessLogicError } from "@domain/errors/business-logic-error.js";
import { describe, expect, it } from "vitest";

import { Weight } from "../weight.js";

describe("Weight", () => {
  it("rounds a finite positive value to one decimal place", () => {
    expect(Weight.from(182.45).value).toBe(182.5);
  });

  it("accepts a value that rounds to the upper bound", () => {
    expect(Weight.from(999.9).value).toBe(999.9);
  });

  it.each([0, -1, 0.04, 1000, 999.95, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s",
    (value) => {
      expect(() => Weight.from(value)).toThrow(BusinessLogicError);
    },
  );

  it("can reconstitute an existing stored number without changing it", () => {
    expect(Weight.reconstitute(182.45).value).toBe(182.45);
  });
});
