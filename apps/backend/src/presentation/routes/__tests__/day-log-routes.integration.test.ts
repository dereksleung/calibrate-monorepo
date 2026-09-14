import type { IDayLogService } from "@application/services/day-log-service.js";
import type { RequestHandler } from "express";
import type { Server } from "node:http";

import { DayLogRangeResponseSchema } from "@calibrate/api-contracts";
import { DayLog } from "@domain/entities/day-log.js";
import { BusinessLogicError } from "@domain/errors/business-logic-error.js";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { DayLogController } from "../../controllers/day-log-controller.js";
import { createDayLogRoutes } from "../day-log-routes.js";

type TestServerListener = (port: number, host: string, callback: (error?: Error) => void) => Server;

async function startTestServer(listen: TestServerListener): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve, reject) => {
    const server = listen(0, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }

      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Test server did not expose a TCP address after listening"));
        return;
      }

      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

describe("HTTP test server startup", () => {
  it("rejects listener errors instead of treating a failed server as ready", async () => {
    const listen = vi.fn<TestServerListener>((_port, _host, callback) => {
      const server = {} as Server;
      queueMicrotask(() => callback(new Error("listen EPERM: operation not permitted")));
      return server;
    });

    await expect(startTestServer(listen)).rejects.toThrow("listen EPERM: operation not permitted");
  });
});

describe("day-log range HTTP route", () => {
  const getLogsForDateRange = vi.fn();
  const recordWeight = vi.fn();
  const dayLogService = {
    getLogsForDateRange,
    recordWeight,
  } as Pick<IDayLogService, "getLogsForDateRange" | "recordWeight">;
  const authenticationMiddleware: RequestHandler = (req, res, next) => {
    if (req.get("Authorization") !== "Bearer test-access") {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    req.auth = { userId: "user-1" };
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createDayLogRoutes(new DayLogController(dayLogService as IDayLogService), authenticationMiddleware),
  );
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const started = await startTestServer((port, host, callback) => app.listen(port, host, callback));
    server = started.server;
    baseUrl = started.baseUrl;
  });

  beforeEach(() => {
    getLogsForDateRange.mockReset();
    recordWeight.mockReset();
  });

  afterAll(async () => {
    if (!server?.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("rejects an unauthenticated date-range request before controller execution", async () => {
    const response = await fetch(`${baseUrl}/api/v1/daylogs?startDate=2026-08-06&endDate=2026-08-12`);

    expect(response.status).toBe(401);
    expect(getLogsForDateRange).not.toHaveBeenCalled();
  });

  it("uses the authenticated user to return a schema-valid date range", async () => {
    getLogsForDateRange.mockResolvedValue([
      DayLog.reconstitute({
        id: "00000000-0000-0000-0000-000000000000",
        date: Temporal.PlainDate.from("2026-08-12"),
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
        weight: null,
        versionNumber: 1,
      }),
    ]);

    const response = await fetch(`${baseUrl}/api/v1/daylogs?startDate=2026-08-06&endDate=2026-08-12`, {
      headers: { Authorization: "Bearer test-access" },
    });

    expect(response.status).toBe(200);
    expect(getLogsForDateRange).toHaveBeenCalledWith({
      userId: "user-1",
      startDate: "2026-08-06",
      endDate: "2026-08-12",
    });
    expect(DayLogRangeResponseSchema.parse(await response.json())).toEqual({
      startDate: "2026-08-06",
      endDate: "2026-08-12",
      days: [
        { date: "2026-08-06", dayLog: null },
        { date: "2026-08-07", dayLog: null },
        { date: "2026-08-08", dayLog: null },
        { date: "2026-08-09", dayLog: null },
        { date: "2026-08-10", dayLog: null },
        { date: "2026-08-11", dayLog: null },
        {
          date: "2026-08-12",
          dayLog: {
            id: "00000000-0000-0000-0000-000000000000",
            date: "2026-08-12",
            breakfast: [],
            lunch: [],
            dinner: [],
            snacks: [],
            weight: null,
          },
        },
      ],
    });
  });

  it("rejects an unauthenticated weight write before the controller executes", async () => {
    const response = await fetch(`${baseUrl}/api/v1/daylogs/2026-08-12/weight`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: 182.5 }),
    });

    expect(response.status).toBe(401);
    expect(recordWeight).not.toHaveBeenCalled();
  });

  it("updates weight with the authenticated user and returns only the new version", async () => {
    recordWeight.mockResolvedValue({ versionNumber: 2 });

    const response = await fetch(`${baseUrl}/api/v1/daylogs/2026-08-12/weight`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-access",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weight: 182.45, versionNumber: 1 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ versionNumber: 2 });
    expect(recordWeight).toHaveBeenCalledWith({
      userId: "user-1",
      date: "2026-08-12",
      weight: 182.45,
    });
    expect(recordWeight.mock.calls[0]?.[0]).not.toHaveProperty("versionNumber");
  });

  it("creates a Known-empty Day Log and returns its id with version 1", async () => {
    recordWeight.mockResolvedValue({
      versionNumber: 1,
      createdDayLogId: "day-log-weight-1",
    });

    const response = await fetch(`${baseUrl}/api/v1/daylogs/2026-08-13/weight`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-access",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weight: 182.5 }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ versionNumber: 1, createdDayLogId: "day-log-weight-1" });
  });

  it("rejects invalid weight and does not expose a paywall-specific response", async () => {
    recordWeight.mockRejectedValue(
      new BusinessLogicError("User has reached the maximum number of day logs before subscribing"),
    );

    const response = await fetch(`${baseUrl}/api/v1/daylogs/2026-08-13/weight`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-access",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weight: 1000 }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Validation failed", details: expect.any(Array) });
    expect(recordWeight).not.toHaveBeenCalled();
  });

  it("rejects a malformed calendar date before calling the service", async () => {
    const response = await fetch(`${baseUrl}/api/v1/daylogs/not-a-date/weight`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-access",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weight: 182.5 }),
    });

    expect(response.status).toBe(400);
    expect(recordWeight).not.toHaveBeenCalled();
  });

  it("returns an ordinary failed write when the service rejects a create at the cap", async () => {
    recordWeight.mockRejectedValue(
      new BusinessLogicError("User has reached the maximum number of day logs before subscribing"),
    );

    const response = await fetch(`${baseUrl}/api/v1/daylogs/2026-08-13/weight`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-access",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weight: 182.5 }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "User has reached the maximum number of day logs before subscribing",
    });
  });
});
