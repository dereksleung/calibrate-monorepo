import { AuthenticationError } from "@application/errors/authentication-error.js";
import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRuntimeEnvironmentValue } from "../../runtime-environment.js";
import { JoseAccessTokenService } from "../jose-access-token-service.js";

// Isolate runtime configuration while keeping key generation and JWT signing real.
vi.mock("../../runtime-environment.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../runtime-environment.js")>();
  return { ...actual, getRuntimeEnvironmentValue: vi.fn() };
});

describe("JoseAccessTokenService", () => {
  const mockedGet = vi.mocked(getRuntimeEnvironmentValue);

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString().trim();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString().trim();
  const escapedPrivateKeyPem = privateKeyPem.replace(/\n/g, "\\n");

  beforeEach(() => {
    vi.stubEnv("CALIBRATE_DEMO", "0");
    vi.stubEnv("CALIBRATE_E2E", "0");
    vi.stubEnv("JWT_PRIVATE_KEY_PEM", undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00.000Z"));
    mockedGet.mockReset();
    mockedGet.mockImplementation((name) =>
      name === "JWT_PRIVATE_KEY_PEM" ? escapedPrivateKeyPem : undefined,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("issues and verifies tokens using the runtime signing key instead of process.env", async () => {
    vi.stubEnv("JWT_PRIVATE_KEY_PEM", "do-not-use-process-env");

    const tokenService = new JoseAccessTokenService({
      issuer: "clean-architecture-backend",
      audience: "clean-architecture-client",
      expiresInSeconds: 900,
    });

    const issuedToken = await tokenService.issue({ userId: "user-1" });
    const verifiedToken = await tokenService.verify(issuedToken.token);

    expect(issuedToken.expiresInSeconds).toBe(900);
    expect(verifiedToken).toEqual({ userId: "user-1" });
    expect(mockedGet).toHaveBeenCalledWith("JWT_PRIVATE_KEY_PEM");
  });

  it.each(["CALIBRATE_DEMO", "CALIBRATE_E2E"])(
    "uses the process signing key when %s is selected",
    async (mode) => {
      vi.stubEnv(mode, "1");
      vi.stubEnv("JWT_PRIVATE_KEY_PEM", privateKeyPem);
      mockedGet.mockImplementation((name) =>
        name === "JWT_PRIVATE_KEY_PEM" ? "must-not-use-runtime-key" : undefined,
      );

      const tokenService = new JoseAccessTokenService({
        issuer: "calibrate-local",
        audience: "calibrate-local",
        expiresInSeconds: 900,
      });

      const issuedToken = await tokenService.issue({ userId: "local-user" });
      const verifiedToken = await tokenService.verify(issuedToken.token);

      expect(verifiedToken).toEqual({ userId: "local-user" });
      expect(mockedGet).not.toHaveBeenCalledWith("JWT_PRIVATE_KEY_PEM");
    },
  );

  it("rejects a missing runtime signing key even if process.env contains a valid key", async () => {
    vi.stubEnv("JWT_PRIVATE_KEY_PEM", privateKeyPem);
    mockedGet.mockReturnValue(undefined);
    const tokenService = new JoseAccessTokenService({
      issuer: "calibrate-test",
      audience: "calibrate-test-client",
      expiresInSeconds: 900,
    });

    await expect(tokenService.issue({ userId: "user-1" })).rejects.toThrow(
      "JWT_PRIVATE_KEY_PEM is not configured",
    );
  });

  it.each(["CALIBRATE_DEMO", "CALIBRATE_E2E"])(
    "rejects a missing process signing key without a runtime fallback when %s is selected",
    async (mode) => {
      vi.stubEnv(mode, "1");
      const tokenService = new JoseAccessTokenService({
        issuer: "calibrate-local",
        audience: "calibrate-local",
        expiresInSeconds: 900,
      });

      await expect(tokenService.issue({ userId: "local-user" })).rejects.toThrow(
        "JWT_PRIVATE_KEY_PEM is not configured",
      );
      expect(mockedGet).not.toHaveBeenCalledWith("JWT_PRIVATE_KEY_PEM");
    },
  );

  it("should reject expired tokens", async () => {
    const tokenService = new JoseAccessTokenService({
      issuer: "clean-architecture-backend",
      audience: "clean-architecture-client",
      expiresInSeconds: 60,
      publicKeyPem,
    });

    const issuedToken = await tokenService.issue({ userId: "user-1" });
    vi.advanceTimersByTime(61_000);

    await expect(tokenService.verify(issuedToken.token)).rejects.toThrow(AuthenticationError);
  });

  it("should reject tokens with the wrong audience", async () => {
    const signingService = new JoseAccessTokenService({
      issuer: "clean-architecture-backend",
      audience: "clean-architecture-client",
      expiresInSeconds: 900,
    });
    const verifyingService = new JoseAccessTokenService({
      issuer: "clean-architecture-backend",
      audience: "some-other-audience",
      expiresInSeconds: 900,
      publicKeyPem,
    });

    const issuedToken = await signingService.issue({ userId: "user-1" });

    await expect(verifyingService.verify(issuedToken.token)).rejects.toThrow(AuthenticationError);
  });

  it("should reject malformed tokens", async () => {
    const tokenService = new JoseAccessTokenService({
      issuer: "clean-architecture-backend",
      audience: "clean-architecture-client",
      expiresInSeconds: 900,
      publicKeyPem,
    });

    await expect(tokenService.verify("not-a-jwt")).rejects.toThrow(AuthenticationError);
  });
});
