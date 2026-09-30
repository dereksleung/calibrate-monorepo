import type {
  PasskeyAuthenticationChallenge,
  PasskeyAuthenticationCredential,
} from "@calibrate/frontend-core/verticals/auth/models/passkey-authentication";

import {
  startAuthentication,
  WebAuthnAbortService,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";

export function isBrowserPasskeyAuthenticationSupported(): boolean {
  return browserSupportsWebAuthn();
}

export async function isConditionalPasskeyAuthenticationSupported(): Promise<boolean> {
  return await browserSupportsWebAuthnAutofill();
}

export function startPasskeyAuthentication(
  options: PasskeyAuthenticationChallenge["options"],
  mode: "conditional" | "explicit",
): Promise<PasskeyAuthenticationCredential> {
  return startAuthentication({
    optionsJSON: options,
    useBrowserAutofill: mode === "conditional",
  });
}

export function cancelPasskeyAuthentication(): void {
  WebAuthnAbortService.cancelCeremony();
}

export function isPasskeyAuthenticationCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "NotAllowedError" || name === "AbortError" || name === "TimeoutError";
}
