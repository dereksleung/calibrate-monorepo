// @vitest-environment jsdom

import { routeTree } from "#/routeTree.gen.ts";
import { createQueryClient } from "#/shared/api/query-client.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => null,
}));

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}));

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderRoute(initialEntry: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry],
    }),
    defaultPreload: "intent",
    scrollRestoration: false,
  });

  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

describe("signup email verification routing", () => {
  it("requests an email and hands challenge state to the OTP route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
          expiresInSeconds: 600,
          resendAfterSeconds: 60,
        }),
        {
          status: 202,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const router = renderRoute("/signup-login");

    fireEvent.change(await screen.findByLabelText("Email Address"), {
      target: { value: " Person@Example.COM " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
    expect(screen.getByText("person@example.com")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/auth/otp");
    expect(router.state.location.searchStr).toBe("");
    expect(router.state.location.state.accountEmailVerification).toMatchObject({
      email: "person@example.com",
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url, "http://localhost").pathname).toBe("/api/v1/auth/email-verification");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "person@example.com",
    });
    expect(new Headers(init.headers).has("X-App-Platform")).toBe(false);
    expect(init.credentials).toBe("include");
  });

  it("redirects a direct OTP visit back to signup", async () => {
    const router = renderRoute("/auth/otp");

    expect(await screen.findByRole("heading", { name: "Sign Up or Log In" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/signup-login");
  });
});

describe("email confirmation through the core workflow", () => {
  async function requestChallenge(verificationBody: unknown, status = 200) {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
            expiresInSeconds: 600,
            resendAfterSeconds: 60,
          }),
          { status: 202, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(verificationBody), {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
    const router = renderRoute("/signup-login");
    fireEvent.change(await screen.findByLabelText("Email Address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));
    const input = await screen.findByLabelText("Verification code");
    fireEvent.change(input, { target: { value: "012345" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));
    return { fetch, router };
  }
  it.each([
    {
      next: "passkey-registration",
      expiresAt: "2030-01-01T00:05:00.000Z",
      path: "/auth/passkey-enrollment",
      heading: "Set up your passkey",
      stateKey: "passkeyEnrollment",
    },
    {
      next: "login-or-recovery",
      path: "/auth/login-recovery",
      heading: "Email verified",
      stateKey: "loginRecovery",
    },
  ])("hands $next metadata to its web route", async ({ next, expiresAt, path, heading, stateKey }) => {
    const response = next === "passkey-registration" ? { next, expiresAt } : { next };
    const { fetch, router } = await requestChallenge(response);
    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
    expect(router.state.location.pathname).toBe(path);
    expect(router.state.location.state[stateKey as "passkeyEnrollment" | "loginRecovery"]).toEqual({
      email: "person@example.com",
      ...response,
    });
    const [url, init] = fetch.mock.calls[1] as [string, RequestInit];
    expect(new URL(url, "http://localhost").pathname).toBe("/api/v1/auth/email-verification/verify");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      code: "012345",
    });
  });
  it.each(["INVALID_CODE", "EXPIRED_CODE"])("keeps OTP state on %s", async (error) => {
    const { fetch, router } = await requestChallenge({ error }, 400);
    expect((await screen.findByRole("alert")).textContent).toContain("invalid or has expired");
    expect(router.state.location.pathname).toBe("/auth/otp");
    expect(router.state.location.state.accountEmailVerification?.challengeId).toBe(
      "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
