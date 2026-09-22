import { describe, expect, it } from "vitest";

import { toAuthenticatedUserContext } from "./authenticated-user-context.js";

describe("toAuthenticatedUserContext", () => {
  it("maps the current user and preserves the client session transport without token storage", () => {
    expect(
      toAuthenticatedUserContext({
        user: {
          id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
          email: "person@example.com",
          tier: "FREE",
          createdAt: "2030-01-01T00:00:00.000Z",
          updatedAt: "2030-01-01T00:00:00.000Z",
        },
        sessionTransport: "bearer",
      }),
    ).toEqual({
      user: {
        id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
        email: "person@example.com",
        tier: "FREE",
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
      },
      sessionTransport: "bearer",
    });
  });
});
