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
  name: "Oatmeal",
  brand: null,
  calories: 280,
  totalFatGrams: 150,
  saturatedFatGrams: 1,
  cholesterolMg: null,
  sodiumMg: 120,
  totalCarbohydrateGrams: 210,
  fiberGrams: 3,
  sugarGrams: 600,
  proteinGrams: 190,
  chosenQuantity: 2,
  chosenUnit: "serving",
  quantityServing: 1,
  servingLabel: "serving",
  quantityMass: null,
  massUnit: null,
  quantityVolume: null,
  volumeUnit: null,
};

export const coffeeFixture: FoodEntryResponse = {
  id: "entry-coffee",
  meal: "BREAKFAST",
  name: "Black coffee",
  brand: null,
  calories: 2,
  totalFatGrams: 0,
  saturatedFatGrams: null,
  cholesterolMg: null,
  sodiumMg: 5,
  totalCarbohydrateGrams: 0,
  fiberGrams: null,
  sugarGrams: null,
  proteinGrams: 0,
  chosenQuantity: 1,
  chosenUnit: "cup",
  quantityServing: 1,
  servingLabel: "serving",
  quantityMass: null,
  massUnit: null,
  quantityVolume: 250,
  volumeUnit: "ml",
};

export const normalDayLogFixture: DayLogResponse = {
  id: "day-log-today",
  date: new Date(`${selectedDateFixture}T00:00:00`),
  breakfast: [oatmealFixture, coffeeFixture],
  lunch: [],
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
