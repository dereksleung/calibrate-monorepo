import { mutationOptions, useMutation, type MutationOptions } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type {
  RequestAccountEmailVerificationCommand,
  VerifyAccountEmailVerificationCommand,
  AccountEmailVerificationChallenge,
  AccountEmailVerificationResult,
} from "../../verticals/auth/models/account-email-verification.js";

import {
  requestAccountEmailVerification as request,
  mapRequestAccountEmailVerificationResponse,
} from "../../api/auth/request-account-email-verification.js";
import {
  verifyAccountEmailVerification as verify,
  mapVerifyAccountEmailVerificationResponse,
} from "../../api/auth/verify-account-email-verification.js";

export async function requestAccountEmailVerification(
  transport: ApiTransport,
  command: RequestAccountEmailVerificationCommand,
): Promise<AccountEmailVerificationChallenge> {
  return mapRequestAccountEmailVerificationResponse(await request(transport, { email: command.email }));
}
export async function verifyAccountEmailVerification(
  transport: ApiTransport,
  command: VerifyAccountEmailVerificationCommand,
): Promise<AccountEmailVerificationResult> {
  return mapVerifyAccountEmailVerificationResponse(
    await verify(transport, { challengeId: command.challengeId, code: command.code }),
  );
}
export function getRequestAccountEmailVerificationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<AccountEmailVerificationChallenge, unknown, string>,
) {
  return mutationOptions({
    mutationKey: ["requestAccountEmailVerification"],
    mutationFn: (email: string) => requestAccountEmailVerification(transport, { email }),
    ...options,
  });
}
export function useRequestAccountEmailVerification(
  transport: ApiTransport,
  options?: MutationOptions<AccountEmailVerificationChallenge, unknown, string>,
) {
  return useMutation(getRequestAccountEmailVerificationMutationOptions(transport, options));
}
export function getVerifyAccountEmailVerificationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<AccountEmailVerificationResult, unknown, VerifyAccountEmailVerificationCommand>,
) {
  return mutationOptions({
    mutationKey: ["verifyAccountEmailVerification"],
    mutationFn: (command: VerifyAccountEmailVerificationCommand) =>
      verifyAccountEmailVerification(transport, command),
    retry: false,
    ...options,
  });
}
export function useVerifyAccountEmailVerification(
  transport: ApiTransport,
  options?: MutationOptions<AccountEmailVerificationResult, unknown, VerifyAccountEmailVerificationCommand>,
) {
  return useMutation(getVerifyAccountEmailVerificationMutationOptions(transport, options));
}
