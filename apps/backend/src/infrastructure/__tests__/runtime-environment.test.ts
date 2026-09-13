import { afterEach, describe, expect, it, vi } from "vitest";

const { dotenvGet } = vi.hoisted(() => ({ dotenvGet: vi.fn() }));

vi.mock("@dotenvx/dotenvx", () => ({
  default: {
    get: dotenvGet,
  },
}));

import { getRuntimeEnvironmentValue, isDemoRuntime } from "../runtime-environment.js";
import { generateLocalRuntimeConfiguration, localRuntimeConfigurationToProcessEnv } from "@calibrate/local-runtime-config";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  dotenvGet.mockReset();
});

describe("getRuntimeEnvironmentValue", () => {
  it("uses the process environment without consulting dotenvx in E2E mode", () => {
    process.env.CALIBRATE_E2E = "1";
    process.env.WEBAUTHN_ORIGIN = "http://localhost:43100";
    dotenvGet.mockReturnValue("http://localhost:3000");

    expect(getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("http://localhost:43100");
    expect(dotenvGet).not.toHaveBeenCalled();
  });

  it("fails closed when an E2E-controlled value is absent", () => {
    process.env.CALIBRATE_E2E = "1";
    delete process.env.OTP_HMAC_KEY;
    dotenvGet.mockReturnValue("dotenv-secret");

    expect(getRuntimeEnvironmentValue("OTP_HMAC_KEY")).toBeUndefined();
    expect(dotenvGet).not.toHaveBeenCalled();
  });

  it("uses dotenvx outside E2E mode", () => {
    delete process.env.CALIBRATE_E2E;
    delete process.env.CALIBRATE_DEMO;
    delete process.env.WEBAUTHN_ORIGIN;
    dotenvGet.mockReturnValue("dotenv-value");

    expect(getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("dotenv-value");
    expect(dotenvGet).toHaveBeenCalledWith("WEBAUTHN_ORIGIN");
  });

  it("uses normal-mode process values injected by dotenvx run", () => {
    delete process.env.CALIBRATE_E2E;
    delete process.env.CALIBRATE_DEMO;
    process.env.WEBAUTHN_ORIGIN = "http://localhost:3010";
    dotenvGet.mockReturnValue("encrypted:unavailable");

    expect(getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("http://localhost:3010");
    expect(dotenvGet).not.toHaveBeenCalled();
  });

  it("initializes the normal backend runtime from dotenvx-injected local values", async () => {
    delete process.env.CALIBRATE_E2E;
    delete process.env.CALIBRATE_DEMO;
    Object.assign(process.env, {
      ...localRuntimeConfigurationToProcessEnv(generateLocalRuntimeConfiguration()),
      CORS_ORIGIN: "http://localhost:3010",
      DB_HOST: "127.0.0.1",
      DB_NAME: "calibrate_wt_feature_ab12cd34",
      DB_PASSWORD: "machine-local-password",
      DB_PORT: "5433",
      DB_USER: "calibrate",
      EMAIL_SERVICE_CREDENTIAL: "",
      EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT: "1000",
      FOODDATA_CENTRAL_API_KEY: "",
      TRUST_PROXY_HOPS: "0",
      WEBAUTHN_ORIGIN: "http://localhost:3010",
      WEBAUTHN_RP_ID: "localhost",
      WEBAUTHN_RP_NAME: "Calibrate",
    });
    dotenvGet.mockImplementation(() => {
      throw new Error("normal runtime should use the injected values");
    });

    await expect(import("../container.js")).resolves.toHaveProperty("Container");
    expect(dotenvGet).not.toHaveBeenCalled();
  });

  it("uses the process environment without consulting dotenvx in demo mode", () => {
    process.env.CALIBRATE_DEMO = "1";
    process.env.JWT_ISSUER = "calibrate-local";
    dotenvGet.mockReturnValue("dotenv-issuer");

    expect(isDemoRuntime()).toBe(true);
    expect(getRuntimeEnvironmentValue("JWT_ISSUER")).toBe("calibrate-local");
    expect(dotenvGet).not.toHaveBeenCalled();
  });

  it("fails closed when a demo-controlled value is absent", () => {
    process.env.CALIBRATE_DEMO = "1";
    delete process.env.OTP_HMAC_KEY;
    dotenvGet.mockReturnValue("dotenv-secret");

    expect(getRuntimeEnvironmentValue("OTP_HMAC_KEY")).toBeUndefined();
    expect(dotenvGet).not.toHaveBeenCalled();
  });
});
