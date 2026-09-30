// @vitest-environment jsdom
import { createQueryClient } from "#/shared/api/query-client";
import { authenticatedSessionQueryKey } from "@calibrate/frontend-core/verticals/auth/authenticated-session";
import { buildLocalDevelopmentPasskeyEnrollment } from "@calibrate/frontend-core/verticals/auth/models/__mocks__/local-development-passkey-enrollment";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupLoginPage } from "./SignupLoginPage";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => navigate,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function setup(body: unknown, status = 200) {
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const client = createQueryClient();
  render(
    <QueryClientProvider client={client}>
      <SignupLoginPage />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Authorize create passkey" }));
  return { client, fetch };
}
describe("Signup/Login local enrollment workflow handoff", () => {
  it("passes mapped metadata into router state without publishing a session", async () => {
    const expected = buildLocalDevelopmentPasskeyEnrollment();
    const { client, fetch } = setup(expected);
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce());
    const navigation = navigate.mock.calls[0][0];
    expect(navigation.to).toBe("/auth/passkey-enrollment");
    expect(navigation.state({ __TSR_index: 0 })).toEqual({ __TSR_index: 0, passkeyEnrollment: expected });
    expect(client.getQueryData(authenticatedSessionQueryKey)).toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/local-development\/passkey-enrollment$/),
      expect.objectContaining({ method: "POST", body: undefined, credentials: "include" }),
    );
  });
  it.each([403, 404, 429, 503])("shows a safe error for HTTP %s without navigation", async (status) => {
    const { fetch } = setup({ error: "private-backend-detail" }, status);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "We couldn't authorize local passkey setup. Please try again.",
    );
    expect(screen.queryByText("private-backend-detail")).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("rejects malformed metadata without navigation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setup({ ...buildLocalDevelopmentPasskeyEnrollment(), expiresAt: "invalid" });
    await screen.findByRole("alert");
    expect(navigate).not.toHaveBeenCalled();
  });
});
