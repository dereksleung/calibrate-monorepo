import { type MutationOptions, mutationOptions, useMutation } from "@tanstack/react-query";
import {
  RequestAccountEmailVerificationRequestBodySchema,
  RequestAccountEmailVerificationResponseSchema,
  VerifyAccountEmailVerificationResponseSchema,
} from "@calibrate/api-contracts";

import {
  requestEmailVerification as requestEmailVerificationApi,
  verifyEmailVerification as verifyEmailVerificationApi,
} from "../../api/auth/email-verification.js";
import type {
  EmailVerificationChallenge,
  EmailVerificationContinuation,
  RequestEmailVerificationInput,
  VerifyEmailVerificationInput,
} from "../../verticals/auth/models/email-verification.js";
import type { ApiTransport } from "../../transport.js";

function toEmailVerificationChallenge(response: {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}): EmailVerificationChallenge {
  return response;
}

function toEmailVerificationContinuation(response: {
  next: "passkey-registration";
  expiresAt: string;
} | { next: "login-or-recovery" }): EmailVerificationContinuation {
  return response;
}

/** Normalizes an email before it is retained in host-owned navigation state. */
export function normalizeEmailVerificationEmail(email: string): string {
  return RequestAccountEmailVerificationRequestBodySchema.parse({ email }).email;
}

export function parseEmailVerificationEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = RequestAccountEmailVerificationRequestBodySchema.safeParse({ email: value });
  return result.success ? result.data.email : null;
}

export function getEmailVerificationEmailError(email: string): string | undefined {
  const result = RequestAccountEmailVerificationRequestBodySchema.shape.email.safeParse(email);
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function isEmailVerificationChallenge(value: unknown): value is EmailVerificationChallenge {
  return RequestAccountEmailVerificationResponseSchema.safeParse(value).success;
}

export function isPasskeyRegistrationContinuation(value: unknown): value is Extract<
  EmailVerificationContinuation,
  { next: "passkey-registration" }
> {
  const result = VerifyAccountEmailVerificationResponseSchema.safeParse(value);
  return result.success && result.data.next === "passkey-registration";
}

export async function requestEmailVerification(
  transport: ApiTransport,
  input: RequestEmailVerificationInput,
): Promise<EmailVerificationChallenge> {
  return toEmailVerificationChallenge(await requestEmailVerificationApi(transport, input));
}

export async function verifyEmailVerification(
  transport: ApiTransport,
  input: VerifyEmailVerificationInput,
): Promise<EmailVerificationContinuation> {
  return toEmailVerificationContinuation(await verifyEmailVerificationApi(transport, input));
}

export function getRequestEmailVerificationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<EmailVerificationChallenge, unknown, string>,
) {
  return mutationOptions({
    mutationKey: ["requestEmailVerification"],
    mutationFn: (email: string) => requestEmailVerification(transport, { email }),
    ...options,
  });
}

export function useRequestEmailVerification(
  transport: ApiTransport,
  options?: MutationOptions<EmailVerificationChallenge, unknown, string>,
) {
  return useMutation(getRequestEmailVerificationMutationOptions(transport, options));
}

export function getVerifyEmailVerificationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<EmailVerificationContinuation, unknown, VerifyEmailVerificationInput>,
) {
  return mutationOptions({
    mutationKey: ["verifyEmailVerification"],
    mutationFn: (input: VerifyEmailVerificationInput) => verifyEmailVerification(transport, input),
    retry: false,
    ...options,
  });
}

export function useVerifyEmailVerification(
  transport: ApiTransport,
  options?: MutationOptions<EmailVerificationContinuation, unknown, VerifyEmailVerificationInput>,
) {
  return useMutation(getVerifyEmailVerificationMutationOptions(transport, options));
}
