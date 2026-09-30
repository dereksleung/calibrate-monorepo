import type {
  PasskeyRegistrationChallenge,
  PasskeyRegistrationCredential,
} from "@calibrate/frontend-core/verticals/auth/models/passkey-registration";

import { startRegistration } from "@simplewebauthn/browser";

export interface BrowserPasskeyRegistrationAdapter {
  createPasskey(options: PasskeyRegistrationChallenge["options"]): Promise<PasskeyRegistrationCredential>;
}

export function isBrowserPasskeyRegistrationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

export function createBrowserPasskeyRegistrationAdapter(): BrowserPasskeyRegistrationAdapter {
  return {
    async createPasskey(options): Promise<PasskeyRegistrationCredential> {
      const credential = await startRegistration({
        optionsJSON: options,
      });
      // The SDK includes legacy transport labels; the verification endpoint validates the payload.
      return credential as PasskeyRegistrationCredential;
    },
  };
}

export async function showPlatformUiForClientPasskeyFailedToRegisterOnServer({
  credentialId,
  rpId,
}: {
  credentialId: string;
  rpId: string;
}): Promise<void> {
  if (
    typeof window === "undefined" ||
    typeof window.PublicKeyCredential?.signalUnknownCredential !== "function"
  ) {
    return;
  }

  try {
    await window.PublicKeyCredential.signalUnknownCredential({ credentialId, rpId });
  } catch {
    // Signaling is advisory. Preserve the registration failure as the actionable outcome.
  }
}

export function isPasskeyRegistrationCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = (error as { name?: string }).name;
  return name === "NotAllowedError" || name === "AbortError" || name === "TimeoutError";
}
