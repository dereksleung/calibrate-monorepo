import {
  RequestAccountEmailVerificationRequestBodySchema,
  RequestAccountEmailVerificationResponseSchema,
  type RequestAccountEmailVerificationRequestBody,
  type RequestAccountEmailVerificationResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { AccountEmailVerificationChallenge } from "../../verticals/auth/models/account-email-verification.js";

export async function requestAccountEmailVerification(
  transport: ApiTransport,
  input: RequestAccountEmailVerificationRequestBody,
): Promise<RequestAccountEmailVerificationResponse> {
  const body = RequestAccountEmailVerificationRequestBodySchema.parse(input);
  return RequestAccountEmailVerificationResponseSchema.parse(
    await transport.request({
      path: "/auth/email-verification",
      method: "POST",
      body,
      responseBodySchema: RequestAccountEmailVerificationResponseSchema,
    }),
  );
}
export function mapRequestAccountEmailVerificationResponse(
  response: RequestAccountEmailVerificationResponse,
): AccountEmailVerificationChallenge {
  return {
    challengeId: response.challengeId,
    expiresInSeconds: response.expiresInSeconds,
    resendAfterSeconds: response.resendAfterSeconds,
  };
}
