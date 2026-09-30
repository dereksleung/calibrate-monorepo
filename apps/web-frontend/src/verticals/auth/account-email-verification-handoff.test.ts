import { describe, expect, it } from "vitest";

import {
  createAccountEmailVerificationHandoff,
  parseAccountEmailVerificationHandoff,
  createPasskeyEnrollmentHandoff,
  parsePasskeyEnrollmentHandoff,
  createLoginRecoveryHandoff,
  parseLoginRecoveryHandoff,
} from "./account-email-verification-handoff";

describe("signup email verification handoff", () => {
  it("creates normalized typed history state", () => {
    expect(
      createAccountEmailVerificationHandoff(
        " Person@Example.COM ",
        {
          challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
          expiresInSeconds: 600,
          resendAfterSeconds: 60,
        },
        1_700_000_000_000,
      ),
    ).toEqual({
      email: "person@example.com",
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      requestedAtEpochMs: 1_700_000_000_000,
    });
  });

  it.each([
    undefined,
    {},
    {
      email: "person@example.com",
      challengeId: "not-a-uuid",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      requestedAtEpochMs: 1_700_000_000_000,
    },
    {
      email: "person@example.com",
      challengeId: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      requestedAtEpochMs: 1_700_000_000_000,
      unexpected: true,
    },
  ])("rejects invalid direct-navigation state", (value) => {
    expect(parseAccountEmailVerificationHandoff(value)).toBeNull();
  });
});

describe("verification continuation handoffs", () => {
  it("round-trips normalized passkey setup metadata", () => {
    const handoff = createPasskeyEnrollmentHandoff(" Person@Example.COM ", {
      next: "passkey-registration",
      expiresAt: "2030-01-01T00:05:00.000Z",
    });
    expect(parsePasskeyEnrollmentHandoff(handoff)).toEqual({
      email: "person@example.com",
      next: "passkey-registration",
      expiresAt: "2030-01-01T00:05:00.000Z",
    });
  });
  it("round-trips normalized recovery metadata", () => {
    const handoff = createLoginRecoveryHandoff(" Person@Example.COM ");
    expect(parseLoginRecoveryHandoff(handoff)).toEqual({
      email: "person@example.com",
      next: "login-or-recovery",
    });
  });
  it.each([
    { email: "invalid", next: "passkey-registration", expiresAt: "2030-01-01T00:05:00.000Z" },
    { email: "person@example.com", next: "passkey-registration", expiresAt: "invalid" },
    {
      email: "person@example.com",
      next: "passkey-registration",
      expiresAt: "2030-01-01T00:05:00.000Z",
      token: "unexpected",
    },
  ])("rejects invalid enrollment history %#", (candidate) => {
    expect(parsePasskeyEnrollmentHandoff(candidate)).toBeNull();
  });
  it.each([
    { email: "invalid", next: "login-or-recovery" },
    { email: "person@example.com", next: "unknown" },
    { email: "person@example.com", next: "login-or-recovery", token: "unexpected" },
  ])("rejects invalid recovery history %#", (candidate) => {
    expect(parseLoginRecoveryHandoff(candidate)).toBeNull();
  });
});
