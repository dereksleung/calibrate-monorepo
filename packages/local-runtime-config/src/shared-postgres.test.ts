import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { PostgresRole } from "./postgres-role.js";

import {
  createDatabaseIfMissing,
  createSharedPostgresComposeEnvironment,
  dropDatabaseIfExists,
  ensureCalibrateSharedPostgres,
  isPostgresDuplicateDatabaseError,
  SHARED_BOOTSTRAP_DATABASE,
  SHARED_COMPOSE_PROJECT_NAME,
  SHARED_DATABASE_HOST,
  SHARED_DATABASE_PORT,
  type SharedPostgresAdminClient,
  type SharedPostgresCommand,
} from "./shared-postgres.js";

const temporaryDirectories: string[] = [];
const role: PostgresRole = {
  user: "calibrate",
  password: "machine-local-password",
  source: "machine-local",
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "calibrate-shared-postgres-"));
  temporaryDirectories.push(directory);
  return directory;
}

function recordCommands(): {
  commands: SharedPostgresCommand[];
  runCommand: (command: SharedPostgresCommand) => Promise<void>;
} {
  const commands: SharedPostgresCommand[] = [];
  return {
    commands,
    runCommand: async (command) => {
      commands.push(command);
    },
  };
}

function createFakeAdmin(existingDatabases: string[] = []): SharedPostgresAdminClient & {
  queries: Array<{ text: string; values?: unknown[] }>;
} {
  const existing = new Set(existingDatabases);
  const queries: Array<{ text: string; values?: unknown[] }> = [];

  return {
    queries,
    query: async ({ text, values }) => {
      queries.push({ text, values });
      if (text === "SELECT 1") {
        return { rowCount: 1, rows: [{ "?column?": 1 }] };
      }
      if (text.includes("FROM pg_database")) {
        const databaseName = String(values?.[0] ?? "");
        return existing.has(databaseName)
          ? { rowCount: 1, rows: [{ "?column?": 1 }] }
          : { rowCount: 0, rows: [] };
      }
      if (text.startsWith("CREATE DATABASE") || text.startsWith("DROP DATABASE")) {
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected query: ${text}`);
    },
  };
}

describe("ensureCalibrateSharedPostgres", () => {
  it("starts calibrate-shared Postgres with the resolved role when the port is closed", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const admin = createFakeAdmin();

    await ensureCalibrateSharedPostgres({
      directory,
      role,
      runCommand: runner.runCommand,
      isPortOpen: async () => false,
      connectAdmin: async () => admin,
    });

    expect(runner.commands).toEqual([
      expect.objectContaining({
        command: "docker",
        cwd: directory,
        args: [
          "compose",
          "--project-name",
          SHARED_COMPOSE_PROJECT_NAME,
          "up",
          "--detach",
          "--wait",
          "postgres",
        ],
        environment: expect.objectContaining({
          COMPOSE_PROJECT_NAME: SHARED_COMPOSE_PROJECT_NAME,
          DB_USER: role.user,
          DB_PASSWORD: role.password,
        }),
      }),
    ]);
    expect(admin.queries).toContainEqual({ text: "SELECT 1", values: undefined });
  });

  it("skips compose up when 127.0.0.1:5433 is already accepting connections", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const probedHosts: Array<{ host: string; port: number }> = [];

    await ensureCalibrateSharedPostgres({
      directory,
      role,
      runCommand: runner.runCommand,
      isPortOpen: async (host, port) => {
        probedHosts.push({ host, port });
        return true;
      },
      connectAdmin: async () => createFakeAdmin(),
    });

    expect(runner.commands).toEqual([]);
    expect(probedHosts).toEqual([{ host: SHARED_DATABASE_HOST, port: SHARED_DATABASE_PORT }]);
  });
});

describe("createDatabaseIfMissing", () => {
  it("creates the database when it is absent", async () => {
    const admin = createFakeAdmin();

    await createDatabaseIfMissing("calibrate_demo", {
      role,
      connectAdmin: async () => admin,
    });

    expect(admin.queries).toEqual([
      { text: "SELECT 1 FROM pg_database WHERE datname = $1", values: ["calibrate_demo"] },
      { text: 'CREATE DATABASE "calibrate_demo"', values: undefined },
    ]);
  });

  it("does not create the database when it already exists", async () => {
    const admin = createFakeAdmin(["calibrate_demo"]);

    await createDatabaseIfMissing("calibrate_demo", {
      role,
      connectAdmin: async () => admin,
    });

    expect(admin.queries).toEqual([
      { text: "SELECT 1 FROM pg_database WHERE datname = $1", values: ["calibrate_demo"] },
    ]);
  });

  it("recognizes PostgreSQL duplicate-database errors", () => {
    expect(isPostgresDuplicateDatabaseError(Object.assign(new Error("duplicate"), { code: "42P04" }))).toBe(
      true,
    );
    expect(isPostgresDuplicateDatabaseError(Object.assign(new Error("other"), { code: "23505" }))).toBe(
      false,
    );
  });
});

describe("dropDatabaseIfExists", () => {
  it("drops the named database through the bootstrap database", async () => {
    const admin = createFakeAdmin();
    const databases: string[] = [];

    await dropDatabaseIfExists("calibrate_demo", {
      role,
      connectAdmin: async (_role, database = SHARED_BOOTSTRAP_DATABASE) => {
        databases.push(database);
        return admin;
      },
    });

    expect(databases).toEqual([SHARED_BOOTSTRAP_DATABASE]);
    expect(admin.queries).toEqual([
      { text: 'DROP DATABASE IF EXISTS "calibrate_demo" WITH (FORCE)', values: undefined },
    ]);
  });
});

describe("createSharedPostgresComposeEnvironment", () => {
  it("injects the resolved role so Compose interpolation does not need dotenvx", () => {
    const environment = createSharedPostgresComposeEnvironment(role, {
      DB_USER: "encrypted:developer-user",
      DB_PASSWORD: "encrypted:developer-password",
    });

    expect(environment.DB_USER).toBe(role.user);
    expect(environment.DB_PASSWORD).toBe(role.password);
    expect(environment.COMPOSE_PROJECT_NAME).toBe(SHARED_COMPOSE_PROJECT_NAME);
  });
});
