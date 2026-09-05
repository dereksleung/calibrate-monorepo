import {
  LOCAL_RUNTIME_ENV_FILE_NAME,
  localRuntimeConfigurationToProcessEnv,
  readLocalRuntimeConfiguration,
  type LocalRuntimeConfiguration,
} from "@calibrate/local-runtime-config";

import { isDemoRuntime } from "./runtime-environment.js";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

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

  const webAuthnOrigin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
  if (!isLoopbackHttpOrigin(webAuthnOrigin)) {
    throw new Error("Local demo mode requires a loopback HTTP WebAuthn origin");
  }

  const configuration = await readLocalRuntimeConfiguration(directory);
  if (!configuration) {
    throw new Error(
      `Local demo configuration is missing. Generate ${LOCAL_RUNTIME_ENV_FILE_NAME} with demo setup before starting the backend.`,
    );
  }

  const environment = localRuntimeConfigurationToProcessEnv(configuration);
  for (const [name, value] of Object.entries(environment)) {
    process.env[name] = value;
  }

  return configuration;
}

function isLoopbackHttpOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && parsed.protocol === "http:" && LOOPBACK_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}
