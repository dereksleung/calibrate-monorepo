import {
  VerifyAccountEmailVerificationRequestBodySchema,
  VerifyAccountEmailVerificationResponseSchema,
  type VerifyAccountEmailVerificationRequestBody,
  type VerifyAccountEmailVerificationResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { AccountEmailVerificationResult } from "../../verticals/auth/models/account-email-verification.js";

export async function verifyAccountEmailVerification(
  transport: ApiTransport,
  input: VerifyAccountEmailVerificationRequestBody,
): Promise<VerifyAccountEmailVerificationResponse> {
  const body = VerifyAccountEmailVerificationRequestBodySchema.parse(input);
  return VerifyAccountEmailVerificationResponseSchema.parse(
    await transport.request({
      path: "/auth/email-verification/verify",
      method: "POST",
      body,
      responseBodySchema: VerifyAccountEmailVerificationResponseSchema,
    }),
  );
}
export function mapVerifyAccountEmailVerificationResponse(
  response: VerifyAccountEmailVerificationResponse,
): AccountEmailVerificationResult {
  return response.next === "passkey-registration"
    ? { next: response.next, expiresAt: response.expiresAt }
    : { next: response.next };
}
