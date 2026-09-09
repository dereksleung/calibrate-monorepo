import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { connect } from "node:net";
import path from "node:path";

import {
  ensureLocalRuntimeConfiguration,
  type LocalRuntimeConfiguration,
} from "./local-runtime-configuration.js";

export const DEMO_DATABASE_HOST = "127.0.0.1";
export const DEMO_DATABASE_PORT = "5433";
const SHARED_POSTGRES_PROJECT_NAME = "calibrate-shared";

export type DemoCommand = {
  command: string;
  args: string[];
  cwd: string;
  environment: NodeJS.ProcessEnv;
};

export type DemoCommandRunner = (command: DemoCommand) => Promise<void>;

export type DemoSetupOptions = {
  directory: string;
  isDemoPostgresRunning?: (directory: string, dockerProjectName: string) => Promise<boolean>;
  isSharedPostgresRunning?: () => Promise<boolean>;
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
  return `calibrate-demo-${getDemoDirectoryHash(directory)}`;
}

function getDemoDatabaseName(directory: string): string {
  return `calibrate-${getDemoDirectoryHash(directory)}-demo`;
}

function getDemoDatabaseUser(directory: string): string {
  return `calibrate_demo_${getDemoDirectoryHash(directory)}`;
}

function getDemoDirectoryHash(directory: string): string {
  return createHash("sha256").update(path.resolve(directory)).digest("hex").slice(0, 12);
}

export async function runDemoSetup({
  directory,
  isDemoPostgresRunning = isCheckoutDemoPostgresRunning,
  isSharedPostgresRunning = isPostgresRunning,
  output = console.log,
  runCommand = runProcess,
}: DemoSetupOptions): Promise<DemoSetupResult> {
  const configuration = await ensureLocalRuntimeConfiguration(directory);
  const databaseName = getDemoDatabaseName(directory);
  const databaseUser = getDemoDatabaseUser(directory);
  const dockerProjectName = getDemoDockerProjectName(directory);
  const environment = createDemoEnvironment(configuration, databaseName, databaseUser);

  if (!(await isDemoPostgresRunning(directory, dockerProjectName))) {
    if (await isSharedPostgresRunning()) {
      await ensureSharedDemoDatabase({ directory, environment, runCommand });
    } else {
      await runCommand({
        command: "docker",
        args: ["compose", "--project-name", dockerProjectName, "up", "--detach", "--wait", "postgres"],
        cwd: directory,
        environment,
      });
    }
  }

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

  return { configuration, databaseName, dockerProjectName, reportPath };
}

export async function runDemoReset({
  directory,
  isDemoPostgresRunning = isCheckoutDemoPostgresRunning,
  isSharedPostgresRunning = isPostgresRunning,
  output = console.log,
  runCommand = runProcess,
}: DemoSetupOptions): Promise<DemoSetupResult> {
  const configuration = await ensureLocalRuntimeConfiguration(directory);
  const databaseName = getDemoDatabaseName(directory);
  const databaseUser = getDemoDatabaseUser(directory);
  const dockerProjectName = getDemoDockerProjectName(directory);
  const environment = createDemoEnvironment(configuration, databaseName, databaseUser);

  if (await isDemoPostgresRunning(directory, dockerProjectName)) {
    await runCommand({
      command: "docker",
      args: ["compose", "--project-name", dockerProjectName, "down", "--volumes"],
      cwd: directory,
      environment,
    });
  } else if (await isSharedPostgresRunning()) {
    await resetSharedDemoDatabase({ directory, environment, runCommand });
  } else {
    await runCommand({
      command: "docker",
      args: ["compose", "--project-name", dockerProjectName, "down", "--volumes"],
      cwd: directory,
      environment,
    });
  }

  return runDemoSetup({
    directory,
    isDemoPostgresRunning,
    isSharedPostgresRunning,
    output,
    runCommand,
  });
}

function createDemoEnvironment(
  configuration: LocalRuntimeConfiguration,
  databaseName: string,
  databaseUser: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CALIBRATE_DEMO: "1",
    DB_HOST: DEMO_DATABASE_HOST,
    DB_NAME: databaseName,
    DB_PASSWORD: configuration.otpHmacKey,
    DB_PORT: DEMO_DATABASE_PORT,
    DB_USER: databaseUser,
    DEMO_DATABASE_NAME: databaseName,
    DEMO_DATABASE_PASSWORD: configuration.otpHmacKey,
    DEMO_DATABASE_USER: databaseUser,
  };
}

type SharedDemoDatabaseCommand = {
  directory: string;
  environment: NodeJS.ProcessEnv;
  runCommand: DemoCommandRunner;
};

async function ensureSharedDemoDatabase({ directory, environment, runCommand }: SharedDemoDatabaseCommand): Promise<void> {
  await runCommand({
    command: "docker",
    args: [
      "compose",
      "--project-name",
      SHARED_POSTGRES_PROJECT_NAME,
      "exec",
      "--no-tty",
      "--env",
      "DEMO_DATABASE_NAME",
      "--env",
      "DEMO_DATABASE_PASSWORD",
      "--env",
      "DEMO_DATABASE_USER",
      "postgres",
      "sh",
      "-ec",
      [
        'if psql --username "$POSTGRES_USER" --dbname postgres --tuples-only --no-align --set=demo_user="$DEMO_DATABASE_USER" --command "SELECT 1 FROM pg_roles WHERE rolname = :\'demo_user\'" | grep -qx 1; then',
        '  psql --username "$POSTGRES_USER" --dbname postgres --set=ON_ERROR_STOP=1 --set=demo_password="$DEMO_DATABASE_PASSWORD" --set=demo_user="$DEMO_DATABASE_USER" --command "ALTER ROLE :\"demo_user\" LOGIN PASSWORD :\'demo_password\'";',
        "else",
        '  psql --username "$POSTGRES_USER" --dbname postgres --set=ON_ERROR_STOP=1 --set=demo_password="$DEMO_DATABASE_PASSWORD" --set=demo_user="$DEMO_DATABASE_USER" --command "CREATE ROLE :\"demo_user\" LOGIN PASSWORD :\'demo_password\'";',
        "fi",
        'if ! psql --username "$POSTGRES_USER" --dbname postgres --tuples-only --no-align --set=demo_database="$DEMO_DATABASE_NAME" --command "SELECT 1 FROM pg_database WHERE datname = :\'demo_database\'" | grep -qx 1; then',
        '  createdb --username "$POSTGRES_USER" --owner "$DEMO_DATABASE_USER" "$DEMO_DATABASE_NAME";',
        "fi",
      ].join("\n"),
    ],
    cwd: directory,
    environment,
  });
}

async function resetSharedDemoDatabase({ directory, environment, runCommand }: SharedDemoDatabaseCommand): Promise<void> {
  await runCommand({
    command: "docker",
    args: [
      "compose",
      "--project-name",
      SHARED_POSTGRES_PROJECT_NAME,
      "exec",
      "--no-tty",
      "--env",
      "DEMO_DATABASE_NAME",
      "postgres",
      "sh",
      "-ec",
      'dropdb --if-exists --username "$POSTGRES_USER" "$DEMO_DATABASE_NAME"',
    ],
    cwd: directory,
    environment,
  });
}

function isPostgresRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: DEMO_DATABASE_HOST, port: Number(DEMO_DATABASE_PORT) });
    const finish = (isRunning: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isRunning);
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function isCheckoutDemoPostgresRunning(directory: string, dockerProjectName: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      "docker",
      ["compose", "--project-name", dockerProjectName, "ps", "--status", "running", "--services"],
      { cwd: directory },
      (error, stdout) => resolve(!error && stdout.split(/\r?\n/).includes("postgres")),
    );
  });
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
