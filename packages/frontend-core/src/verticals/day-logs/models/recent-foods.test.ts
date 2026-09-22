import { describe, expect, it } from "vitest";

import { buildDayLog, buildFoodEntry } from "./__mocks__/day-log.js";
import { rankRecentFoodsFromCache } from "./recent-foods.js";

describe("rankRecentFoodsFromCache", () => {
  it("uses only cached older days and prioritizes the selected meal", () => {
    const ranked = rankRecentFoodsFromCache({
      today: "2026-05-18",
      preselectedMeal: "LUNCH",
      slots: [
        { date: "2026-05-18", data: buildDayLog({ lunch: [buildFoodEntry({ name: "Today" })] }) },
        { date: "2026-05-17", data: buildDayLog({ lunch: [buildFoodEntry({ name: "Lunch" })], breakfast: [buildFoodEntry({ name: "Breakfast" })] }) },
        { date: "2026-05-16", data: null },
      ],
    });

    expect(ranked.map(({ food }) => food.name)).toEqual(["Lunch", "Breakfast"]);
  });
});
