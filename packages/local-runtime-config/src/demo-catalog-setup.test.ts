import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { PostgresRole } from "./postgres-role.js";

import { runDemoReset, runDemoSetup, type DemoCommand } from "./demo-catalog-setup.js";
import { readLocalRuntimeConfiguration } from "./local-runtime-configuration.js";
import { SHARED_COMPOSE_PROJECT_NAME, type SharedPostgresAdminClient } from "./shared-postgres.js";

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
  const directory = await mkdtemp(path.join(tmpdir(), "calibrate-demo-catalog-"));
  temporaryDirectories.push(directory);
  return directory;
}

function recordCommands(): { commands: DemoCommand[]; runCommand: (command: DemoCommand) => Promise<void> } {
  const commands: DemoCommand[] = [];

  return {
    commands,
    runCommand: async (command) => {
      commands.push(command);
    },
  };
}

function createFakeAdmin(): SharedPostgresAdminClient & {
  queries: Array<{ text: string; values?: unknown[] }>;
} {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  return {
    queries,
    query: async ({ text, values }) => {
      queries.push({ text, values });
      if (text.includes("FROM pg_database")) {
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    },
  };
}

describe("demo catalog workspace tooling", () => {
  it("sets up a Docker-only catalog without .env.keys and preserves state on rerun", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const output: string[] = [];
    const admin = createFakeAdmin();
    const options = {
      resolveRole: async () => role,
      isPortOpen: async () => false,
      connectAdmin: async () => admin,
    };

    const first = await runDemoSetup({
      directory,
      output: (message) => output.push(message),
      runCommand: runner.runCommand,
      ...options,
    });
    const second = await runDemoSetup({
      directory,
      output: (message) => output.push(message),
      runCommand: runner.runCommand,
      ...options,
    });

    await expect(access(path.join(directory, ".env.keys"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(second.configuration).toEqual(first.configuration);
    expect(first.dockerProjectName).toBe(SHARED_COMPOSE_PROJECT_NAME);
    expect(await readLocalRuntimeConfiguration(directory)).toEqual(first.configuration);
    expect(output).toEqual([
      `Demo catalog ready. Data-quality report: ${first.reportPath}`,
      `Demo catalog ready. Data-quality report: ${first.reportPath}`,
    ]);
    expect(runner.commands.filter(({ args }) => args.includes("down"))).toEqual([]);
    expect(admin.queries).toContainEqual({
      text: "SELECT 1 FROM pg_database WHERE datname = $1",
      values: ["calibrate_demo"],
    });
    expect(admin.queries).toContainEqual({
      text: 'CREATE DATABASE "calibrate_demo"',
      values: undefined,
    });
    expect(runner.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "docker",
          args: expect.arrayContaining([
            "compose",
            "--project-name",
            SHARED_COMPOSE_PROJECT_NAME,
            "up",
            "postgres",
          ]),
        }),
        expect.objectContaining({
          command: "npx",
          args: ["nx", "run", "backend:kysely", "migrate:latest"],
          environment: expect.objectContaining({
            CALIBRATE_DEMO: "1",
            DB_HOST: "127.0.0.1",
            DB_NAME: "calibrate_demo",
            DB_PASSWORD: role.password,
            DB_PORT: "5433",
            DB_USER: role.user,
          }),
        }),
        expect.objectContaining({
          command: "npx",
          args: ["nx", "run", "backend:seed-demo-catalog"],
        }),
      ]),
    );
  });

  it("uses an explicit reset to recreate only the demo database while preserving generated configuration", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const admin = createFakeAdmin();
    const options = {
      resolveRole: async () => role,
      isPortOpen: async () => true,
      connectAdmin: async () => admin,
    };
    const setup = await runDemoSetup({ directory, runCommand: runner.runCommand, ...options });

    await runDemoReset({ directory, runCommand: runner.runCommand, ...options });

    expect(await readLocalRuntimeConfiguration(directory)).toEqual(setup.configuration);
    expect(runner.commands.filter(({ args }) => args.includes("down") || args.includes("--volumes"))).toEqual(
      [],
    );
    expect(admin.queries).toContainEqual({
      text: 'DROP DATABASE IF EXISTS "calibrate_demo" WITH (FORCE)',
      values: undefined,
    });
  });
});
