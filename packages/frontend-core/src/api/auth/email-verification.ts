import {
  RequestAccountEmailVerificationRequestBodySchema,
  RequestAccountEmailVerificationResponseSchema,
  VerifyAccountEmailVerificationRequestBodySchema,
  VerifyAccountEmailVerificationResponseSchema,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";

export function requestEmailVerification(transport: ApiTransport, input: unknown) {
  return transport.request({
    path: "/auth/email-verification",
    method: "POST",
    body: RequestAccountEmailVerificationRequestBodySchema.parse(input),
    responseBodySchema: RequestAccountEmailVerificationResponseSchema,
  });
}

export function verifyEmailVerification(transport: ApiTransport, input: unknown) {
  return transport.request({
    path: "/auth/email-verification/verify",
    method: "POST",
    body: VerifyAccountEmailVerificationRequestBodySchema.parse(input),
    responseBodySchema: VerifyAccountEmailVerificationResponseSchema,
  });
}
