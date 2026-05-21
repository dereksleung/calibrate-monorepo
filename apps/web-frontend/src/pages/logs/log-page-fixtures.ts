import type { DayLogResponse, FoodEntryResponse } from "@calibrate/api-contracts";

export type LogPageFixtureState =
  | { status: "loaded"; dayLog: DayLogResponse }
  | { status: "empty"; dayLog: null }
  | { status: "loading"; dayLog: null }
  | { status: "error"; dayLog: null; message: string };

export const selectedDateFixture = "2026-05-21";

export const oatmealFixture: FoodEntryResponse = {
  id: "entry-oatmeal",
  meal: "BREAKFAST",
  name: "Steel-cut oatmeal",
  brand: null,
  iconName: null,
  quantity: 1,
  quantityUnit: "bowl",
  calories: 310,
  totalFatGrams: 8,
  saturatedFatGrams: 1,
  cholesterolMg: null,
  sodiumMg: 120,
  totalCarbohydrateGrams: 52,
  fiberGrams: 8,
  sugarGrams: 6,
  proteinGrams: 12,
};

export const chickenRiceFixture: FoodEntryResponse = {
  id: "entry-chicken-rice",
  meal: "LUNCH",
  name: "Chicken and rice bowl",
  brand: "Homemade",
  iconName: null,
  quantity: 1,
  quantityUnit: "serving",
  calories: 620,
  totalFatGrams: 18,
  saturatedFatGrams: 4,
  cholesterolMg: 110,
  sodiumMg: 680,
  totalCarbohydrateGrams: 64,
  fiberGrams: 5,
  sugarGrams: 4,
  proteinGrams: 46,
};

export const normalDayLogFixture: DayLogResponse = {
  id: "day-log-today",
  date: new Date(`${selectedDateFixture}T00:00:00`),
  breakfast: [oatmealFixture],
  lunch: [chickenRiceFixture],
  dinner: [],
  snacks: [],
  weight: 184.2,
};

export const logPageFixtures = {
  normal: {
    status: "loaded",
    dayLog: normalDayLogFixture,
  },
  empty: {
    status: "empty",
    dayLog: null,
  },
  loading: {
    status: "loading",
    dayLog: null,
  },
  error: {
    status: "error",
    dayLog: null,
    message: "Could not load this day. Try again in a moment.",
  },
} satisfies Record<string, LogPageFixtureState>;
