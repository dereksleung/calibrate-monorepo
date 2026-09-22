import { requestLocalDevelopmentPasskeyEnrollment as requestLocalDevelopmentPasskeyEnrollmentApi } from "../../api/auth/passkeys.js";
import type { ApiTransport } from "../../transport.js";
import type { LocalDevelopmentPasskeyEnrollment } from "../../verticals/auth/models/email-verification.js";

export async function requestLocalDevelopmentPasskeyEnrollment(
  transport: ApiTransport,
): Promise<LocalDevelopmentPasskeyEnrollment> {
  return await requestLocalDevelopmentPasskeyEnrollmentApi(transport);
}
