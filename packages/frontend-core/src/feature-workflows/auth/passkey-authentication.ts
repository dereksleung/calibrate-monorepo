import { type MutationOptions, mutationOptions, useMutation } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import type {
  PasskeyAuthenticationChallenge,
  VerifyPasskeyAuthenticationCommand,
} from "../../verticals/auth/models/passkey-authentication.js";

import {
  requestPasskeyAuthenticationOptions as request,
  mapPasskeyAuthenticationOptionsResponse,
} from "../../api/auth/request-passkey-authentication-options.js";
import {
  verifyPasskeyAuthentication as verify,
  mapVerifyPasskeyAuthenticationResponse,
} from "../../api/auth/verify-passkey-authentication.js";
export { parsePasskeyAuthenticationError } from "../../api/auth/verify-passkey-authentication.js";

export async function requestPasskeyAuthenticationOptions(
  transport: ApiTransport,
): Promise<PasskeyAuthenticationChallenge> {
  return mapPasskeyAuthenticationOptionsResponse(await request(transport));
}
export async function verifyPasskeyAuthentication(
  transport: ApiTransport,
  command: VerifyPasskeyAuthenticationCommand,
): Promise<AuthenticatedUserContext> {
  return mapVerifyPasskeyAuthenticationResponse(
    await verify(transport, { credential: command.credential, rememberDevice: command.rememberDevice }),
  );
}
export function getRequestPasskeyAuthenticationOptionsMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyAuthenticationChallenge, unknown, void>,
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
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyAuthenticationCommand>,
) {
  return mutationOptions({
    mutationKey: ["verifyPasskeyAuthentication"],
    mutationFn: (input: VerifyPasskeyAuthenticationCommand) => verifyPasskeyAuthentication(transport, input),
    retry: false,
    ...options,
  });
}

export function useRequestPasskeyAuthenticationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyAuthenticationChallenge, unknown, void>,
) {
  return useMutation(getRequestPasskeyAuthenticationOptionsMutationOptions(transport, options));
}

export function useVerifyPasskeyAuthentication(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyAuthenticationCommand>,
) {
  return useMutation(getVerifyPasskeyAuthenticationMutationOptions(transport, options));
}
