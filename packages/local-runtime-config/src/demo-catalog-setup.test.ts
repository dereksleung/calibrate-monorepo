import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runDemoReset, runDemoSetup, type DemoCommand } from "./demo-catalog-setup.js";
import { readLocalRuntimeConfiguration } from "./local-runtime-configuration.js";

const temporaryDirectories: string[] = [];

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

describe("demo catalog workspace tooling", () => {
  it("sets up a Docker-only catalog without .env.keys and preserves state on rerun", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const output: string[] = [];

    const first = await runDemoSetup({
      directory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => false,
      output: (message) => output.push(message),
      runCommand: runner.runCommand,
    });
    const second = await runDemoSetup({
      directory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => false,
      output: (message) => output.push(message),
      runCommand: runner.runCommand,
    });

    await expect(access(path.join(directory, ".env.keys"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(second).toEqual(first);
    expect(await readLocalRuntimeConfiguration(directory)).toEqual(first.configuration);
    expect(output).toEqual([
      `Demo catalog ready. Data-quality report: ${first.reportPath}`,
      `Demo catalog ready. Data-quality report: ${first.reportPath}`,
    ]);
    expect(runner.commands.filter(({ args }) => args.includes("down"))).toEqual([]);
    expect(runner.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "docker",
          args: expect.arrayContaining(["compose", "up", "postgres"]),
        }),
        expect.objectContaining({
          command: "npx",
          args: ["nx", "run", "backend:kysely", "migrate:latest"],
          environment: expect.objectContaining({
            CALIBRATE_DEMO: "1",
            DB_HOST: "127.0.0.1",
            DB_PORT: "5433",
          }),
        }),
        expect.objectContaining({
          command: "npx",
          args: ["nx", "run", "backend:seed-demo-catalog"],
        }),
      ]),
    );
  });

  it("uses an explicit reset to recreate Docker state while preserving generated configuration", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const setup = await runDemoSetup({
      directory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => false,
      runCommand: runner.runCommand,
    });

    await runDemoReset({
      directory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => false,
      runCommand: runner.runCommand,
    });

    expect(await readLocalRuntimeConfiguration(directory)).toEqual(setup.configuration);
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        command: "docker",
        args: expect.arrayContaining(["compose", "down", "--volumes"]),
      }),
    );
  });

  it("uses a checkout-owned demo database on an existing shared Postgres", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const otherDirectory = await createTemporaryDirectory();
    const otherRunner = recordCommands();

    const setup = await runDemoSetup({
      directory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => true,
      runCommand: runner.runCommand,
    });
    await runDemoSetup({
      directory: otherDirectory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => true,
      runCommand: otherRunner.runCommand,
    });

    expect(setup.databaseName).toMatch(/^calibrate-[a-f0-9]{12}-demo$/);
    expect(runner.commands.some(({ args }) => args.includes("up"))).toBe(false);
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        command: "docker",
        args: expect.arrayContaining(["--project-name", "calibrate-shared", "exec", "postgres"]),
      }),
    );
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        command: "npx",
        args: ["nx", "run", "backend:kysely", "migrate:latest"],
        environment: expect.objectContaining({
          DB_NAME: setup.databaseName,
          DB_USER: expect.stringMatching(/^calibrate_demo_[a-f0-9]{12}$/),
        }),
      }),
    );
    const databaseUser = runner.commands.find(({ args }) => args.includes("backend:kysely"))?.environment.DB_USER;
    const otherDatabaseUser = otherRunner.commands.find(({ args }) => args.includes("backend:kysely"))?.environment
      .DB_USER;
    expect(otherDatabaseUser).not.toBe(databaseUser);
  });

  it("resets only the checkout-owned database on shared Postgres", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();

    const setup = await runDemoReset({
      directory,
      isDemoPostgresRunning: async () => false,
      isSharedPostgresRunning: async () => true,
      runCommand: runner.runCommand,
    });

    expect(runner.commands.some(({ args }) => args.includes("down"))).toBe(false);
    expect(
      runner.commands.some(
        ({ args, command }) =>
          command === "docker" &&
          args.includes("calibrate-shared") &&
          args.at(-1) === 'dropdb --if-exists --username "$POSTGRES_USER" "$DEMO_DATABASE_NAME"',
      ),
    ).toBe(true);
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        command: "npx",
        args: ["nx", "run", "backend:seed-demo-catalog"],
        environment: expect.objectContaining({ DB_NAME: setup.databaseName }),
      }),
    );
  });

  it("reuses this checkout's running demo Postgres before the shared service", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();

    await runDemoSetup({
      directory,
      isDemoPostgresRunning: async () => true,
      isSharedPostgresRunning: async () => true,
      runCommand: runner.runCommand,
    });

    expect(runner.commands.some(({ args }) => args.includes("up"))).toBe(false);
    expect(runner.commands.some(({ args }) => args.includes("calibrate-shared"))).toBe(false);
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        command: "npx",
        args: ["nx", "run", "backend:seed-demo-catalog"],
      }),
    );
  });
});
