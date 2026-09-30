import { type MutationOptions, mutationOptions, useMutation } from "@tanstack/react-query";

import type { ApiTransport } from "../../transport.js";
import type { AuthenticatedUserContext } from "../../verticals/auth/models/authenticated-user-context.js";
import type {
  PasskeyRegistrationChallenge,
  VerifyPasskeyRegistrationCommand,
} from "../../verticals/auth/models/passkey-registration.js";

import {
  requestPasskeyRegistrationOptions as request,
  mapPasskeyRegistrationOptionsResponse,
} from "../../api/auth/request-passkey-registration-options.js";
import {
  verifyPasskeyRegistration as verify,
  mapVerifyPasskeyRegistrationResponse,
} from "../../api/auth/verify-passkey-registration.js";
export { parsePasskeyRegistrationError } from "../../api/auth/verify-passkey-registration.js";

export async function requestPasskeyRegistrationOptions(
  transport: ApiTransport,
): Promise<PasskeyRegistrationChallenge> {
  return mapPasskeyRegistrationOptionsResponse(await request(transport));
}
export async function verifyPasskeyRegistration(
  transport: ApiTransport,
  command: VerifyPasskeyRegistrationCommand,
): Promise<AuthenticatedUserContext> {
  return mapVerifyPasskeyRegistrationResponse(
    await verify(transport, { credential: command.credential, rememberDevice: command.rememberDevice }),
  );
}
export function getRequestPasskeyRegistrationOptionsMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyRegistrationChallenge, unknown, void>,
) {
  return mutationOptions({
    mutationKey: ["requestPasskeyRegistrationOptions"],
    mutationFn: () => requestPasskeyRegistrationOptions(transport),
    ...options,
  });
}

export function getVerifyPasskeyRegistrationMutationOptions(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyRegistrationCommand>,
) {
  return mutationOptions({
    mutationKey: ["verifyPasskeyRegistration"],
    mutationFn: (input: VerifyPasskeyRegistrationCommand) => verifyPasskeyRegistration(transport, input),
    retry: false,
    ...options,
  });
}

export function useRequestPasskeyRegistrationOptions(
  transport: ApiTransport,
  options?: MutationOptions<PasskeyRegistrationChallenge, unknown, void>,
) {
  return useMutation(getRequestPasskeyRegistrationOptionsMutationOptions(transport, options));
}

export function useVerifyPasskeyRegistration(
  transport: ApiTransport,
  options?: MutationOptions<AuthenticatedUserContext, unknown, VerifyPasskeyRegistrationCommand>,
) {
  return useMutation(getVerifyPasskeyRegistrationMutationOptions(transport, options));
}
