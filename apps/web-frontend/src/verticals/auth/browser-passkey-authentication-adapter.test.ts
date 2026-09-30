import {
  buildPasskeyAuthenticationChallenge,
  buildVerifyPasskeyAuthenticationCommand,
} from "@calibrate/frontend-core/verticals/auth/models/__mocks__/passkey-authentication";
import { describe, expect, it, vi } from "vitest";

import {
  cancelPasskeyAuthentication,
  isPasskeyAuthenticationCancellation,
  startPasskeyAuthentication,
} from "./browser-passkey-authentication-adapter";
const { startAuthentication, cancelCeremony } = vi.hoisted(() => ({
  startAuthentication: vi.fn(),
  cancelCeremony: vi.fn(),
}));
vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication,
  WebAuthnAbortService: { cancelCeremony },
  browserSupportsWebAuthn: vi.fn(),
  browserSupportsWebAuthnAutofill: vi.fn(),
}));
describe("browser passkey authentication adapter", () => {
  it.each(["explicit", "conditional"] as const)(
    "hands the core challenge to WebAuthn in %s mode",
    async (mode) => {
      const challenge = buildPasskeyAuthenticationChallenge();
      const credential = buildVerifyPasskeyAuthenticationCommand().credential;
      startAuthentication.mockResolvedValue(credential);
      expect(await startPasskeyAuthentication(challenge.options, mode)).toBe(credential);
      expect(startAuthentication).toHaveBeenLastCalledWith({
        optionsJSON: challenge.options,
        useBrowserAutofill: mode === "conditional",
      });
    },
  );
  it("cancels the browser ceremony", () => {
    cancelPasskeyAuthentication();
    expect(cancelCeremony).toHaveBeenCalledOnce();
  });
  it.each(["NotAllowedError", "AbortError", "TimeoutError"])("recognizes %s as cancellation", (name) => {
    expect(isPasskeyAuthenticationCancellation({ name })).toBe(true);
  });
  it("preserves other failures", () => {
    expect(isPasskeyAuthenticationCancellation(new Error("network"))).toBe(false);
    expect(isPasskeyAuthenticationCancellation(null)).toBe(false);
  });
});
