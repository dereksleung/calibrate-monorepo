import type { LocalDevelopmentPasskeyEnrollment } from "../local-development-passkey-enrollment.js";

export function buildLocalDevelopmentPasskeyEnrollment(
  overrides: Partial<LocalDevelopmentPasskeyEnrollment> = {},
): LocalDevelopmentPasskeyEnrollment {
  return {
    email: "local-123@example.test",
    next: "passkey-registration",
    expiresAt: "2030-01-01T00:05:00.000Z",
    ...overrides,
  };
}
