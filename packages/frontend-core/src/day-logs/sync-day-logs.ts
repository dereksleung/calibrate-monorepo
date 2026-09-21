import {
  DayLogSyncRequestSchema,
  DayLogSyncResponseSchema,
  type DayLogSyncRequest,
  type DayLogSyncResponse,
} from "@calibrate/api-contracts";
import { z } from "zod";

import type { ApiTransport } from "../transport.js";

export type { DayLogSyncRequest };

const DayLogSyncResultSchema = z.union([DayLogSyncResponseSchema, z.null()]);

export const dayLogSyncQueryKeyPrefix = (accountId: string) => ["dayLogs", accountId, "sync"] as const;

/**
 * Reconciles a bounded, inclusive Day Log date range. `null` represents the
 * protocol's bodyless 204 response: every supplied known slot still matches.
 */
export function syncDayLogs(
  transport: ApiTransport,
  input: DayLogSyncRequest,
): Promise<DayLogSyncResponse | null> {
  const validInput = DayLogSyncRequestSchema.parse(input);

  return transport.request({
    path: "/daylogs:sync",
    method: "POST",
    body: validInput,
    responseBodySchema: DayLogSyncResultSchema,
  });
}
