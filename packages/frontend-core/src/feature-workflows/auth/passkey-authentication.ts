import { PasskeyAuthenticationErrorResponseSchema } from "@calibrate/api-contracts";
import { type MutationOptions, mutationOptions, useMutation } from "@tanstack/react-query";

import {
  requestPasskeyAuthenticationOptions as requestPasskeyAuthenticationOptionsApi,
  verifyPasskeyAuthentication as verifyPasskeyAuthenticationApi,
} from "../../api/auth/passkeys.js";
import { ApiError } from "../../errors.js";
import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import type {
  PasskeyAuthenticationErrorCode,
  PasskeyAuthenticationOptions,
  VerifyPasskeyAuthenticationInput,
} from "../../verticals/auth/models/passkeys.js";
import { toAuthenticatedUserContext } from "./authenticated-user-context.js";

export async function requestPasskeyAuthenticationOptions(
  transport: ApiTransport,
): Promise<PasskeyAuthenticationOptions> {
  return await requestPasskeyAuthenticationOptionsApi(transport);
}

export async function verifyPasskeyAuthentication(
  transport: ApiTransport,
  input: VerifyPasskeyAuthenticationInput,
): Promise<AuthenticatedUserContext> {
  return toAuthenticatedUserContext(await verifyPasskeyAuthenticationApi(transport, input));
}

export function parsePasskeyAuthenticationError(error: unknown): PasskeyAuthenticationErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  const parsed = PasskeyAuthenticationErrorResponseSchema.safeParse(error.body);
  return parsed.success ? parsed.data.error : null;
}

export function getRequestPasskeyAuthenticationOptionsMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyAuthenticationOptions, unknown, void>,
) {
  return mutationOptions({
    mutationKey: ["requestPasskeyAuthenticationOptions"],
    mutationFn: () => requestPasskeyAuthenticationOptions(transport),
    retry: false,
    ...options,
  });
}

export function getVerifyPasskeyAuthenticationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyAuthenticationInput>,
) {
  return mutationOptions({
    mutationKey: ["verifyPasskeyAuthentication"],
    mutationFn: (input: VerifyPasskeyAuthenticationInput) => verifyPasskeyAuthentication(transport, input),
    retry: false,
    ...options,
  });
}

export function useRequestPasskeyAuthenticationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyAuthenticationOptions, unknown, void>,
) {
  return useMutation(getRequestPasskeyAuthenticationOptionsMutationOptions(transport, options));
}

export function useVerifyPasskeyAuthentication(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyAuthenticationInput>,
) {
  return useMutation(getVerifyPasskeyAuthenticationMutationOptions(transport, options));
}
