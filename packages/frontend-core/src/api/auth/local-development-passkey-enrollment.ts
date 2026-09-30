import {
  LocalDevelopmentPasskeyEnrollmentResponseSchema,
  type LocalDevelopmentPasskeyEnrollmentResponse,
} from "@calibrate/api-contracts";

import type { ApiTransport } from "../../transport.js";
import type { LocalDevelopmentPasskeyEnrollment } from "../../verticals/auth/models/local-development-passkey-enrollment.js";

/** Creates a loopback-only disposable passkey signup authorization. */
export async function requestLocalDevelopmentPasskeyEnrollment(
  transport: ApiTransport,
): Promise<LocalDevelopmentPasskeyEnrollmentResponse> {
  return LocalDevelopmentPasskeyEnrollmentResponseSchema.parse(
    await transport.request({
      path: "/auth/local-development/passkey-enrollment",
      method: "POST",
      responseBodySchema: LocalDevelopmentPasskeyEnrollmentResponseSchema,
    }),
  );
}

export function mapLocalDevelopmentPasskeyEnrollmentResponse(
  response: LocalDevelopmentPasskeyEnrollmentResponse,
): LocalDevelopmentPasskeyEnrollment {
  return { email: response.email, next: response.next, expiresAt: response.expiresAt };
}
