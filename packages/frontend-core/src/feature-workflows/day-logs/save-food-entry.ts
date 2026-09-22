import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type { FoodEntry } from "../../verticals/day-logs/models/food-entry.js";
import type { FoodEntryWriteAcknowledgement } from "../../verticals/day-logs/models/write-acknowledgement.js";

import { saveFoodEntry } from "../../api/day-logs/save-food-entry.js";
import { toFoodEntryWriteAcknowledgement } from "./day-log-mappers.js";
import { applyDayLogSyncResult, getDayLogSyncManifest, syncDayLogs } from "./sync-day-logs.js";
import { applyFoodEntryAcknowledgement } from "./write-reconciliation.js";

export { applyFoodEntryAcknowledgement as applyFoodEntryCreateToDayLogCache } from "./write-reconciliation.js";

export type SaveFoodEntryCommand = Omit<FoodEntry, "id">;

export type DayLogWorkflowContext = {
  accountId: string;
  transport: ApiTransport;
};

type SaveFoodEntryDependencies = DayLogWorkflowContext & { queryClient: ReturnType<typeof useQueryClient> };

async function reconcileSingleDate(dependencies: SaveFoodEntryDependencies, date: string): Promise<void> {
  const range = { startDate: date, endDate: date };
  try {
    const response = await syncDayLogs(dependencies.transport, {
      ...range,
      known: getDayLogSyncManifest(dependencies.queryClient, dependencies.accountId, range),
    });
    applyDayLogSyncResult(dependencies.queryClient, dependencies.accountId, range, response, Date.now());
  } catch {
    // The locally acknowledged, invalidated slot remains eligible for ordinary validation.
  }
}

async function saveAndReconcile(
  dependencies: SaveFoodEntryDependencies,
  date: string,
  command: SaveFoodEntryCommand,
): Promise<FoodEntryWriteAcknowledgement> {
  const acknowledgement = toFoodEntryWriteAcknowledgement(
    await saveFoodEntry(dependencies.transport, date, command),
  );
  const { needsSingleDateSync } = await applyFoodEntryAcknowledgement(
    dependencies.queryClient,
    dependencies.accountId,
    date,
    command,
    acknowledgement,
  );
  if (needsSingleDateSync) await reconcileSingleDate(dependencies, date);
  return acknowledgement;
}

export function getSaveFoodEntryMutationOptions(dependencies: SaveFoodEntryDependencies, date: string) {
  return { mutationFn: (command: SaveFoodEntryCommand) => saveAndReconcile(dependencies, date, command) };
}

export function useSaveFoodEntry(
  context: DayLogWorkflowContext,
  date: string,
  options?: Omit<
    UseMutationOptions<FoodEntryWriteAcknowledgement, Error, SaveFoodEntryCommand>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({ ...getSaveFoodEntryMutationOptions({ ...context, queryClient }, date), ...options });
}
