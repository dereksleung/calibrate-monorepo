export interface EmailVerificationChallenge {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface PasskeyRegistrationContinuation {
  next: "passkey-registration";
  expiresAt: string;
}

export interface LoginOrRecoveryContinuation {
  next: "login-or-recovery";
}

export type EmailVerificationContinuation =
  | PasskeyRegistrationContinuation
  | LoginOrRecoveryContinuation;

export interface RequestEmailVerificationInput {
  email: string;
}

export interface VerifyEmailVerificationInput {
  challengeId: string;
  code: string;
}

export interface LocalDevelopmentPasskeyEnrollment extends PasskeyRegistrationContinuation {
  email: string;
}
