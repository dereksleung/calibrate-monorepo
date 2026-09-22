export type AuthenticatedUserTier = "FREE" | "PREMIUM" | "LIFETIME";

export interface AuthenticatedUser {
  id: string;
  email: string;
  tier: AuthenticatedUserTier;
  createdAt: Date;
  updatedAt: Date;
}

/** Client-visible session state. It deliberately contains no credential or token. */
export interface AuthenticatedUserContext {
  user: AuthenticatedUser;
  /** Indicates how the host client transports the authenticated session. */
  sessionTransport: "cookie" | "bearer";
}
