import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { type DemoCommand } from "./demo-catalog-setup.js";
import {
  DEMO_FRONTEND_URL,
  DEMO_SETUP_REQUIRED_MESSAGE,
  runDemoDev,
  type DemoDevProcessStarter,
} from "./local-demo-dev.js";
import {
  generateLocalRuntimeConfiguration,
  writeLocalRuntimeConfiguration,
} from "./local-runtime-configuration.js";

const originalEnvironment = { ...process.env };
const temporaryDirectories: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnvironment };
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "calibrate-demo-dev-"));
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

function recordProcesses(): {
  processes: DemoCommand[];
  startProcesses: DemoDevProcessStarter;
} {
  const processes: DemoCommand[] = [];

  return {
    processes,
    startProcesses: async (started) => {
      processes.push(...started);
    },
  };
}

describe("demo-dev launch configuration", () => {
  it("fails with an actionable setup message when generated configuration is missing", async () => {
    const directory = await createTemporaryDirectory();
    const runner = recordCommands();
    const processes = recordProcesses();
    let started = false;

    await expect(
      runDemoDev({
        directory,
        runCommand: runner.runCommand,
        startProcesses: async (startedProcesses) => {
          started = true;
          await processes.startProcesses(startedProcesses);
        },
      }),
    ).rejects.toThrow(DEMO_SETUP_REQUIRED_MESSAGE);

    expect(started).toBe(false);
    expect(runner.commands).toEqual([]);
    await expect(access(path.join(directory, ".env.keys"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("starts the frontend and backend together from generated demo configuration", async () => {
    const directory = await createTemporaryDirectory();
    const generated = generateLocalRuntimeConfiguration();
    await writeLocalRuntimeConfiguration(directory, generated);
    const runner = recordCommands();
    const processes = recordProcesses();
    const output: string[] = [];

    await runDemoDev({
      directory,
      output: (message) => output.push(message),
      runCommand: runner.runCommand,
      startProcesses: processes.startProcesses,
    });

    await expect(access(path.join(directory, ".env.keys"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(output[0]).toContain(DEMO_FRONTEND_URL);
    expect(runner.commands).toEqual([
      expect.objectContaining({
        command: "docker",
        args: expect.arrayContaining(["compose", "up", "postgres"]),
      }),
    ]);
    expect(processes.processes).toEqual([
      expect.objectContaining({
        command: "npx",
        args: ["nx", "run", "backend:demo"],
        environment: expect.objectContaining({
          CALIBRATE_DEMO: "1",
          CORS_ORIGIN: "http://localhost:3000",
          DB_HOST: "127.0.0.1",
          DB_NAME: "calibrate_demo",
          DB_PASSWORD: generated.otpHmacKey,
          DB_PORT: "5433",
          EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT: "1000",
          PORT: "3001",
          TRUST_PROXY_HOPS: "0",
          VITE_API_BASE_URL: "http://localhost:3001/api/v1",
          WEBAUTHN_ORIGIN: "http://localhost:3000",
        }),
      }),
      expect.objectContaining({
        command: "npx",
        args: ["nx", "run", "web:dev"],
        environment: expect.objectContaining({
          VITE_API_BASE_URL: "http://localhost:3001/api/v1",
        }),
      }),
    ]);
  });

  it("fails with an actionable Docker message when Compose cannot start PostgreSQL", async () => {
    const directory = await createTemporaryDirectory();
    await writeLocalRuntimeConfiguration(directory, generateLocalRuntimeConfiguration());
    let started = false;

    await expect(
      runDemoDev({
        directory,
        runCommand: async () => {
          throw new Error("docker: command not found");
        },
        startProcesses: async () => {
          started = true;
        },
      }),
    ).rejects.toThrow(/Docker Desktop/);

    expect(started).toBe(false);
  });

  it("overrides inherited dotenv ciphertext so backend numeric limits stay valid", async () => {
    const directory = await createTemporaryDirectory();
    await writeLocalRuntimeConfiguration(directory, generateLocalRuntimeConfiguration());
    process.env.EMAIL_SERVICE_CREDENTIAL = "encrypted:developer-credential";
    process.env.EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT = "encrypted:not-an-integer";
    process.env.TRUST_PROXY_HOPS = "encrypted:not-an-integer";
    const runner = recordCommands();
    const processes = recordProcesses();

    await runDemoDev({
      directory,
      output: () => undefined,
      runCommand: runner.runCommand,
      startProcesses: processes.startProcesses,
    });

    const backendEnvironment = processes.processes[0]?.environment;
    const hourlyLimit = Number(backendEnvironment?.EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT);
    const trustProxyHops = Number(backendEnvironment?.TRUST_PROXY_HOPS);

    expect(Number.isInteger(hourlyLimit) && hourlyLimit >= 1).toBe(true);
    expect(Number.isInteger(trustProxyHops) && trustProxyHops >= 0).toBe(true);
    expect(backendEnvironment?.EMAIL_SERVICE_CREDENTIAL).toBe("");
  });
});
