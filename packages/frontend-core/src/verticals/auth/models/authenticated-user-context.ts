export type SessionTransport = "cookie" | "bearer";
export type AuthenticatedUserContext = {
  user: { id: string; email: string; tier: "FREE" | "PREMIUM" | "LIFETIME"; createdAt: Date; updatedAt: Date };
  sessionTransport: SessionTransport;
};
