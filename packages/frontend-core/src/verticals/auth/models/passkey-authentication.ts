/** Portable WebAuthn JSON data; browser ceremonies belong to the host. */
export type PasskeyAuthenticationChallenge = {
  options: { challenge: string; rpId: string; timeout: number; userVerification: "required" };
  expiresAt: Date;
};
export type PasskeyAuthenticationCredential = {
  id: string;
  rawId: string;
  type: "public-key";
  response: { authenticatorData: string; clientDataJSON: string; signature: string; userHandle?: string };
  authenticatorAttachment?: "platform" | "cross-platform";
  clientExtensionResults: { appid?: boolean; credProps?: { rk?: boolean }; hmacCreateSecret?: boolean };
};
export type VerifyPasskeyAuthenticationCommand = {
  credential: PasskeyAuthenticationCredential;
  rememberDevice: boolean;
};
export type PasskeyAuthenticationErrorCode =
  | "PASSKEY_AUTHENTICATION_FAILED"
  | "ORIGIN_NOT_ALLOWED"
  | "PASSKEY_AUTHENTICATION_STATE_CONFLICT"
  | "PASSKEY_AUTHENTICATION_RATE_LIMITED"
  | "PASSKEY_AUTHENTICATION_UNAVAILABLE";
