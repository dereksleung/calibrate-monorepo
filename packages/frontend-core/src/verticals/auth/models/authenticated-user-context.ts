/** Account context confirmed by the server; never a token store. */
export type AuthenticatedUserContext = {
  user: {
    id: string;
    email: string;
    tier: "FREE" | "PREMIUM" | "LIFETIME";
    createdAt: Date;
    updatedAt: Date;
  };
  sessionTransport: "cookie" | "bearer";
};
