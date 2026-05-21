// @vitest-environment jsdom

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "#/shared/api/query-client.ts";
import { formatLocalDate } from "./log-page-helpers.ts";
import { routeTree } from "../../routeTree.gen.ts";

vi.mock("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => null,
}));

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}));

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderLogsRoute(initialEntry: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry],
    }),
    defaultPreload: "intent",
    scrollRestoration: false,
  });

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("logs route", () => {
  it("uses a valid selected date from URL search", async () => {
    renderLogsRoute("/logs?date=2026-04-30");

    expect(await screen.findByText("Food and activity logs for 2026-04-30 will appear here.")).toBeTruthy();
  });

  it("normalizes invalid selected-date search to today", async () => {
    renderLogsRoute("/logs?date=not-a-date");

    expect(
      await screen.findByText(`Food and activity logs for ${formatLocalDate(new Date())} will appear here.`)
    ).toBeTruthy();
  });
});
