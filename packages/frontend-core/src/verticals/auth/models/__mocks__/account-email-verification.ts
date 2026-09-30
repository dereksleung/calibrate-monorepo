import type {
  RequestAccountEmailVerificationCommand,
  VerifyAccountEmailVerificationCommand,
  AccountEmailVerificationChallenge,
  AccountEmailVerificationResult,
} from "../account-email-verification.js";
export function buildRequestAccountEmailVerificationCommand(
  overrides: Partial<RequestAccountEmailVerificationCommand> = {},
): RequestAccountEmailVerificationCommand {
  return { email: "person@example.com", ...overrides };
}
export function buildVerifyAccountEmailVerificationCommand(
  overrides: Partial<VerifyAccountEmailVerificationCommand> = {},
): VerifyAccountEmailVerificationCommand {
  return { challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff", code: "012345", ...overrides };
}
export function buildAccountEmailVerificationChallenge(
  overrides: Partial<AccountEmailVerificationChallenge> = {},
): AccountEmailVerificationChallenge {
  return {
    challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
    ...overrides,
  };
}
export function buildAccountEmailVerificationResult(
  next: AccountEmailVerificationResult["next"] = "passkey-registration",
): AccountEmailVerificationResult {
  return next === "passkey-registration" ? { next, expiresAt: "2030-01-01T00:05:00.000Z" } : { next };
}
