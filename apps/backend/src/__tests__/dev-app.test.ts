import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  loadApplication: vi.fn(),
}));

vi.mock("@dotenvx/dotenvx", () => ({ default: { config: mocks.config } }));

const privateKeyPem = generateKeyPairSync("ed25519")
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();
const configuration = {
  DB_HOST: "127.0.0.1",
  DB_PORT: "5433",
  DB_NAME: "calibrate_test",
  DB_USER: "calibrate",
  DB_PASSWORD: "synthetic-password",
  OTP_HMAC_KEY: Buffer.alloc(32, 1).toString("base64url"),
  EMAIL_REQUEST_IP_HMAC_KEY: Buffer.alloc(32, 2).toString("hex"),
  JWT_ISSUER: "calibrate-test",
  JWT_AUDIENCE: "calibrate-test-client",
  JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
  JWT_PRIVATE_KEY_PEM: privateKeyPem,
  WEBAUTHN_RP_ID: "localhost",
  WEBAUTHN_ORIGIN: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3000",
};

let previousExitCode: typeof process.exitCode;
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  previousExitCode = process.exitCode;
  process.exitCode = undefined;
  vi.stubEnv("CALIBRATE_DEMO", "0");
  vi.stubEnv("CALIBRATE_E2E", "0");
  // Nx loads the checkout's dotenv ciphertext into the test process.
  for (const [name, value] of Object.entries(process.env)) {
    if (name in configuration || value?.trimStart().startsWith("encrypted:")) {
      vi.stubEnv(name, undefined);
    }
  }
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.config.mockImplementation(() => {
    for (const [name, value] of Object.entries(configuration)) {
      if (process.env[name] === undefined) vi.stubEnv(name, value);
    }
    return { parsed: configuration };
  });
  vi.doMock("../app.js", async () => {
    const runtime = await import("../infrastructure/runtime-environment.js");
    // Exercise the same eager read that crashes the database import during startup.
    mocks.loadApplication(runtime.getRuntimeEnvironmentValue("DB_NAME"));
    return {};
  });
});

afterEach(() => {
  process.exitCode = previousExitCode;
  errorLog.mockRestore();
  vi.unstubAllEnvs();
  vi.doUnmock("../app.js");
});

async function boot(outcome: "success" | "failure" = "success") {
  await import("../dev-app.js");
  await vi.waitFor(() => {
    expect(outcome === "success" ? mocks.loadApplication : errorLog).toHaveBeenCalledTimes(1);
  });
}

describe("development startup", () => {
  it("initializes local configuration before loading application modules", async () => {
    vi.stubEnv("DB_NAME", undefined);
    await boot();

    expect(mocks.loadApplication).toHaveBeenCalledWith("calibrate_test");
    expect(mocks.config).toHaveBeenCalledWith(
      expect.objectContaining({ path: ".env", envKeysFile: ".env.keys", strict: true, quiet: true }),
    );
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("preserves environment overrides supplied by worktree setup", async () => {
    vi.stubEnv("DB_NAME", "calibrate_wt_example");
    vi.stubEnv("CORS_ORIGIN", "http://localhost:43100");

    await boot();

    const runtime = await import("../infrastructure/runtime-environment.js");
    expect(mocks.loadApplication).toHaveBeenCalledWith("calibrate_wt_example");
    expect(runtime.getRuntimeEnvironmentValue("CORS_ORIGIN")).toBe("http://localhost:43100");
  });

  it("stops before importing the app and suppresses dotenv failure details", async () => {
    mocks.config.mockImplementationOnce(() => {
      throw new Error("synthetic-secret-must-not-be-logged");
    });

    await boot("failure");

    expect(mocks.loadApplication).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(errorLog).toHaveBeenCalledWith("Backend development startup failed", {
      stage: "load-local-configuration",
      reason: "Check .env and .env.keys or DOTENV_PRIVATE_KEY; sensitive details suppressed",
    });
  });

  it("rejects invalid configuration before importing the app", async () => {
    vi.stubEnv("DB_PORT", "invalid-private-value");

    await boot("failure");

    expect(mocks.loadApplication).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(errorLog).toHaveBeenCalledWith("Backend development startup failed", {
      stage: "validate-runtime-configuration",
      reason: "Invalid runtime configuration: DB_PORT",
    });
  });

  it("requires CORS_ORIGIN without defaulting it to WEBAUTHN_ORIGIN", async () => {
    mocks.config.mockImplementationOnce(() => {
      for (const [name, value] of Object.entries(configuration)) {
        if (name !== "CORS_ORIGIN") vi.stubEnv(name, value);
      }
      return { parsed: configuration };
    });

    await boot("failure");

    expect(mocks.loadApplication).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(errorLog).toHaveBeenCalledWith("Backend development startup failed", {
      stage: "validate-runtime-configuration",
      reason: "CORS_ORIGIN must be configured",
    });
  });
});
