import { createPrivateKey } from "node:crypto";
import { z } from "zod";

let values: Readonly<Record<string, string>> | undefined;

const nonempty = z.string().refine((value) => value.trim().length > 0);

function integerString(minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  return z.string().refine((value) => {
    const number = Number(value);
    return /^\d+$/.test(value) && Number.isSafeInteger(number) && number >= minimum && number <= maximum;
  });
}

const runtimeConfigurationSchema = z
  .object({
    DB_HOST: nonempty,
    DB_NAME: nonempty,
    DB_USER: nonempty,
    DB_PASSWORD: nonempty,
    DB_PORT: integerString(1, 65535).optional(),
    PORT: integerString(1, 65535).optional(),
    OTP_HMAC_KEY: nonempty.refine((value) => {
      const bytes = Buffer.from(value, "base64url");
      return (
        bytes.length >= 32 &&
        bytes.toString("base64url") === value.replace(/=+$/, "") &&
        /^[A-Za-z0-9_-]+={0,2}$/.test(value)
      );
    }),
    OTP_HMAC_CURRENT_KEY_VERSION: integerString(1).optional(),
    EMAIL_REQUEST_IP_HMAC_KEY: nonempty.refine((value) => /^(?:[\da-fA-F]{2}){32,}$/.test(value)),
    EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT: integerString(1).optional(),
    TRUST_PROXY_HOPS: integerString(0).optional(),
    JWT_ISSUER: nonempty,
    JWT_AUDIENCE: nonempty,
    JWT_ACCESS_TOKEN_TTL_SECONDS: integerString(1),
    JWT_KEY_ID: z.string().optional(),
    EMAIL_SERVICE_CREDENTIAL: z.string().optional(),
    FOODDATA_CENTRAL_API_KEY: z.string().optional(),
    JWT_PRIVATE_KEY_PEM: nonempty.refine((value) => {
      try {
        const pem = value.replace(/\\n/g, "\n").trim();
        return (
          pem.startsWith("-----BEGIN PRIVATE KEY-----") &&
          createPrivateKey(pem).asymmetricKeyType === "ed25519"
        );
      } catch {
        return false;
      }
    }),
    // Production startup must not silently inherit the container's localhost defaults.
    WEBAUTHN_RP_ID: nonempty,
    WEBAUTHN_ORIGIN: nonempty.refine((value) => {
      try {
        const origin = new URL(value);
        return (origin.protocol === "https:" || origin.protocol === "http:") && origin.origin === value;
      } catch {
        return false;
      }
    }),
    WEBAUTHN_RP_NAME: nonempty.optional(),
  })
  .catchall(z.string());

type RuntimeConfiguration = z.infer<typeof runtimeConfigurationSchema>;

/** Validate parsed startup settings without exposing values or populating process.env. */
export function validateRuntimeConfiguration(configuration: Record<string, string>): RuntimeConfiguration {
  for (const value of Object.values(configuration)) {
    if (typeof value !== "string") {
      throw new Error("Runtime configuration must contain only string values");
    }
    if (value.trimStart().startsWith("encrypted:")) {
      throw new Error("Runtime configuration contains undecrypted values");
    }
  }

  const result = runtimeConfigurationSchema.safeParse(configuration);
  if (!result.success) {
    // Never expose Zod issues or the original input: both can carry secret values.
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
    throw new Error(`Invalid runtime configuration: ${names.join(", ")}`);
  }

  // Keep extra settings and exact secret bytes; consumers retain their existing defaults.
  return { ...result.data };
}

export function initializeRuntimeEnvironment(configuration: RuntimeConfiguration): void {
  if (values) {
    throw new Error("Runtime configuration is already initialized");
  }

  values = Object.freeze({ ...configuration });
}

export function isE2eRuntime(): boolean {
  return process.env.CALIBRATE_E2E === "1";
}

export function isDemoRuntime(): boolean {
  return process.env.CALIBRATE_DEMO === "1";
}

export function isSeededCatalogE2eRuntime(): boolean {
  return isE2eRuntime() && process.env.CALIBRATE_E2E_SEEDED_CATALOG === "1";
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
  if (usesProcessEnvironmentRuntime()) {
    return process.env[name];
  }

  if (!values) {
    throw new Error("Runtime configuration is not initialized");
  }

  return values[name];
}
