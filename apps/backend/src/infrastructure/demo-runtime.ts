import {
  DEMO_DATABASE_HOST,
  DEMO_DATABASE_NAME,
  DEMO_DATABASE_PORT,
  DEMO_RUNTIME_DEFAULTS,
  LOCAL_RUNTIME_ENV_FILE_NAME,
  localRuntimeConfigurationToProcessEnv,
  readLocalRuntimeConfiguration,
  resolvePostgresRole,
  type LocalRuntimeConfiguration,
  type ResolvePostgresRoleOptions,
} from "@calibrate/local-runtime-config";

import { isDemoRuntime } from "./runtime-environment.js";

export function getBackendListenHost(): string | undefined {
  return isDemoRuntime() ? "127.0.0.1" : undefined;
}

export async function prepareDemoRuntime(
  directory = process.cwd(),
  roleOptions: Omit<ResolvePostgresRoleOptions, "workspaceRoot"> & { workspaceRoot?: string } = {},
): Promise<LocalRuntimeConfiguration> {
  if (!isDemoRuntime()) {
    throw new Error("Local demo mode is not selected");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Local demo mode cannot run in production");
  }

  const configuration = await readLocalRuntimeConfiguration(directory);
  if (!configuration) {
    throw new Error(
      `Local demo configuration is missing. Generate ${LOCAL_RUNTIME_ENV_FILE_NAME} with demo setup before starting the backend.`,
    );
  }

  const role = await resolvePostgresRole({
    workspaceRoot: roleOptions.workspaceRoot ?? directory,
    roleFilePath: roleOptions.roleFilePath,
    readDotenvValue: roleOptions.readDotenvValue,
  });

  const environment = {
    ...localRuntimeConfigurationToProcessEnv(configuration),
    ...DEMO_RUNTIME_DEFAULTS,
    DB_HOST: getSuppliedDemoRuntimeValue("DB_HOST") ?? DEMO_DATABASE_HOST,
    DB_NAME: getSuppliedDemoRuntimeValue("DB_NAME") ?? DEMO_DATABASE_NAME,
    DB_PASSWORD: role.password,
    DB_PORT: getSuppliedDemoRuntimeValue("DB_PORT") ?? DEMO_DATABASE_PORT,
    DB_USER: role.user,
    WEBAUTHN_ORIGIN: getSuppliedDemoRuntimeValue("WEBAUTHN_ORIGIN") ?? "http://localhost:3000",
  };
  for (const [name, value] of Object.entries(environment)) {
    process.env[name] = value;
  }

  return configuration;
}

function getSuppliedDemoRuntimeValue(name: string): string | undefined {
  const value = process.env[name];
  return value && !value.startsWith("encrypted") ? value : undefined;
}
