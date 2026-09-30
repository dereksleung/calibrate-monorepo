export type RequestAccountEmailVerificationCommand = { email: string };
export type VerifyAccountEmailVerificationCommand = { challengeId: string; code: string };
export type AccountEmailVerificationChallenge = {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};
/** Setup authorization remains in the host transport's cookies, never in this result. */
export type AccountEmailVerificationResult =
  | { next: "passkey-registration"; expiresAt: string }
  | { next: "login-or-recovery" };
