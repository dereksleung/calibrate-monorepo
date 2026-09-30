import { describe, expect, it, vi } from "vitest";

import { mapLocalDevelopmentPasskeyEnrollmentResponse } from "../../api/auth/local-development-passkey-enrollment.js";
import { ApiError } from "../../errors.js";
import { createApiTransport } from "../../transport.js";
import { buildLocalDevelopmentPasskeyEnrollment } from "../../verticals/auth/models/__mocks__/local-development-passkey-enrollment.js";
import { requestLocalDevelopmentPasskeyEnrollment } from "./local-development-passkey-enrollment.js";

vi.mock("../../api/auth/local-development-passkey-enrollment.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/auth/local-development-passkey-enrollment.js")>()),
  mapLocalDevelopmentPasskeyEnrollmentResponse: vi.fn(),
}));

describe("local development enrollment workflow", () => {
  it("returns frontend metadata through the endpoint mapper", async () => {
    const response = buildLocalDevelopmentPasskeyEnrollment();
    const mapped = buildLocalDevelopmentPasskeyEnrollment({ email: "mapped@example.test" });
    vi.mocked(mapLocalDevelopmentPasskeyEnrollmentResponse).mockReturnValueOnce(mapped);
    const result = await requestLocalDevelopmentPasskeyEnrollment({
      request: vi.fn().mockResolvedValue(response),
    });
    expect(result).toBe(mapped);
    expect(mapLocalDevelopmentPasskeyEnrollmentResponse).toHaveBeenCalledWith(response);
  });
  it.each([403, 404, 429, 503])("preserves HTTP %s error details", async (status) => {
    const body = { error: "LOCAL_ENROLLMENT_UNAVAILABLE" };
    const transport = createApiTransport({
      baseUrl: "http://localhost:3001",
      fetch: async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        }),
    });
    await expect(requestLocalDevelopmentPasskeyEnrollment(transport)).rejects.toMatchObject({
      status,
      body,
      retryAfterSeconds: 60,
    });
  });
  it("preserves transport error identity", async () => {
    const error = new ApiError({ status: 403, statusText: "Forbidden", body: { error: "LOCAL_ONLY" } });
    await expect(
      requestLocalDevelopmentPasskeyEnrollment({ request: vi.fn().mockRejectedValue(error) }),
    ).rejects.toBe(error);
  });
  it("rejects invalid successful metadata before mapping", async () => {
    await expect(
      requestLocalDevelopmentPasskeyEnrollment({ request: vi.fn().mockResolvedValue(null) }),
    ).rejects.toThrow();
  });
});
