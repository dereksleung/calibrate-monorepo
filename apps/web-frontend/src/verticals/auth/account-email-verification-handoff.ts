import type {
  EmailVerificationChallenge,
  PasskeyRegistrationContinuation,
} from "@calibrate/frontend-core/verticals/auth/models/email-verification";
import {
  isEmailVerificationChallenge,
  isPasskeyRegistrationContinuation,
  normalizeEmailVerificationEmail,
  parseEmailVerificationEmail,
} from "@calibrate/frontend-core/feature-workflows/auth/email-verification";

export interface AccountEmailVerificationHandoff extends EmailVerificationChallenge {
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
  response: PasskeyRegistrationContinuation,
): PasskeyEnrollmentHandoff {
  if (!isPasskeyRegistrationContinuation(response)) throw new Error("Invalid passkey enrollment continuation");
  const normalizedEmail = normalizeEmailVerificationEmail(email);
  return {
    email: normalizedEmail,
    ...response,
  };
}

export function parsePasskeyEnrollmentHandoff(value: unknown): PasskeyEnrollmentHandoff | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["email", "next", "expiresAt"].includes(key))) return null;
  const email = parseEmailVerificationEmail(candidate.email);
  const response = {
    next: candidate.next,
    expiresAt: candidate.expiresAt,
  };
  return email && isPasskeyRegistrationContinuation(response)
    ? { email, ...response }
    : null;
}

export function createLoginRecoveryHandoff(email: string): LoginRecoveryHandoff {
  const normalizedEmail = normalizeEmailVerificationEmail(email);
  return {
    email: normalizedEmail,
    next: "login-or-recovery",
  };
}

export function parseLoginRecoveryHandoff(value: unknown): LoginRecoveryHandoff | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["email", "next"].includes(key))) return null;
  const email = parseEmailVerificationEmail(candidate.email);
  return email && candidate.next === "login-or-recovery"
    ? { email, next: "login-or-recovery" }
    : null;
}

export function createAccountEmailVerificationHandoff(
  email: string,
  response: EmailVerificationChallenge,
  requestedAtEpochMs = Date.now(),
): AccountEmailVerificationHandoff {
  const normalizedEmail = normalizeEmailVerificationEmail(email);
  if (!isEmailVerificationChallenge(response)) throw new Error("Invalid email verification handoff");

  if (!Number.isSafeInteger(requestedAtEpochMs) || requestedAtEpochMs < 0) {
    throw new Error("Invalid signup email verification request timestamp");
  }

  return {
    email: normalizedEmail,
    ...response,
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

  const email = parseEmailVerificationEmail(candidate.email);
  const metadata = {
    challengeId: candidate.challengeId,
    expiresInSeconds: candidate.expiresInSeconds,
    resendAfterSeconds: candidate.resendAfterSeconds,
  };

  if (
    !email ||
    !isEmailVerificationChallenge(metadata) ||
    typeof candidate.requestedAtEpochMs !== "number" ||
    !Number.isSafeInteger(candidate.requestedAtEpochMs) ||
    candidate.requestedAtEpochMs < 0
  ) {
    return null;
  }

  return {
    email,
    ...metadata,
    requestedAtEpochMs: candidate.requestedAtEpochMs,
  };
}
