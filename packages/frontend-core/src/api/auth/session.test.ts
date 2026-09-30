import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../errors.js";
import { deleteCurrentSession as deleteWorkflow } from "../../feature-workflows/auth/delete-current-session.js";
import { getCurrentSession as getWorkflow } from "../../feature-workflows/auth/get-current-session.js";
import { refreshSession as refreshWorkflow } from "../../feature-workflows/auth/refresh-session.js";
import { startLocalDevelopmentTestSession as startWorkflow } from "../../feature-workflows/auth/start-local-development-test-session.js";
import { createApiTransport } from "../../transport.js";
import { buildAuthenticatedUserContext } from "../../verticals/auth/models/__mocks__/authenticated-user-context.js";
import { deleteCurrentSession } from "./delete-current-session.js";
import { getCurrentSession, mapGetCurrentSessionResponse } from "./get-current-session.js";
import { refreshSession, mapRefreshSessionResponse } from "./refresh-session.js";
import {
  startLocalDevelopmentTestSession,
  mapStartLocalDevelopmentTestSessionResponse,
} from "./start-local-development-test-session.js";

const endpoints = [
  [getCurrentSession, mapGetCurrentSessionResponse, getWorkflow, "/auth/session", "GET"],
  [refreshSession, mapRefreshSessionResponse, refreshWorkflow, "/auth/session/refresh", "POST"],
  [
    startLocalDevelopmentTestSession,
    mapStartLocalDevelopmentTestSessionResponse,
    startWorkflow,
    "/auth/local-development/test-session",
    "POST",
  ],
] as const;

function setup(body: unknown, status = 200) {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  return { fetch, transport: createApiTransport({ baseUrl: "https://api.example.com", fetch }) };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(
  endpoints.map(([request, mapResponse, workflow, path, method]) => ({
    request,
    mapResponse,
    workflow,
    path,
    method,
  })),
)("session endpoint $path", ({ request, mapResponse, workflow, path, method }) => {
  it("validates a bodyless request and its response", async () => {
    const expected = buildAuthenticatedUserContext();
    const { transport, fetch } = setup(expected);
    await expect(request(transport)).resolves.toEqual(expected);
    expect(fetch).toHaveBeenCalledWith(
      `https://api.example.com${path}`,
      expect.objectContaining({ method, body: undefined }),
    );
  });
  it.each(["cookie", "bearer"] as const)(
    "maps %s context explicitly without retaining tokens or response aliases",
    (sessionTransport) => {
      const response = { ...buildAuthenticatedUserContext({ sessionTransport }), accessToken: "ignored" };
      const context = mapResponse(response);
      expect(context).toEqual(buildAuthenticatedUserContext({ sessionTransport }));
      expect(context).not.toBe(response);
      expect(context.user).not.toBe(response.user);
      expect(context.user.createdAt).not.toBe(response.user.createdAt);
    },
  );
  it("returns mapped domain context through the public workflow", async () => {
    const response = buildAuthenticatedUserContext();
    const transport = { request: vi.fn().mockResolvedValue(response) };
    const context = await workflow(transport);
    expect(context).toEqual(response);
    // Schema parsing preserves Date instances; mapping creates independent domain dates.
    expect(context.user.createdAt).not.toBe(response.user.createdAt);
    expect(context.user.updatedAt).not.toBe(response.user.updatedAt);
  });
  it("rejects malformed successful responses", async () => {
    await expect(
      request(setup({ user: { id: "bad" }, sessionTransport: "cookie" }).transport),
    ).rejects.toThrow();
  });
  it("preserves unauthorized errors through the workflow", async () => {
    await expect(workflow(setup({ error: "ACCESS_SESSION_REQUIRED" }, 401).transport)).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("delete current session", () => {
  it("accepts 204 and exposes completion rather than an API response", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const transport = createApiTransport({ baseUrl: "https://api.example.com", fetch });
    await expect(deleteCurrentSession(transport)).resolves.toBeNull();
    await expect(deleteWorkflow(transport)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/session",
      expect.objectContaining({ method: "DELETE", body: undefined }),
    );
  });
  it("rejects an unexpected response body", async () => {
    await expect(deleteWorkflow(setup({ success: true }).transport)).rejects.toThrow();
  });
  it("preserves a failed logout error", async () => {
    await expect(deleteWorkflow(setup({ error: "unavailable" }, 503).transport)).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
