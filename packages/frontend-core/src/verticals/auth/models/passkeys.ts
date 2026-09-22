export type PasskeyAuthenticationErrorCode =
  | "PASSKEY_AUTHENTICATION_FAILED"
  | "ORIGIN_NOT_ALLOWED"
  | "PASSKEY_AUTHENTICATION_STATE_CONFLICT"
  | "PASSKEY_AUTHENTICATION_RATE_LIMITED"
  | "PASSKEY_AUTHENTICATION_UNAVAILABLE";

export type PasskeyRegistrationErrorCode =
  | "ORIGIN_NOT_ALLOWED"
  | "ENROLLMENT_AUTHORIZATION_REQUIRED"
  | "PASSKEY_REGISTRATION_FAILED"
  | "PASSKEY_REGISTRATION_STATE_CONFLICT"
  | "PASSKEY_REGISTRATION_RATE_LIMITED"
  | "PASSKEY_REGISTRATION_UNAVAILABLE";

export interface PasskeyAuthenticationOptions {
  options: {
    challenge: string;
    rpId: string;
    timeout: 300_000;
    userVerification: "required";
  };
  expiresAt: string;
}

export interface PasskeyAuthenticationCredential {
  id: string;
  rawId: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  };
  authenticatorAttachment?: "platform" | "cross-platform";
  clientExtensionResults: {
    appid?: boolean;
    credProps?: { rk?: boolean };
    hmacCreateSecret?: boolean;
  };
  type: "public-key";
}

export interface VerifyPasskeyAuthenticationInput {
  credential: PasskeyAuthenticationCredential;
  rememberDevice: boolean;
}

export interface PasskeyRegistrationOptions {
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{
    id: string;
    type: "public-key";
    transports?: Array<"usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card">;
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    requireResidentKey?: boolean;
    residentKey?: "discouraged" | "preferred" | "required";
    userVerification?: "discouraged" | "preferred" | "required";
  };
  hints?: Array<"security-key" | "client-device" | "hybrid">;
  attestation?: "none" | "indirect" | "direct" | "enterprise";
  extensions?: {
    appid?: string;
    credProps?: boolean;
    hmacCreateSecret?: boolean;
    minPinLength?: boolean;
  };
}

export interface PasskeyRegistrationCredential {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    authenticatorData?: string;
    transports?: Array<"usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card">;
    publicKeyAlgorithm?: number;
    publicKey?: string;
  };
  authenticatorAttachment?: "platform" | "cross-platform";
  clientExtensionResults: Record<string, unknown>;
  type: "public-key";
}

export interface VerifyPasskeyRegistrationInput {
  credential: PasskeyRegistrationCredential;
  rememberDevice: boolean;
}
