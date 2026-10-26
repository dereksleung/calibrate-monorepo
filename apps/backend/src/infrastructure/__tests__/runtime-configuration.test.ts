import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { validateRuntimeConfiguration } from "../runtime-environment.js";

const privateKeyPem = generateKeyPairSync("ed25519")
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();

function createConfiguration(): Record<string, string> {
  return {
    DB_HOST: "postgres",
    DB_NAME: "calibrate",
    DB_USER: "calibrate",
    DB_PASSWORD: "  synthetic password with intentional spaces  ",
    OTP_HMAC_KEY: Buffer.alloc(32, 1).toString("base64url"),
    EMAIL_REQUEST_IP_HMAC_KEY: Buffer.alloc(32, 2).toString("hex"),
    JWT_ISSUER: "calibrate",
    JWT_AUDIENCE: "calibrate-web",
    JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
    JWT_PRIVATE_KEY_PEM: privateKeyPem,
    WEBAUTHN_RP_ID: "calibrateapp.org",
    WEBAUTHN_ORIGIN: "https://calibrateapp.org",
  };
}

describe("validateRuntimeConfiguration", () => {
  it("returns a copy without changing values, the input, or process.env", () => {
    const input = Object.freeze({ ...createConfiguration(), EXTRA_SETTING: "retained" });
    const environmentBefore = { ...process.env };

    const configuration = validateRuntimeConfiguration(input);

    expect(configuration).toEqual(input);
    expect(configuration).not.toBe(input);
    expect(process.env).toEqual(environmentBefore);
  });

  it.each([
    "DB_HOST",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "OTP_HMAC_KEY",
    "EMAIL_REQUEST_IP_HMAC_KEY",
    "JWT_ISSUER",
    "JWT_AUDIENCE",
    "JWT_ACCESS_TOKEN_TTL_SECONDS",
    "JWT_PRIVATE_KEY_PEM",
    "WEBAUTHN_RP_ID",
    "WEBAUTHN_ORIGIN",
  ])("rejects missing or blank %s", (name) => {
    const input = createConfiguration();
    delete input[name];
    expect(() => validateRuntimeConfiguration(input)).toThrow(name);
    input[name] = " \n\t ";
    expect(() => validateRuntimeConfiguration(input)).toThrow(name);
  });

  it("preserves optional credentials and leaves existing defaults to their consumers", () => {
    const input = {
      ...createConfiguration(),
      EMAIL_SERVICE_CREDENTIAL: "",
      FOODDATA_CENTRAL_API_KEY: "",
    };
    expect(validateRuntimeConfiguration(input)).toEqual(input);
  });

  it("preserves configured email, catalog, and JWT metadata", () => {
    const input = {
      ...createConfiguration(),
      EMAIL_SERVICE_CREDENTIAL: "synthetic-email-credential",
      FOODDATA_CENTRAL_API_KEY: "synthetic-catalog-key",
      JWT_KEY_ID: "synthetic-key-id",
    };
    expect(validateRuntimeConfiguration(input)).toEqual(input);
  });

  it("rejects unresolved ciphertext even in an extra setting without disclosing it", () => {
    const secret = "encrypted:synthetic-sensitive-value";
    expect(() => validateRuntimeConfiguration({ ...createConfiguration(), EXTRA_SECRET: secret })).toThrow(
      "undecrypted",
    );
    try {
      validateRuntimeConfiguration({ ...createConfiguration(), EXTRA_SECRET: secret });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it.each([
    ["DB_PORT", "0"],
    ["DB_PORT", "65536"],
    ["DB_PORT", "5432junk"],
    ["PORT", "-1"],
    ["PORT", "65536"],
    ["PORT", "1.5"],
    ["JWT_ACCESS_TOKEN_TTL_SECONDS", "0"],
    ["JWT_ACCESS_TOKEN_TTL_SECONDS", "900junk"],
    ["OTP_HMAC_CURRENT_KEY_VERSION", "0"],
    ["EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT", "-1"],
    ["TRUST_PROXY_HOPS", "-1"],
    ["TRUST_PROXY_HOPS", "NaN"],
    ["TRUST_PROXY_HOPS", "9007199254740992"],
  ])("rejects invalid %s without exposing its value", (name, value) => {
    expect(() => validateRuntimeConfiguration({ ...createConfiguration(), [name]: value })).toThrow(
      `Invalid runtime configuration: ${name}`,
    );
  });

  it("accepts numeric boundary values", () => {
    const input = {
      ...createConfiguration(),
      DB_PORT: "1",
      PORT: "65535",
      TRUST_PROXY_HOPS: "0",
      OTP_HMAC_CURRENT_KEY_VERSION: "1",
      EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT: "1",
    };
    expect(validateRuntimeConfiguration(input)).toEqual(input);
  });

  it.each([
    ["OTP_HMAC_KEY", Buffer.alloc(31).toString("base64url")],
    ["OTP_HMAC_KEY", "!".repeat(64)],
    ["EMAIL_REQUEST_IP_HMAC_KEY", "ab".repeat(31)],
    ["EMAIL_REQUEST_IP_HMAC_KEY", "ab".repeat(32) + "a"],
    ["EMAIL_REQUEST_IP_HMAC_KEY", "z".repeat(64)],
    ["JWT_PRIVATE_KEY_PEM", "not-a-private-key"],
  ])("rejects malformed or undersized %s", (name, value) => {
    expect(() => validateRuntimeConfiguration({ ...createConfiguration(), [name]: value })).toThrow(name);
  });

  it("rejects a private key using the wrong signing algorithm", () => {
    const wrongKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
      .privateKey.export({ type: "pkcs8", format: "pem" })
      .toString();
    expect(() =>
      validateRuntimeConfiguration({ ...createConfiguration(), JWT_PRIVATE_KEY_PEM: wrongKey }),
    ).toThrow("JWT_PRIVATE_KEY_PEM");
  });

  it("accepts an escaped PEM without rewriting the stored value", () => {
    const input = { ...createConfiguration(), JWT_PRIVATE_KEY_PEM: privateKeyPem.replace(/\n/g, "\\n") };
    expect(validateRuntimeConfiguration(input)).toEqual(input);
  });

  it.each(["not a URL", "ftp://calibrateapp.org", "https://calibrateapp.org/path"])(
    "rejects an invalid WebAuthn origin %s",
    (origin) => {
      expect(() =>
        validateRuntimeConfiguration({ ...createConfiguration(), WEBAUTHN_ORIGIN: origin }),
      ).toThrow("WEBAUTHN_ORIGIN");
    },
  );

  it("reports multiple invalid setting names without their values", () => {
    const input = { ...createConfiguration(), DB_PORT: "sensitive-bad-port", JWT_ISSUER: "" };
    expect(() => validateRuntimeConfiguration(input)).toThrow(
      "Invalid runtime configuration: DB_PORT, JWT_ISSUER",
    );
  });
});
