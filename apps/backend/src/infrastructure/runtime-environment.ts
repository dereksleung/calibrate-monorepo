import dotenvx from "@dotenvx/dotenvx";

export function isE2eRuntime(): boolean {
  return process.env.CALIBRATE_E2E === "1";
}

export function isDemoRuntime(): boolean {
  return process.env.CALIBRATE_DEMO === "1";
}

/**
 * E2E and local demo values are supplied as process environment, never by
 * decrypting a developer's dotenv file. Missing values intentionally remain
 * missing so the consuming configuration validates and rejects an unsafe startup.
 */
export function usesProcessEnvironmentRuntime(): boolean {
  return isE2eRuntime() || isDemoRuntime();
}

/**
 * E2E values are supplied by the isolated runner and must never be replaced by
 * a developer's dotenv file. Missing values intentionally remain missing so
 * the consuming configuration validates and rejects an unsafe startup.
 */
export function getRuntimeEnvironmentValue(name: string): string | undefined {
  return usesProcessEnvironmentRuntime() ? process.env[name] : dotenvx.get(name);
}
