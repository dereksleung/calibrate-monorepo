import type {
  PasskeyAuthenticationCredential,
  PasskeyAuthenticationOptions,
} from "@calibrate/frontend-core/verticals/auth/models/passkeys";

import {
  startAuthentication,
  WebAuthnAbortService,
  type PublicKeyCredentialRequestOptionsJSON,
  type AuthenticationResponseJSON,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";

export { type PublicKeyCredentialRequestOptionsJSON, type AuthenticationResponseJSON };

export function isBrowserPasskeyAuthenticationSupported(): boolean {
  return browserSupportsWebAuthn();
}

export async function isConditionalPasskeyAuthenticationSupported(): Promise<boolean> {
  return await browserSupportsWebAuthnAutofill();
}

export function startPasskeyAuthentication(
  options: PasskeyAuthenticationOptions["options"],
  mode: "conditional" | "explicit",
): Promise<PasskeyAuthenticationCredential> {
  return startAuthentication({
    optionsJSON: options as PublicKeyCredentialRequestOptionsJSON,
    useBrowserAutofill: mode === "conditional",
  }) as Promise<PasskeyAuthenticationCredential>;
}

export function cancelPasskeyAuthentication(): void {
  WebAuthnAbortService.cancelCeremony();
}

export function isPasskeyAuthenticationCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "NotAllowedError" || name === "AbortError" || name === "TimeoutError";
}
