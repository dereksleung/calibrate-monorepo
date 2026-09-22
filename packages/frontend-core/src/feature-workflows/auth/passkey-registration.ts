import { PasskeyRegistrationErrorResponseSchema } from "@calibrate/api-contracts";
import { type MutationOptions, mutationOptions, useMutation } from "@tanstack/react-query";

import {
  requestPasskeyRegistrationOptions as requestPasskeyRegistrationOptionsApi,
  verifyPasskeyRegistration as verifyPasskeyRegistrationApi,
} from "../../api/auth/passkeys.js";
import { ApiError } from "../../errors.js";
import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import type {
  PasskeyRegistrationErrorCode,
  PasskeyRegistrationOptions,
  VerifyPasskeyRegistrationInput,
} from "../../verticals/auth/models/passkeys.js";
import { toAuthenticatedUserContext } from "./authenticated-user-context.js";

export async function requestPasskeyRegistrationOptions(
  transport: ApiTransport,
): Promise<PasskeyRegistrationOptions> {
  return await requestPasskeyRegistrationOptionsApi(transport);
}

export async function verifyPasskeyRegistration(
  transport: ApiTransport,
  input: VerifyPasskeyRegistrationInput,
): Promise<AuthenticatedUserContext> {
  return toAuthenticatedUserContext(await verifyPasskeyRegistrationApi(transport, input));
}

export function parsePasskeyRegistrationError(error: unknown): PasskeyRegistrationErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  const parsed = PasskeyRegistrationErrorResponseSchema.safeParse(error.body);
  return parsed.success ? parsed.data.error : null;
}

export function getRequestPasskeyRegistrationOptionsMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyRegistrationOptions, unknown, void>,
) {
  return mutationOptions({
    mutationKey: ["requestPasskeyRegistrationOptions"],
    mutationFn: () => requestPasskeyRegistrationOptions(transport),
    ...options,
  });
}

export function getVerifyPasskeyRegistrationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyRegistrationInput>,
) {
  return mutationOptions({
    mutationKey: ["verifyPasskeyRegistration"],
    mutationFn: (input: VerifyPasskeyRegistrationInput) => verifyPasskeyRegistration(transport, input),
    retry: false,
    ...options,
  });
}

export function useRequestPasskeyRegistrationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyRegistrationOptions, unknown, void>,
) {
  return useMutation(getRequestPasskeyRegistrationOptionsMutationOptions(transport, options));
}

export function useVerifyPasskeyRegistration(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyRegistrationInput>,
) {
  return useMutation(getVerifyPasskeyRegistrationMutationOptions(transport, options));
}
