import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let runtime: typeof import("../runtime-environment.js");

const privateKeyPem = generateKeyPairSync("ed25519")
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();

function createConfiguration() {
  return runtime.validateRuntimeConfiguration({
    DB_HOST: "postgres",
    DB_NAME: "calibrate_test",
    DB_USER: "calibrate",
    DB_PASSWORD: "synthetic-password",
    OTP_HMAC_KEY: Buffer.alloc(32, 1).toString("base64url"),
    EMAIL_REQUEST_IP_HMAC_KEY: Buffer.alloc(32, 2).toString("hex"),
    JWT_ISSUER: "calibrate-test",
    JWT_AUDIENCE: "calibrate-test-client",
    JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
    JWT_PRIVATE_KEY_PEM: privateKeyPem,
    WEBAUTHN_RP_ID: "example.test",
    WEBAUTHN_ORIGIN: "https://app.example.test",
    EMAIL_SERVICE_CREDENTIAL: "synthetic-email-credential",
  });
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("CALIBRATE_E2E", "0");
  vi.stubEnv("CALIBRATE_DEMO", "0");
  runtime = await import("../runtime-environment.js");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getRuntimeEnvironmentValue", () => {
  it("recognizes seeded catalog mode only within the E2E runtime", () => {
    vi.stubEnv("CALIBRATE_E2E_SEEDED_CATALOG", "1");
    expect(runtime.isSeededCatalogE2eRuntime()).toBe(false);

    vi.stubEnv("CALIBRATE_E2E", "1");
    expect(runtime.isSeededCatalogE2eRuntime()).toBe(true);
  });

  it.each(["CALIBRATE_E2E", "CALIBRATE_DEMO"])(
    "reads process.env without initialization when %s is selected",
    (mode) => {
      vi.stubEnv(mode, "1");
      vi.stubEnv("WEBAUTHN_ORIGIN", "http://localhost:43100");

      expect(runtime.getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("http://localhost:43100");
      expect(runtime.isDemoRuntime()).toBe(mode === "CALIBRATE_DEMO");
    },
  );

  it.each(["CALIBRATE_E2E", "CALIBRATE_DEMO"])(
    "returns undefined for a missing process setting when %s is selected",
    (mode) => {
      vi.stubEnv(mode, "1");
      vi.stubEnv("OTP_HMAC_KEY", undefined);

      expect(runtime.getRuntimeEnvironmentValue("OTP_HMAC_KEY")).toBeUndefined();
    },
  );

  it("rejects normal-runtime reads before initialization even if process.env has the value", () => {
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://ambient.example.test");

    expect(() => runtime.getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toThrow(
      "Runtime configuration is not initialized",
    );
  });

  it("uses initialized configuration without an ambient environment override", () => {
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://ambient.example.test");
    runtime.initializeRuntimeEnvironment(createConfiguration());

    expect(runtime.getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("https://app.example.test");
    expect(process.env.WEBAUTHN_ORIGIN).toBe("https://ambient.example.test");
  });

  it("makes optional validated settings available to their consumers", () => {
    runtime.initializeRuntimeEnvironment(createConfiguration());

    expect(runtime.getRuntimeEnvironmentValue("EMAIL_SERVICE_CREDENTIAL")).toBe("synthetic-email-credential");
  });

  it("retains a snapshot when the caller changes its configuration object", () => {
    const configuration = createConfiguration();
    runtime.initializeRuntimeEnvironment(configuration);
    configuration.WEBAUTHN_ORIGIN = "https://changed.example.test";

    expect(runtime.getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("https://app.example.test");
  });

  it("rejects a second initialization", () => {
    const configuration = createConfiguration();
    runtime.initializeRuntimeEnvironment(configuration);

    expect(() => runtime.initializeRuntimeEnvironment(configuration)).toThrow(
      "Runtime configuration is already initialized",
    );
  });

  it.each(["CALIBRATE_E2E", "CALIBRATE_DEMO"])(
    "never falls back to normal-runtime secrets when %s is selected",
    (mode) => {
      runtime.initializeRuntimeEnvironment(createConfiguration());
      vi.stubEnv(mode, "1");
      vi.stubEnv("OTP_HMAC_KEY", undefined);

      expect(runtime.getRuntimeEnvironmentValue("OTP_HMAC_KEY")).toBeUndefined();
    },
  );
});
