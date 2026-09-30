/** Local signup metadata only; authorization remains in host transport cookies. */
export type LocalDevelopmentPasskeyEnrollment = {
  email: string;
  next: "passkey-registration";
  expiresAt: string;
};
