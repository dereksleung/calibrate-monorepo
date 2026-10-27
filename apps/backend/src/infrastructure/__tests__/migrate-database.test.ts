import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "../persistence/database-client.js";

const mocks = vi.hoisted(() => ({ migrateToLatest: vi.fn() }));

vi.mock("kysely", async (importOriginal) => ({
  ...(await importOriginal<typeof import("kysely")>()),
  Migrator: class {
    migrateToLatest = mocks.migrateToLatest;
  },
}));

import { migrateDatabase } from "../persistence/migrate-database.js";

let database: DatabaseClient;
let destroy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  destroy = vi.fn().mockResolvedValue(undefined);
  database = { destroy } as unknown as DatabaseClient;
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("migration runner", () => {
  it("reports applied migrations and closes the database pool", async () => {
    mocks.migrateToLatest.mockResolvedValue({
      results: [{ migrationName: "001_create_users", status: "Success", direction: "Up" }],
    });

    await migrateDatabase(database, "/release/migrations");

    expect(console.info).toHaveBeenCalledWith("Database migration", {
      migration: "001_create_users",
      status: "Success",
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("completes successfully when no migrations are pending", async () => {
    mocks.migrateToLatest.mockResolvedValue({ results: [] });

    await expect(migrateDatabase(database, "/release/migrations")).resolves.toBeUndefined();

    expect(console.info).toHaveBeenCalledWith("Database migrations are up to date");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("propagates migration failure, reports its name without SQL details, and closes the pool", async () => {
    const error = new Error("SQL containing a sensitive value");
    mocks.migrateToLatest.mockResolvedValue({
      error,
      results: [{ migrationName: "002_add_sessions", status: "Error", direction: "Up" }],
    });

    await expect(migrateDatabase(database, "/release/migrations")).rejects.toBe(error);

    expect(console.info).toHaveBeenCalledWith("Database migration", {
      migration: "002_add_sessions",
      status: "Error",
    });
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(error.message);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("closes the pool when migration execution unexpectedly rejects", async () => {
    const error = new Error("Connection lost");
    mocks.migrateToLatest.mockRejectedValue(error);

    await expect(migrateDatabase(database, "/release/migrations")).rejects.toBe(error);

    expect(destroy).toHaveBeenCalledOnce();
  });
});
