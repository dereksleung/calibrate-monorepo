import type {
  AccountEmailVerificationChallenge,
  AccountEmailVerificationResult,
} from "@calibrate/frontend-core/verticals/auth/models/account-email-verification";

import { z } from "zod";

// Browser history is untrusted input. These schemas describe web handoff state,
// independently of endpoint request/response contracts.
export const AccountEmailSchema = z.string().trim().toLowerCase().max(320).pipe(z.email());
const EmailHandoffSchema = z.object({ email: AccountEmailSchema }).strict();
const ChallengeHandoffSchema = z
  .object({
    challengeId: z.uuid(),
    expiresInSeconds: z.number().int().positive(),
    resendAfterSeconds: z.number().int().nonnegative(),
  })
  .strict();
const VerificationContinuationSchema = z.discriminatedUnion("next", [
  z.object({ next: z.literal("passkey-registration"), expiresAt: z.iso.datetime() }).strict(),
  z.object({ next: z.literal("login-or-recovery") }).strict(),
]);

export interface AccountEmailVerificationHandoff extends AccountEmailVerificationChallenge {
  email: string;
  requestedAtEpochMs: number;
}

export interface PasskeyEnrollmentHandoff {
  email: string;
  next: "passkey-registration";
  expiresAt: string;
}

export interface LoginRecoveryHandoff {
  email: string;
  next: "login-or-recovery";
}

declare module "@tanstack/history" {
  interface HistoryState {
    accountEmailVerification?: AccountEmailVerificationHandoff;
    passkeyEnrollment?: PasskeyEnrollmentHandoff;
    loginRecovery?: LoginRecoveryHandoff;
  }
}

export function createPasskeyEnrollmentHandoff(
  email: string,
  response: Extract<AccountEmailVerificationResult, { next: "passkey-registration" }>,
): PasskeyEnrollmentHandoff {
  const parsed = VerificationContinuationSchema.parse(response);
  if (parsed.next !== "passkey-registration") throw new Error("Invalid passkey enrollment continuation");
  return {
    email: EmailHandoffSchema.parse({ email }).email,
    ...parsed,
  };
}

export function parsePasskeyEnrollmentHandoff(value: unknown): PasskeyEnrollmentHandoff | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["email", "next", "expiresAt"].includes(key))) return null;
  const email = EmailHandoffSchema.safeParse({ email: candidate.email });
  const response = VerificationContinuationSchema.safeParse({
    next: candidate.next,
    expiresAt: candidate.expiresAt,
  });
  return email.success && response.success && response.data.next === "passkey-registration"
    ? { email: email.data.email, ...response.data }
    : null;
}

export function createLoginRecoveryHandoff(email: string): LoginRecoveryHandoff {
  return {
    email: EmailHandoffSchema.parse({ email }).email,
    next: "login-or-recovery",
  };
}

export function parseLoginRecoveryHandoff(value: unknown): LoginRecoveryHandoff | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["email", "next"].includes(key))) return null;
  const email = EmailHandoffSchema.safeParse({ email: candidate.email });
  return email.success && candidate.next === "login-or-recovery"
    ? { email: email.data.email, next: "login-or-recovery" }
    : null;
}

export function createAccountEmailVerificationHandoff(
  email: string,
  response: AccountEmailVerificationChallenge,
  requestedAtEpochMs = Date.now(),
): AccountEmailVerificationHandoff {
  const normalizedEmail = EmailHandoffSchema.parse({
    email,
  }).email;
  const metadata = ChallengeHandoffSchema.parse(response);

  if (!Number.isSafeInteger(requestedAtEpochMs) || requestedAtEpochMs < 0) {
    throw new Error("Invalid signup email verification request timestamp");
  }

  return {
    email: normalizedEmail,
    ...metadata,
    requestedAtEpochMs,
  };
}

export function parseAccountEmailVerificationHandoff(value: unknown): AccountEmailVerificationHandoff | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const expectedKeys = new Set([
    "email",
    "challengeId",
    "expiresInSeconds",
    "resendAfterSeconds",
    "requestedAtEpochMs",
  ]);

  if (Object.keys(candidate).some((key) => !expectedKeys.has(key))) return null;

  const email = EmailHandoffSchema.safeParse({
    email: candidate.email,
  });
  const metadata = ChallengeHandoffSchema.safeParse({
    challengeId: candidate.challengeId,
    expiresInSeconds: candidate.expiresInSeconds,
    resendAfterSeconds: candidate.resendAfterSeconds,
  });

  if (
    !email.success ||
    !metadata.success ||
    typeof candidate.requestedAtEpochMs !== "number" ||
    !Number.isSafeInteger(candidate.requestedAtEpochMs) ||
    candidate.requestedAtEpochMs < 0
  ) {
    return null;
  }

  return {
    email: email.data.email,
    ...metadata.data,
    requestedAtEpochMs: candidate.requestedAtEpochMs,
  };
}
