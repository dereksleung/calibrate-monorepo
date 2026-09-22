import {
  AuthenticatedSessionResponseSchema,
  LocalDevelopmentPasskeyEnrollmentResponseSchema,
  PasskeyAuthenticationOptionsResponseSchema,
  PasskeyRegistrationOptionsResponseSchema,
  VerifyPasskeyAuthenticationRequestBodySchema,
  VerifyPasskeyRegistrationRequestBodySchema,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";

export function requestPasskeyAuthenticationOptions(transport: ApiTransport) {
  return transport.request({
    path: "/auth/passkeys/authentication/options",
    method: "POST",
    responseBodySchema: PasskeyAuthenticationOptionsResponseSchema,
  });
}

export function verifyPasskeyAuthentication(transport: ApiTransport, input: unknown) {
  return transport.request({
    path: "/auth/passkeys/authentication/verify",
    method: "POST",
    body: VerifyPasskeyAuthenticationRequestBodySchema.parse(input),
    responseBodySchema: AuthenticatedSessionResponseSchema,
  });
}

export function requestPasskeyRegistrationOptions(transport: ApiTransport) {
  return transport.request({
    path: "/auth/passkeys/registration/options",
    method: "POST",
    responseBodySchema: PasskeyRegistrationOptionsResponseSchema,
  });
}

export function verifyPasskeyRegistration(transport: ApiTransport, input: unknown) {
  return transport.request({
    path: "/auth/passkeys/registration/verify",
    method: "POST",
    body: VerifyPasskeyRegistrationRequestBodySchema.parse(input),
    responseBodySchema: AuthenticatedSessionResponseSchema,
  });
}

export function requestLocalDevelopmentPasskeyEnrollment(transport: ApiTransport) {
  return transport.request({
    path: "/auth/local-development/passkey-enrollment",
    method: "POST",
    responseBodySchema: LocalDevelopmentPasskeyEnrollmentResponseSchema,
  });
}
