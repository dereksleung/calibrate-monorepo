import type { ApiTransport } from "../../transport.js";
import type { LocalDevelopmentPasskeyEnrollment } from "../../verticals/auth/models/local-development-passkey-enrollment.js";

import {
  requestLocalDevelopmentPasskeyEnrollment as request,
  mapLocalDevelopmentPasskeyEnrollmentResponse,
} from "../../api/auth/local-development-passkey-enrollment.js";

export async function requestLocalDevelopmentPasskeyEnrollment(
  transport: ApiTransport,
): Promise<LocalDevelopmentPasskeyEnrollment> {
  return mapLocalDevelopmentPasskeyEnrollmentResponse(await request(transport));
}
