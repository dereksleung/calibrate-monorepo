import { BusinessLogicError } from "../errors/business-logic-error.js";

export const MAX_WEIGHT_POUNDS = 999.9;

function roundToOneDecimal(value: number): number {
  return Number(
    value.toLocaleString("en-US", {
      useGrouping: false,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  );
}

export class Weight {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  public static from(value: number): Weight {
    if (!Number.isFinite(value)) {
      throw new BusinessLogicError("Weight must be a finite number");
    }

    const rounded = roundToOneDecimal(value);
    if (rounded <= 0) {
      throw new BusinessLogicError("Weight must be greater than 0");
    }
    if (rounded > MAX_WEIGHT_POUNDS) {
      throw new BusinessLogicError(`Weight must be at most ${MAX_WEIGHT_POUNDS}`);
    }

    return new Weight(rounded);
  }

  /** Stored rows are trusted during reconstitution just like other Day Log fields. */
  public static reconstitute(value: number): Weight {
    return new Weight(value);
  }

  public get value(): number {
    return this._value;
  }
}
