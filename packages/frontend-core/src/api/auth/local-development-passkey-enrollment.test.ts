import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiTransport } from "../../transport.js";
import { buildLocalDevelopmentPasskeyEnrollment } from "../../verticals/auth/models/__mocks__/local-development-passkey-enrollment.js";
import {
  requestLocalDevelopmentPasskeyEnrollment,
  mapLocalDevelopmentPasskeyEnrollmentResponse,
} from "./local-development-passkey-enrollment.js";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("local development enrollment endpoint", () => {
  it("posts a bodyless cookie-backed request to the local-only endpoint", async () => {
    const response = buildLocalDevelopmentPasskeyEnrollment();
    const fetch = vi.fn(
      async () => new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } }),
    );
    const transport = createApiTransport({ baseUrl: "http://localhost:3001", fetch });
    await expect(requestLocalDevelopmentPasskeyEnrollment(transport)).resolves.toEqual(response);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/auth/local-development/passkey-enrollment",
      expect.objectContaining({ method: "POST", body: undefined, credentials: "include" }),
    );
  });
  it.each([
    { email: "bad" },
    { next: "login-or-recovery" },
    { expiresAt: "not-a-date" },
    { authorization: "unexpected-secret" },
  ])("rejects malformed metadata %j even with an injected transport", async (invalid) => {
    const transport = {
      request: vi.fn().mockResolvedValue({ ...buildLocalDevelopmentPasskeyEnrollment(), ...invalid }),
    };
    await expect(requestLocalDevelopmentPasskeyEnrollment(transport)).rejects.toThrow();
  });
  it("maps only public metadata into an independent frontend model", () => {
    const response = { ...buildLocalDevelopmentPasskeyEnrollment(), authorization: "never-exposed" };
    const mapped = mapLocalDevelopmentPasskeyEnrollmentResponse(response);
    expect(mapped).toEqual(buildLocalDevelopmentPasskeyEnrollment());
    expect(mapped).not.toBe(response);
  });
});
