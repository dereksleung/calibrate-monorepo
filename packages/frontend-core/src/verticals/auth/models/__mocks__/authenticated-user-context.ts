import type { AuthenticatedUserContext } from "../authenticated-user-context.js";

export function buildAuthenticatedUserContext(
  overrides: Partial<Omit<AuthenticatedUserContext, "user">> & {
    user?: Partial<AuthenticatedUserContext["user"]>;
  } = {},
): AuthenticatedUserContext {
  return {
    sessionTransport: overrides.sessionTransport ?? "cookie",
    user: {
      id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
      email: "person@example.com",
      tier: "FREE",
      createdAt: new Date("2030-01-01T00:00:00.000Z"),
      updatedAt: new Date("2030-01-01T00:00:00.000Z"),
      ...overrides.user,
    },
  };
}
