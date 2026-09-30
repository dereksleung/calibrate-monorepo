// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ApiTransport } from "../../transport.js";

import { buildCatalogFoodSearchResult } from "../../verticals/foods/models/__mocks__/search-foods.js";
import { foodSearchQueryKey, searchFoodsQueryOptions, useFoodSearch } from "./search-foods.js";

const catalogResponse = {
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
};

function transportReturning(response: Record<string, unknown>) {
  const request = vi.fn(async ({ responseBodySchema }) => responseBodySchema.parse(response));
  return { transport: { request } as unknown as ApiTransport, request };
}

describe("food search workflow", () => {
  it("keys a validated query with its default limit and returns a domain page", async () => {
    const { transport, request } = transportReturning({
      results: [catalogResponse],
      nextCursor: "offset:20",
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const options = searchFoodsQueryOptions(transport, { query: "  greek yogurt ", cursor: "offset:20" });

    await expect(client.fetchQuery(options)).resolves.toEqual({
      results: [buildCatalogFoodSearchResult()],
      nextCursor: "offset:20",
    });
    expect(options.queryKey).toEqual([
      "foods",
      "search",
      { query: "greek yogurt", cursor: "offset:20", limit: 20 },
    ]);
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      path: "/foods/search",
      query: { query: "greek yogurt", cursor: "offset:20", limit: 20 },
      signal: expect.any(AbortSignal),
    });
    expect(request.mock.calls[0]?.[0].signal.aborted).toBe(false);
  });

  it("returns an empty domain page when the search has no matches", async () => {
    const { transport } = transportReturning({ results: [], nextCursor: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await expect(
      client.fetchQuery(searchFoodsQueryOptions(transport, { query: "greek yogurt", limit: 10 })),
    ).resolves.toEqual({ results: [], nextCursor: null });
  });

  it("keeps the disabled hook on the raw query key and does not request foods", () => {
    const { transport, request } = transportReturning({ results: [], nextCursor: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useFoodSearch(transport, null), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(foodSearchQueryKey({ query: "" })).toEqual(["foods", "search", { query: "" }]);
    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual(["foods", "search", { query: "" }]);
    expect(request).not.toHaveBeenCalled();
  });

  it("searches through the hook and exposes domain results", async () => {
    const { transport, request } = transportReturning({
      results: [{ ...catalogResponse, chosenQuantity: 3, chosenUnit: "cup" }],
      nextCursor: null,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useFoodSearch(transport, { query: "greek yogurt" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      results: [buildCatalogFoodSearchResult()],
      nextCursor: null,
    });
    expect(result.current.data?.results[0]).not.toHaveProperty("catalogFoodId");
    expect(client.getQueryCache().getAll()[0]?.queryKey).toEqual([
      "foods",
      "search",
      { query: "greek yogurt" },
    ]);
    expect(request).toHaveBeenCalledOnce();
  });
});
