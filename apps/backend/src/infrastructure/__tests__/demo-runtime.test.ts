import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { dotenvGet } = vi.hoisted(() => ({ dotenvGet: vi.fn() }));

vi.mock("@dotenvx/dotenvx", () => ({
  default: {
    get: dotenvGet,
  },
}));

import {
  generateLocalRuntimeConfiguration,
  localRuntimeConfigurationToProcessEnv,
  writeLocalRuntimeConfiguration,
} from "@calibrate/local-runtime-config";

import { getBackendListenHost, prepareDemoRuntime } from "../demo-runtime.js";
import { loadDatabaseConnectionConfigFromEnvironment } from "../persistence/database-environment.js";
import { getRuntimeEnvironmentValue } from "../runtime-environment.js";
import { JoseAccessTokenService } from "../security/jose-access-token-service.js";

const originalEnvironment = { ...process.env };
const temporaryDirectories: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnvironment };
  dotenvGet.mockReset();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "calibrate-demo-runtime-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("prepareDemoRuntime", () => {
  it("loads generated local configuration into process env without dotenvx or .env.keys", async () => {
    const directory = await createTemporaryDirectory();
    await writeFile(path.join(directory, ".env.keys"), "DOTENV_PRIVATE_KEY=must-not-be-required\n");
    const generated = generateLocalRuntimeConfiguration();
    await writeLocalRuntimeConfiguration(directory, generated);
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "development";
    process.env.WEBAUTHN_ORIGIN = "http://localhost:3000";
    process.env.DOTENV_PRIVATE_KEY = "must-not-be-used";
    dotenvGet.mockReturnValue("dotenv-private-key");

    const configuration = await prepareDemoRuntime(directory);
    const tokenService = new JoseAccessTokenService({
      issuer: configuration.jwtIssuer,
      audience: configuration.jwtAudience,
      expiresInSeconds: 900,
      envFilePath: path.join(directory, ".env"),
      envKeysFilePath: path.join(directory, ".env.keys"),
    });

    const issued = await tokenService.issue({ userId: "demo-user" });

    expect(localRuntimeConfigurationToProcessEnv(configuration).JWT_ISSUER).toBe("calibrate-local");
    expect(getRuntimeEnvironmentValue("JWT_ISSUER")).toBe("calibrate-local");
    expect(getRuntimeEnvironmentValue("JWT_PRIVATE_KEY_PEM")).toBe(generated.jwtPrivateKeyPem);
    expect(loadDatabaseConnectionConfigFromEnvironment()).toEqual({
      database: "calibrate_demo",
      host: "127.0.0.1",
      maxConnections: 10,
      password: generated.otpHmacKey,
      port: 5433,
      user: "calibrate_demo",
    });
    expect(await tokenService.verify(issued.token)).toEqual({ userId: "demo-user" });
    expect(dotenvGet).not.toHaveBeenCalled();
    expect(getBackendListenHost()).toBe("127.0.0.1");
  });

  it("replaces encrypted normal-runtime limits with demo-safe defaults", async () => {
    const directory = await createTemporaryDirectory();
    await writeLocalRuntimeConfiguration(directory, generateLocalRuntimeConfiguration());
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "development";
    process.env.WEBAUTHN_ORIGIN = "http://localhost:3000";
    process.env.EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT = "encrypted-normal-runtime-value";
    process.env.TRUST_PROXY_HOPS = "encrypted-normal-runtime-value";

    await prepareDemoRuntime(directory);
    await expect(import("../container.js")).resolves.toHaveProperty("Container");
  });

  it("replaces an encrypted normal-runtime WebAuthn origin with the demo-safe origin", async () => {
    const directory = await createTemporaryDirectory();
    await writeLocalRuntimeConfiguration(directory, generateLocalRuntimeConfiguration());
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "development";
    process.env.WEBAUTHN_ORIGIN = "encrypted-normal-runtime-value";

    await prepareDemoRuntime(directory);

    expect(getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("http://localhost:3000");
  });

  it("is an explicit selection rather than an implicit fallback", async () => {
    delete process.env.CALIBRATE_DEMO;

    await expect(prepareDemoRuntime()).rejects.toThrow("Local demo mode is not selected");
    expect(dotenvGet).not.toHaveBeenCalled();
    expect(getBackendListenHost()).toBeUndefined();
  });

  it("refuses production even when generated configuration is present", async () => {
    const directory = await createTemporaryDirectory();
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "production";
    process.env.WEBAUTHN_ORIGIN = "http://localhost:3000";

    await expect(prepareDemoRuntime(directory)).rejects.toThrow("cannot run in production");
  });

  it("replaces inherited dotenv ciphertext with demo-safe process values", async () => {
    const directory = await createTemporaryDirectory();
    await writeLocalRuntimeConfiguration(directory, generateLocalRuntimeConfiguration());
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "development";
    process.env.WEBAUTHN_ORIGIN = "http://localhost:3000";
    process.env.EMAIL_SERVICE_CREDENTIAL = "encrypted:developer-credential";
    process.env.EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT = "encrypted:not-an-integer";
    process.env.TRUST_PROXY_HOPS = "encrypted:not-an-integer";

    await prepareDemoRuntime(directory);

    expect(getRuntimeEnvironmentValue("EMAIL_VERIFICATION_GLOBAL_HOURLY_LIMIT")).toBe("1000");
    expect(getRuntimeEnvironmentValue("TRUST_PROXY_HOPS")).toBe("0");
    expect(getRuntimeEnvironmentValue("EMAIL_SERVICE_CREDENTIAL")).toBe("");
    expect(dotenvGet).not.toHaveBeenCalled();
  });
  it("replaces an encrypted normal-runtime WebAuthn origin with the demo-safe origin", async () => {
    const directory = await createTemporaryDirectory();
    await writeLocalRuntimeConfiguration(directory, generateLocalRuntimeConfiguration());
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "development";
    process.env.WEBAUTHN_ORIGIN = "encrypted-normal-runtime-value";

    await prepareDemoRuntime(directory);

    expect(getRuntimeEnvironmentValue("WEBAUTHN_ORIGIN")).toBe("http://localhost:3000");
  });
  it("fails closed when generated configuration is missing", async () => {
    const directory = await createTemporaryDirectory();
    process.env.CALIBRATE_DEMO = "1";
    process.env.NODE_ENV = "development";
    process.env.WEBAUTHN_ORIGIN = "http://127.0.0.1:3000";

    await expect(prepareDemoRuntime(directory)).rejects.toThrow("Local demo configuration is missing");
    expect(dotenvGet).not.toHaveBeenCalled();
  });
});
