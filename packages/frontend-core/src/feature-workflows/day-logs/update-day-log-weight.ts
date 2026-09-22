import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type { WeightWriteAcknowledgement } from "../../verticals/day-logs/models/write-acknowledgement.js";

import { updateDayLogWeight } from "../../api/day-logs/update-day-log-weight.js";
import { toWeightWriteAcknowledgement } from "./day-log-mappers.js";
import { applyDayLogSyncResult, getDayLogSyncManifest, syncDayLogs } from "./sync-day-logs.js";
import { applyWeightAcknowledgement } from "./write-reconciliation.js";

export { applyWeightAcknowledgement as applyWeightObservationToDayLogCache } from "./write-reconciliation.js";

export type UpdateDayLogWeightCommand = { weight: number };

type UpdateDayLogWeightDependencies = {
  accountId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  transport: ApiTransport;
};

async function updateAndReconcile(
  dependencies: UpdateDayLogWeightDependencies,
  date: string,
  command: UpdateDayLogWeightCommand,
): Promise<WeightWriteAcknowledgement> {
  const acknowledgement = toWeightWriteAcknowledgement(
    await updateDayLogWeight(dependencies.transport, date, command),
  );
  const { needsSingleDateSync } = await applyWeightAcknowledgement(
    dependencies.queryClient,
    dependencies.accountId,
    date,
    command.weight,
    acknowledgement,
  );
  if (needsSingleDateSync) {
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
  return acknowledgement;
}

export function getUpdateDayLogWeightMutationOptions(
  dependencies: UpdateDayLogWeightDependencies,
  date: string,
) {
  return {
    mutationFn: (command: UpdateDayLogWeightCommand) => updateAndReconcile(dependencies, date, command),
  };
}

export function useUpdateDayLogWeight(
  context: Omit<UpdateDayLogWeightDependencies, "queryClient">,
  date: string,
  options?: Omit<
    UseMutationOptions<WeightWriteAcknowledgement, Error, UpdateDayLogWeightCommand>,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    ...getUpdateDayLogWeightMutationOptions({ ...context, queryClient }, date),
    ...options,
  });
}
