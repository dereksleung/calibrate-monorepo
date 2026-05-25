// @vitest-environment jsdom

import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function renderLogsRoute() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ["/logs?date=2026-05-18"],
    }),
    defaultPreload: "intent",
    scrollRestoration: false,
  });

  return render(<RouterProvider router={router} />);
}

describe("Logs", () => {
  it("renders the daily overview shell from fixture data", async () => {
    renderLogsRoute();

    expect(await screen.findByRole("heading", { name: "Monday, May 18" })).toBeTruthy();
    expect(screen.getByText("282")).toBeTruthy();
    expect(screen.getByText("/ 1,800")).toBeTruthy();
    expect(screen.getByText("1,518 calories remaining today.")).toBeTruthy();
    expect(screen.getByText("184.2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Breakfast" })).toBeTruthy();
    expect(screen.getByText("Oatmeal")).toBeTruthy();
    expect(screen.getByText("Black coffee")).toBeTruthy();
  });

  it("renders empty meal states and meal add actions", async () => {
    renderLogsRoute();

    expect(await screen.findByRole("heading", { name: "Lunch" })).toBeTruthy();
    expect(screen.getAllByText("No items logged yet").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "No items logged yet" })[0]);

    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("opens the quick log drawer from the floating action button", async () => {
    renderLogsRoute();

    fireEvent.click(await screen.findByRole("button", { name: "Open quick log actions" }));

    expect(await screen.findByText("Quick log")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search food" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log weight" })).toBeTruthy();
  });
});
