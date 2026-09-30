// @vitest-environment jsdom

import { createQueryClient } from "#/shared/api/query-client";
import { ApiError } from "@calibrate/frontend-core/errors";
import { buildLocalDevelopmentPasskeyEnrollment } from "@calibrate/frontend-core/verticals/auth/models/__mocks__/local-development-passkey-enrollment";
import {
  buildPasskeyAuthenticationChallenge,
  buildVerifyPasskeyAuthenticationCommand,
} from "@calibrate/frontend-core/verticals/auth/models/__mocks__/passkey-authentication";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupLoginPage, SignUpLoginForm } from "./SignupLoginPage";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  cleanup();
  vi.clearAllMocks();
  mockConditionalPasskeyAuthenticationSupported.mockResolvedValue(false);
});

const {
  mockCancelPasskeyAuthentication,
  mockMutateAsync,
  mockConditionalPasskeyAuthenticationSupported,
  mockGetDayLogCacheLogoutRecoveryPending,
  mockNavigate,
  mockRequestPasskeyAuthenticationOptions,
  mockRequestLocalDevelopmentPasskeyEnrollment,
  mockRetryDayLogCacheLogoutRecovery,
  mockStartLocalDevelopmentTestSession,
  mockStartPasskeyAuthentication,
  mockVerifyPasskeyAuthentication,
} = vi.hoisted(() => ({
  mockCancelPasskeyAuthentication: vi.fn(),
  mockMutateAsync: vi.fn(),
  mockConditionalPasskeyAuthenticationSupported: vi.fn(async () => false),
  mockGetDayLogCacheLogoutRecoveryPending: vi.fn<() => Promise<unknown[]>>(async () => []),
  mockNavigate: vi.fn(),
  mockRequestPasskeyAuthenticationOptions: vi.fn(),
  mockRequestLocalDevelopmentPasskeyEnrollment: vi.fn(),
  mockRetryDayLogCacheLogoutRecovery: vi.fn(async () => true),
  mockStartLocalDevelopmentTestSession: vi.fn(),
  mockStartPasskeyAuthentication: vi.fn(),
  mockVerifyPasskeyAuthentication: vi.fn(),
}));

vi.mock(
  "@calibrate/frontend-core/feature-workflows/auth/account-email-verification",
  async (importOriginal) => {
    const original = (await importOriginal()) as object;
    return {
      ...original,
      useRequestAccountEmailVerification: vi.fn(() => ({
        mutateAsync: mockMutateAsync,
      })),
    };
  },
);

vi.mock(
  "@calibrate/frontend-core/feature-workflows/auth/local-development-passkey-enrollment",
  async (importOriginal) => {
    const original = (await importOriginal()) as object;
    return {
      ...original,
      requestLocalDevelopmentPasskeyEnrollment: mockRequestLocalDevelopmentPasskeyEnrollment,
    };
  },
);

vi.mock("@calibrate/frontend-core/feature-workflows/auth/passkey-authentication", async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    requestPasskeyAuthenticationOptions: mockRequestPasskeyAuthenticationOptions,
    verifyPasskeyAuthentication: mockVerifyPasskeyAuthentication,
  };
});

vi.mock(
  "@calibrate/frontend-core/feature-workflows/auth/start-local-development-test-session",
  async (importOriginal) => {
    const original = (await importOriginal()) as object;
    return {
      ...original,
      startLocalDevelopmentTestSession: mockStartLocalDevelopmentTestSession,
    };
  },
);

vi.mock("#/verticals/auth/browser-passkey-authentication-adapter", () => ({
  cancelPasskeyAuthentication: mockCancelPasskeyAuthentication,
  isBrowserPasskeyAuthenticationSupported: () => true,
  isConditionalPasskeyAuthenticationSupported: mockConditionalPasskeyAuthenticationSupported,
  isPasskeyAuthenticationCancellation: (error: { name?: string }) => error?.name === "NotAllowedError",
  startPasskeyAuthentication: mockStartPasskeyAuthentication,
}));

vi.mock("#/verticals/day-log-cache/indexed-db-day-log-cache-logout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#/verticals/day-log-cache/indexed-db-day-log-cache-logout")>()),
  getDayLogCacheLogoutRecoveryPending: mockGetDayLogCacheLogoutRecoveryPending,
  retryDayLogCacheLogoutRecovery: mockRetryDayLogCacheLogoutRecovery,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = (await importOriginal()) as any;
  return {
    ...original,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

describe("SignupLoginPage", () => {
  it("presents the first signup step", () => {
    expect(typeof SignupLoginPage).toBe("function");
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Sign Up or Log In" })).toBeTruthy();
    expect(screen.getByText(/Enter your email and we'll send a code to continue./i)).toBeTruthy();
  });

  it("hides local enrollment when the development build flag is off", () => {
    vi.stubEnv("DEV", false);
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Authorize create passkey" })).toBeNull();
    expect(mockRequestLocalDevelopmentPasskeyEnrollment).not.toHaveBeenCalled();
  });

  it("offers local logout recovery for a server-confirmed logout", async () => {
    const record = {
      accountId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      operationId: "logout-operation",
      phase: "server-logout-confirmed" as const,
      targetGeneration: 1,
    };
    mockGetDayLogCacheLogoutRecoveryPending.mockResolvedValueOnce([record]).mockResolvedValueOnce([]);
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/couldn't complete secure cleanup for your private Day Log data/i),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry secure cleanup" }));

    await waitFor(() =>
      expect(mockRetryDayLogCacheLogoutRecovery).toHaveBeenCalledWith(record.accountId, record.operationId),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry secure cleanup" })).toBeNull());
  });

  it("authorizes a local passkey signup and navigates to enrollment", async () => {
    mockRequestLocalDevelopmentPasskeyEnrollment.mockResolvedValue(buildLocalDevelopmentPasskeyEnrollment());
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(
        "Local-environment-only - Authorize creating passkey for Sign Up - as you can't send yourself an email first with my API key",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Authorize create passkey" }));

    await waitFor(() => {
      expect(mockRequestLocalDevelopmentPasskeyEnrollment).toHaveBeenCalledOnce();
    });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/auth/passkey-enrollment",
      state: expect.any(Function),
    });

    const stateUpdater = mockNavigate.mock.calls.at(-1)?.[0].state;
    expect(stateUpdater({ __TSR_index: 0 })).toEqual({
      __TSR_index: 0,
      passkeyEnrollment: {
        email: "local-123@example.test",
        next: "passkey-registration",
        expiresAt: "2030-01-01T00:05:00.000Z",
      },
    });
  });

  it("defers publishing a local test session to the restoration gate", async () => {
    mockStartLocalDevelopmentTestSession.mockResolvedValue({
      user: {
        id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        email: "local-test-session@example.test",
        tier: "FREE",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
      },
      sessionTransport: "cookie",
    });
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Local test session" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start local test session" }));

    await waitFor(() => {
      expect(mockStartLocalDevelopmentTestSession).toHaveBeenCalledOnce();
    });
    expect(queryClient.getQueryData(["authenticatedSession"])).toBeUndefined();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("shows a safe error when the local test session cannot be created", async () => {
    mockStartLocalDevelopmentTestSession.mockRejectedValue(new Error("backend detail"));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start local test session" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We couldn't start a local test session. Please try again.",
    );
    expect(screen.queryByText("backend detail")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows a safe error when local authorization cannot be created", async () => {
    mockRequestLocalDevelopmentPasskeyEnrollment.mockRejectedValue(new Error("backend detail"));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Authorize create passkey" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We couldn't authorize local passkey setup. Please try again.",
    );
    expect(screen.queryByText("backend detail")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("requests a challenge, obtains an assertion, verifies it, then navigates", async () => {
    const challenge = buildPasskeyAuthenticationChallenge();
    const command = buildVerifyPasskeyAuthenticationCommand({ rememberDevice: false });
    mockRequestPasskeyAuthenticationOptions.mockResolvedValue(challenge);
    mockStartPasskeyAuthentication.mockResolvedValue(command.credential);
    mockVerifyPasskeyAuthentication.mockResolvedValue({ sessionTransport: "cookie" });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /keep me signed in/i }));
    fireEvent.click(screen.getByRole("button", { name: /log in with passkey/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/" }));
    expect(mockStartPasskeyAuthentication).toHaveBeenCalledWith(challenge.options, "explicit");
    expect(mockVerifyPasskeyAuthentication).toHaveBeenCalledWith(expect.any(Object), command);
    expect(mockRequestPasskeyAuthenticationOptions.mock.invocationCallOrder[0]).toBeLessThan(
      mockStartPasskeyAuthentication.mock.invocationCallOrder[0],
    );
    expect(mockStartPasskeyAuthentication.mock.invocationCallOrder[0]).toBeLessThan(
      mockVerifyPasskeyAuthentication.mock.invocationCallOrder[0],
    );
    expect(mockVerifyPasskeyAuthentication.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
  });

  it.each([false, true])(
    "reuses a cancelled challenge only while it is valid (expired: %s)",
    async (expired) => {
      const challenge = buildPasskeyAuthenticationChallenge();
      mockRequestPasskeyAuthenticationOptions.mockResolvedValue(challenge);
      mockStartPasskeyAuthentication.mockRejectedValue({ name: "NotAllowedError" });
      render(
        <QueryClientProvider client={createQueryClient()}>
          <SignupLoginPage />
        </QueryClientProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: /log in with passkey/i }));
      await waitFor(() => expect(mockStartPasskeyAuthentication).toHaveBeenCalledOnce());
      await waitFor(() =>
        expect(
          (screen.getByRole("button", { name: /log in with passkey/i }) as HTMLButtonElement).disabled,
        ).toBe(false),
      );
      if (expired) challenge.expiresAt = new Date(0);
      fireEvent.click(screen.getByRole("button", { name: /log in with passkey/i }));
      await waitFor(() => expect(mockStartPasskeyAuthentication).toHaveBeenCalledTimes(2));
      expect(mockRequestPasskeyAuthenticationOptions).toHaveBeenCalledTimes(expired ? 2 : 1);
      expect(mockVerifyPasskeyAuthentication).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    },
  );

  it("hands conditional authentication to the browser and cancels on unmount", async () => {
    const challenge = buildPasskeyAuthenticationChallenge();
    mockConditionalPasskeyAuthenticationSupported.mockResolvedValue(true);
    mockRequestPasskeyAuthenticationOptions.mockResolvedValue(challenge);
    mockStartPasskeyAuthentication.mockRejectedValue({ name: "NotAllowedError" });
    const view = render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(mockStartPasskeyAuthentication).toHaveBeenCalledWith(challenge.options, "conditional"),
    );
    view.unmount();
    expect(mockCancelPasskeyAuthentication).toHaveBeenCalledOnce();
    expect(mockVerifyPasskeyAuthentication).not.toHaveBeenCalled();
  });

  it("counts down before allowing another passkey request after rate limiting", async () => {
    vi.useFakeTimers();
    mockRequestPasskeyAuthenticationOptions.mockRejectedValue(
      new ApiError({
        status: 429,
        statusText: "Too Many Requests",
        body: { error: "PASSKEY_AUTHENTICATION_RATE_LIMITED" },
        retryAfterSeconds: 2,
      }),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /log in with passkey/i }));
    });

    expect(screen.getByText(/try again in 2 seconds/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /try again in 2 seconds/i }) as HTMLButtonElement).disabled,
    ).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByText(/try again in 1 second/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /try again in 1 second/i }) as HTMLButtonElement).disabled,
    ).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect((screen.getByRole("button", { name: /log in with passkey/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("applies the rate-limit countdown when conditional passkey sign-in is limited", async () => {
    vi.useFakeTimers();
    mockConditionalPasskeyAuthenticationSupported.mockResolvedValue(true);
    mockRequestPasskeyAuthenticationOptions.mockRejectedValue(
      new ApiError({
        status: 429,
        statusText: "Too Many Requests",
        body: { error: "PASSKEY_AUTHENTICATION_RATE_LIMITED" },
        retryAfterSeconds: 2,
      }),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SignupLoginPage />
      </QueryClientProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /try again in 2 seconds/i })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /try again in 2 seconds/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe("SignUpLoginForm", () => {
  it("requests a code then navigates once with non-URL challenge state", async () => {
    mockMutateAsync.mockResolvedValue({
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
    render(<SignUpLoginForm />);

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "sam@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /continue with email/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("sam@example.com");
    });
    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/auth/otp",
      state: expect.any(Function),
    });

    const stateUpdater = mockNavigate.mock.calls[0]?.[0].state;
    expect(stateUpdater({ __TSR_index: 0 })).toEqual({
      __TSR_index: 0,
      accountEmailVerification: {
        email: "sam@example.com",
        challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        expiresInSeconds: 600,
        resendAfterSeconds: 60,
        requestedAtEpochMs: expect.any(Number),
      },
    });
  });

  it("shows a safe error without navigating when sending fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Internal server detail"));
    render(<SignUpLoginForm />);

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "sam@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /continue with email/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We couldn't send your verification code. Please try again.",
    );
    expect(screen.queryByText("Internal server detail")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("disables submission while the verification email request is pending", async () => {
    let resolveRequest:
      | ((value: { challengeId: string; expiresInSeconds: number; resendAfterSeconds: number }) => void)
      | undefined;
    mockMutateAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<SignUpLoginForm />);

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "sam@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue with email/i }));

    await waitFor(() => {
      expect((screen.getByRole("button", { name: /sending code/i }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });

    resolveRequest?.({
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledOnce();
    });
  });
});
