// @vitest-environment jsdom

import { createQueryClient } from "#/shared/api/query-client.ts";
import { dayLogSlotQueryKey, dayLogSlotVersionQueryKey } from "#/verticals/day-log-cache/day-log-cache.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);

    if (url.includes("/auth/session")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            user: {
              id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
              email: "person@example.com",
              tier: "FREE",
              createdAt: "2030-01-01T00:00:00.000Z",
              updatedAt: "2030-01-01T00:00:00.000Z",
            },
            sessionTransport: "cookie",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }

    if (url.includes("/foods/search")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                source: "catalog",
                catalogFoodId: "2d38c136-5633-4b22-9553-b8a587dd6ba6",
                sourceLabel: "USDA FoodData Central",
                name: "Greek yogurt",
                brand: "Calibrate Kitchen",
                calories: 150,
                totalFatGrams: 4,
                saturatedFatGrams: 2,
                cholesterolMg: 10,
                sodiumMg: 65,
                totalCarbohydrateGrams: 8,
                fiberGrams: 0,
                sugarGrams: 6,
                proteinGrams: 18,
                quantityServing: 1,
                servingLabel: "cup",
                quantityMass: null,
                massUnit: null,
                quantityVolume: null,
                volumeUnit: null,
              },
            ],
            nextCursor: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }

    if (url.includes("/food-entries")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ foodEntryId: "33c07887-0f37-4bb8-9f87-3c283346f767", versionNumber: 1 }),
          {
            status: 201,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }

    if (url.includes("/daylogs:sync")) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    if (url.includes("/daylogs/")) {
      return Promise.resolve(
        new Response(JSON.stringify(null), { status: 200, headers: { "content-type": "application/json" } }),
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderFoodSearchRoute(queryClient = createQueryClient()) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ["/logs/food-search?date=2026-05-18&meal=BREAKFAST"],
    }),
    defaultPreload: "intent",
    scrollRestoration: false,
  });

  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

describe("food search route", () => {
  it("carries the selected food and meal into the confirmation route", async () => {
    const { router } = renderFoodSearchRoute();

    fireEvent.click(await screen.findByRole("button", { name: /select Zero Sugar Oat/i }));

    expect(await screen.findByRole("heading", { name: "Add Food" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/logs/confirm-food");
    expect(router.state.location.search).toMatchObject({ date: "2026-05-18" });
    expect(router.state.location.state.foodConfirmation).toMatchObject({
      food: { name: "Zero Sugar Oat" },
      preselectedMeal: "BREAKFAST",
    });
  });

  it("debounces typed searches and renders the backend-provided result order", async () => {
    renderFoodSearchRoute();

    fireEvent.change(await screen.findByRole("searchbox", { name: "Search foods" }), {
      target: { value: "greek yogurt" },
    });

    expect(await screen.findByRole("button", { name: /select Greek yogurt/i })).toBeTruthy();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/foods/search?query=greek+yogurt"),
      expect.any(Object),
    );
  });

  it("saves the confirmation and returns to the selected daily log", async () => {
    const { router } = renderFoodSearchRoute();
    fireEvent.click(await screen.findByRole("button", { name: /select Zero Sugar Oat/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    await screen.findByRole("heading", { name: "Monday, May 18" });
    expect(router.state.location.pathname).toBe("/logs");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/daylogs/2026-05-18/food-entries"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("stays on the food entry page when create fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
      if (url.includes("/auth/session")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              user: {
                id: "e74942b3-78d7-48e8-bd20-dc5eba7f82ff",
                email: "person@example.com",
                tier: "FREE",
                createdAt: "2030-01-01T00:00:00.000Z",
                updatedAt: "2030-01-01T00:00:00.000Z",
              },
              sessionTransport: "cookie",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.includes("/food-entries")) {
        return Promise.resolve(new Response("server error", { status: 500 }));
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    const { router } = renderFoodSearchRoute();
    fireEvent.click(await screen.findByRole("button", { name: /select Zero Sugar Oat/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/food-entries"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByRole("heading", { name: "Add Food" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/logs/confirm-food");
  });

  it("does not immediately sync after a matching Known-empty create", async () => {
    const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
    const queryClient = createQueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-05-18"), null);

    const { router } = renderFoodSearchRoute(queryClient);
    fireEvent.click(await screen.findByRole("button", { name: /select Zero Sugar Oat/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    await screen.findByRole("heading", { name: "Monday, May 18" });
    expect(router.state.location.pathname).toBe("/logs");
    expect(queryClient.getQueryData(dayLogSlotVersionQueryKey(accountId, "2026-05-18"))).toBe(1);
    expect(
      vi.mocked(globalThis.fetch).mock.calls.some(([input]) => {
        const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
        return url.includes("/daylogs:sync");
      }),
    ).toBe(false);
  });

  it("syncs only the written date when the cached slot version does not match", async () => {
    const accountId = "e74942b3-78d7-48e8-bd20-dc5eba7f82ff";
    const queryClient = createQueryClient();
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-05-18"), {
      id: "94e23c4b-cd80-4b8e-b10c-4b263e710ec2",
      date: "2026-05-18",
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      weight: null,
    });
    queryClient.setQueryData(dayLogSlotVersionQueryKey(accountId, "2026-05-18"), 2);
    queryClient.setQueryData(dayLogSlotQueryKey(accountId, "2026-05-11"), null);

    vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL, init) => {
      const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
      if (url.includes("/auth/session")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              user: {
                id: accountId,
                email: "person@example.com",
                tier: "FREE",
                createdAt: "2030-01-01T00:00:00.000Z",
                updatedAt: "2030-01-01T00:00:00.000Z",
              },
              sessionTransport: "cookie",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.includes("/food-entries")) {
        return Promise.resolve(
          new Response(JSON.stringify({ foodEntryId: "entry-1", versionNumber: 5 }), {
            status: 201,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      if (url.includes("/daylogs:sync")) {
        const body = JSON.parse(String(init?.body));
        return Promise.resolve(
          new Response(
            JSON.stringify({
              slots: [
                {
                  date: body.endDate,
                  versionNumber: 5,
                  dayLog: {
                    id: "94e23c4b-cd80-4b8e-b10c-4b263e710ec2",
                    date: body.endDate,
                    breakfast: [],
                    lunch: [],
                    dinner: [],
                    snacks: [],
                    weight: null,
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    const { router } = renderFoodSearchRoute(queryClient);
    fireEvent.click(await screen.findByRole("button", { name: /select Zero Sugar Oat/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));

    await screen.findByRole("heading", { name: "Monday, May 18" });
    expect(router.state.location.pathname).toBe("/logs");
    const syncCalls = vi.mocked(globalThis.fetch).mock.calls.filter(([input]) => {
      const url = typeof input === "string" ? input : "url" in input ? input.url : String(input);
      return url.includes("/daylogs:sync");
    });
    expect(syncCalls).toHaveLength(1);
    expect(JSON.parse(String(syncCalls[0]?.[1]?.body))).toMatchObject({
      startDate: "2026-05-18",
      endDate: "2026-05-18",
    });
    expect(queryClient.getQueryState(dayLogSlotQueryKey(accountId, "2026-05-11"))?.isInvalidated).toBeFalsy();
  });
});
