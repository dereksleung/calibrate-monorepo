import {
  DEMO_DATABASE_HOST,
  DEMO_DATABASE_NAME,
  DEMO_DATABASE_PORT,
  DEMO_DATABASE_USER,
  DEMO_RUNTIME_DEFAULTS,
  LOCAL_RUNTIME_ENV_FILE_NAME,
  localRuntimeConfigurationToProcessEnv,
  readLocalRuntimeConfiguration,
  type LocalRuntimeConfiguration,
} from "@calibrate/local-runtime-config";

import { isDemoRuntime } from "./runtime-environment.js";

export function getBackendListenHost(): string | undefined {
  return isDemoRuntime() ? "127.0.0.1" : undefined;
}

export async function prepareDemoRuntime(directory = process.cwd()): Promise<LocalRuntimeConfiguration> {
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

  const environment = {
    ...localRuntimeConfigurationToProcessEnv(configuration),
    ...DEMO_RUNTIME_DEFAULTS,
    DB_HOST: DEMO_DATABASE_HOST,
    DB_NAME: DEMO_DATABASE_NAME,
    DB_PASSWORD: configuration.otpHmacKey,
    DB_PORT: DEMO_DATABASE_PORT,
    DB_USER: DEMO_DATABASE_USER,
    EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT: "1000",
    TRUST_PROXY_HOPS: "0",
    WEBAUTHN_ORIGIN: "http://localhost:3000",
  };
  for (const [name, value] of Object.entries(environment)) {
    process.env[name] = value;
  }

  return configuration;
}
