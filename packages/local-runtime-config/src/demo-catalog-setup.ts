import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

import {
  ensureLocalRuntimeConfiguration,
  type LocalRuntimeConfiguration,
} from "./local-runtime-configuration.js";

export const DEMO_DATABASE_HOST = "127.0.0.1";
export const DEMO_DATABASE_NAME = "calibrate_demo";
export const DEMO_DATABASE_PORT = "5433";
export const DEMO_DATABASE_USER = "calibrate_demo";

export type DemoCommand = {
  command: string;
  args: string[];
  cwd: string;
  environment: NodeJS.ProcessEnv;
};

export type DemoCommandRunner = (command: DemoCommand) => Promise<void>;

export type DemoSetupOptions = {
  directory: string;
  output?: (message: string) => void;
  runCommand?: DemoCommandRunner;
};

export type DemoSetupResult = {
  configuration: LocalRuntimeConfiguration;
  databaseName: string;
  dockerProjectName: string;
  reportPath: string;
};

export function getDemoDockerProjectName(directory: string): string {
  const directoryHash = createHash("sha256").update(path.resolve(directory)).digest("hex").slice(0, 12);
  return `calibrate-demo-${directoryHash}`;
}

export async function runDemoSetup({
  directory,
  output = console.log,
  runCommand = runProcess,
}: DemoSetupOptions): Promise<DemoSetupResult> {
  const configuration = await ensureLocalRuntimeConfiguration(directory);
  const dockerProjectName = getDemoDockerProjectName(directory);
  const environment = createDemoEnvironment(configuration);

  await runCommand({
    command: "docker",
    args: ["compose", "--project-name", dockerProjectName, "up", "--detach", "--wait", "postgres"],
    cwd: directory,
    environment,
  });
  await runCommand({
    command: "npx",
    args: ["nx", "run", "backend:kysely", "migrate:latest"],
    cwd: directory,
    environment,
  });
  await runCommand({
    command: "npx",
    args: ["nx", "run", "backend:seed-demo-catalog"],
    cwd: directory,
    environment,
  });

  const reportPath = path.join(directory, ".demo", "catalog-seed-report.json");
  output(`Demo catalog ready. Data-quality report: ${reportPath}`);

  return { configuration, databaseName: DEMO_DATABASE_NAME, dockerProjectName, reportPath };
}

export async function runDemoReset({
  directory,
  output = console.log,
  runCommand = runProcess,
}: DemoSetupOptions): Promise<DemoSetupResult> {
  const configuration = await ensureLocalRuntimeConfiguration(directory);
  const dockerProjectName = getDemoDockerProjectName(directory);

  await runCommand({
    command: "docker",
    args: ["compose", "--project-name", dockerProjectName, "down", "--volumes"],
    cwd: directory,
    environment: createDemoEnvironment(configuration),
  });

  return runDemoSetup({ directory, output, runCommand });
}

function createDemoEnvironment(configuration: LocalRuntimeConfiguration): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CALIBRATE_DEMO: "1",
    DB_HOST: DEMO_DATABASE_HOST,
    DB_NAME: DEMO_DATABASE_NAME,
    DB_PASSWORD: configuration.otpHmacKey,
    DB_PORT: DEMO_DATABASE_PORT,
    DB_USER: DEMO_DATABASE_USER,
  };
}

async function runProcess({ command, args, cwd, environment }: DemoCommand): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: environment, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${exitCode ?? "unknown"}`));
      }
    });
  });
}
