/** Portable WebAuthn JSON; device ceremonies belong to the host. */
export type PasskeyRegistrationTransport = "usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card";
export type PasskeyRegistrationChallenge = {
  options: {
    challenge: string;
    rp: { name: string; id?: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: { type: "public-key"; alg: number }[];
    timeout?: number;
    excludeCredentials?: { id: string; type: "public-key"; transports?: PasskeyRegistrationTransport[] }[];
    authenticatorSelection?: {
      authenticatorAttachment?: "platform" | "cross-platform";
      requireResidentKey?: boolean;
      residentKey?: "discouraged" | "preferred" | "required";
      userVerification?: "discouraged" | "preferred" | "required";
    };
    hints?: ("security-key" | "client-device" | "hybrid")[];
    attestation?: "none" | "indirect" | "direct" | "enterprise";
    extensions?: { appid?: string; credProps?: boolean; hmacCreateSecret?: boolean; minPinLength?: boolean };
  };
};
export type PasskeyRegistrationCredential = {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    attestationObject: string;
    authenticatorData?: string;
    transports?: PasskeyRegistrationTransport[];
    publicKeyAlgorithm?: number;
    publicKey?: string;
  };
  authenticatorAttachment?: "platform" | "cross-platform";
  clientExtensionResults: Record<string, unknown>;
};
export type VerifyPasskeyRegistrationCommand = {
  credential: PasskeyRegistrationCredential;
  rememberDevice: boolean;
};
export type PasskeyRegistrationErrorCode =
  | "ORIGIN_NOT_ALLOWED"
  | "ENROLLMENT_AUTHORIZATION_REQUIRED"
  | "PASSKEY_REGISTRATION_FAILED"
  | "PASSKEY_REGISTRATION_STATE_CONFLICT"
  | "PASSKEY_REGISTRATION_RATE_LIMITED"
  | "PASSKEY_REGISTRATION_UNAVAILABLE";
