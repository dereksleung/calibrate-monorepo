import type { SaveFoodEntryCommand } from "../save-food-entry.js";

import { buildFoodEntry } from "../../../../shared/models/day-logs/__mocks__/day-log.js";

export function buildSaveFoodEntryCommand(
  overrides: Partial<SaveFoodEntryCommand> = {},
): SaveFoodEntryCommand {
  const { id: _id, ...entry } = buildFoodEntry();
  return { ...entry, ...overrides };
}
