import { spawn } from "node:child_process";
import path from "node:path";

import {
  ensureLocalRuntimeConfiguration,
  localRuntimeConfigurationToProcessEnv,
  type LocalRuntimeConfiguration,
} from "./local-runtime-configuration.js";
import { resolvePostgresRole, type PostgresRole } from "./postgres-role.js";
import {
  createDatabaseIfMissing,
  dropDatabaseIfExists,
  ensureCalibrateSharedPostgres,
  SHARED_COMPOSE_PROJECT_NAME,
  type ConnectSharedPostgresAdmin,
} from "./shared-postgres.js";

export const DEMO_DATABASE_HOST = "127.0.0.1";
export const DEMO_DATABASE_NAME = "calibrate_demo";
export const DEMO_DATABASE_PORT = "5433";
export const DEMO_FRONTEND_ORIGIN = "http://localhost:3000";
export const DEMO_BACKEND_ORIGIN = "http://localhost:3001";
export const DEMO_VITE_API_BASE_URL = "/api/v1";
export const DEMO_BACKEND_PORT = "3001";
export const DEMO_RUNTIME_DEFAULTS = {
  EMAIL_SERVICE_CREDENTIAL: "",
  EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT: "1000",
  FOODDATA_CENTRAL_API_KEY: "",
  TRUST_PROXY_HOPS: "0",
  WEBAUTHN_RP_ID: "localhost",
} as const;

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
  resolveRole?: () => Promise<PostgresRole>;
  isPortOpen?: (host: string, port: number) => Promise<boolean>;
  connectAdmin?: ConnectSharedPostgresAdmin;
};

export type DemoSetupResult = {
  configuration: LocalRuntimeConfiguration;
  databaseName: string;
  dockerProjectName: string;
  reportPath: string;
  role: PostgresRole;
};

export async function runDemoSetup({
  directory,
  output = console.log,
  runCommand = runDemoCommand,
  resolveRole,
  isPortOpen,
  connectAdmin,
}: DemoSetupOptions): Promise<DemoSetupResult> {
  const configuration = await ensureLocalRuntimeConfiguration(directory);
  const role = await (resolveRole ?? (() => resolvePostgresRole({ workspaceRoot: directory })))();
  const environment = createDemoEnvironment(configuration, role);

  await ensureCalibrateSharedPostgres({
    directory,
    role,
    runCommand,
    isPortOpen,
    connectAdmin,
    environment,
  });
  await createDatabaseIfMissing(DEMO_DATABASE_NAME, { role, connectAdmin });
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

  return {
    configuration,
    databaseName: DEMO_DATABASE_NAME,
    dockerProjectName: SHARED_COMPOSE_PROJECT_NAME,
    reportPath,
    role,
  };
}

export async function runDemoReset({
  directory,
  output = console.log,
  runCommand = runDemoCommand,
  resolveRole,
  isPortOpen,
  connectAdmin,
}: DemoSetupOptions): Promise<DemoSetupResult> {
  const configuration = await ensureLocalRuntimeConfiguration(directory);
  const role = await (resolveRole ?? (() => resolvePostgresRole({ workspaceRoot: directory })))();

  await ensureCalibrateSharedPostgres({
    directory,
    role,
    runCommand,
    isPortOpen,
    connectAdmin,
    environment: createDemoEnvironment(configuration, role),
  });
  await dropDatabaseIfExists(DEMO_DATABASE_NAME, { role, connectAdmin });

  return runDemoSetup({
    directory,
    output,
    runCommand,
    resolveRole: async () => role,
    isPortOpen,
    connectAdmin,
  });
}

export function createDemoEnvironment(
  configuration: LocalRuntimeConfiguration,
  role: PostgresRole,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...localRuntimeConfigurationToProcessEnv(configuration),
    ...DEMO_RUNTIME_DEFAULTS,
    CALIBRATE_DEMO: "1",
    CORS_ORIGIN: DEMO_FRONTEND_ORIGIN,
    DB_HOST: DEMO_DATABASE_HOST,
    DB_NAME: DEMO_DATABASE_NAME,
    DB_PASSWORD: role.password,
    DB_PORT: DEMO_DATABASE_PORT,
    DB_USER: role.user,
    PORT: DEMO_BACKEND_PORT,
    API_PROXY_TARGET: DEMO_BACKEND_ORIGIN,
    VITE_API_BASE_URL: DEMO_VITE_API_BASE_URL,
    WEBAUTHN_ORIGIN: DEMO_FRONTEND_ORIGIN,
  };
}

export async function runDemoCommand({ command, args, cwd, environment }: DemoCommand): Promise<void> {
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
