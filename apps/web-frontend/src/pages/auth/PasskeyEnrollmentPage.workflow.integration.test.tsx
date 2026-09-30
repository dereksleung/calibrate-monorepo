// @vitest-environment jsdom
import { createQueryClient } from "#/shared/api/query-client";
import { authenticatedSessionQueryKey } from "@calibrate/frontend-core/verticals/auth/authenticated-session";
import {
  buildPasskeyRegistrationChallenge,
  buildVerifyPasskeyRegistrationCommand,
  buildPasskeyRegistrationResult,
} from "@calibrate/frontend-core/verticals/auth/models/__mocks__/passkey-registration";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasskeyEnrollmentPage } from "./PasskeyEnrollmentPage";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => navigate,
}));
beforeEach(() => {
  vi.stubGlobal("PublicKeyCredential", { isUserVerifyingPlatformAuthenticatorAvailable: async () => true });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const challenge = buildPasskeyRegistrationChallenge();
const command = buildVerifyPasskeyRegistrationCommand({ rememberDevice: false });
function setup(failure?: "options" | "verify") {
  const order: string[] = [];
  const context = buildPasskeyRegistrationResult();
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    expect(init?.credentials).toBe("include");
    expect(init?.method).toBe("POST");
    const step = String(input).endsWith("/options") ? "options" : "verify";
    order.push(step);
    if (step === "options") expect(init?.body).toBeUndefined();
    else expect(JSON.parse(String(init?.body))).toEqual(command);
    return new Response(
      JSON.stringify(
        step === failure
          ? { error: "ENROLLMENT_AUTHORIZATION_REQUIRED" }
          : step === "options"
            ? challenge.options
            : {
                ...context,
                user: {
                  ...context.user,
                  createdAt: context.user.createdAt.toISOString(),
                  updatedAt: context.user.updatedAt.toISOString(),
                },
              },
      ),
      { status: step === failure ? 401 : 200, headers: { "content-type": "application/json" } },
    );
  });
  const createPasskey = vi.fn(async (options) => {
    order.push("browser");
    expect(options).toEqual(challenge.options);
    return command.credential;
  });
  const client = createQueryClient();
  render(
    <QueryClientProvider client={client}>
      <PasskeyEnrollmentPage
        handoff={{
          email: "person@example.com",
          next: "passkey-registration",
          expiresAt: "2030-01-01T00:05:00.000Z",
        }}
        browserRegistration={{ createPasskey }}
      />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /keep me signed in/i }));
  fireEvent.click(screen.getByRole("button", { name: /create passkey/i }));
  return { order, fetch, client, createPasskey };
}
describe("enrollment core workflow handoff", () => {
  it("requests options, runs WebAuthn, verifies once, then navigates through the session gate", async () => {
    const { order, client, fetch } = setup();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(order).toEqual(["options", "browser", "verify"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(authenticatedSessionQueryKey)).toBeUndefined();
  });
  it.each(["options", "verify"] as const)(
    "preserves %s failure without retrying or navigating",
    async (step) => {
      const { order, createPasskey } = setup(step);
      await screen.findByText(/enrollment authorization expired or can no longer be used/i);
      expect(order).toEqual(step === "options" ? ["options"] : ["options", "browser", "verify"]);
      expect(createPasskey).toHaveBeenCalledTimes(step === "options" ? 0 : 1);
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});
