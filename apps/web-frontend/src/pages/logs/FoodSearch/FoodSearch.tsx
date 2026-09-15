import type { DayLogResponse, FoodEntryResponse, FoodSearchResult } from "@calibrate/api-contracts";

import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { dayLogSlotQueryKeyPrefix } from "#/verticals/day-log-cache/day-log-cache.ts";
import { useFoodSearch } from "@calibrate/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import type { FoodConfirmationState, SelectedFoodForConfirmation } from "../food-confirmation-state.ts";

import { getTodayDateString } from "../log-page-helpers.ts";
import { FoodSearchPage } from "./components/FoodSearchPage.tsx";
import { rankRecentFoodsFromCache } from "./rank-recent-foods-from-cache.ts";

type FoodSearchProps = {
  selectedDate: string;
  preselectedMeal?: FoodConfirmationState["preselectedMeal"];
};

function formatRecentFoodDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );
}

function toConfirmationFood(
  food: FoodSearchResult | FoodEntryResponse,
  lastUsedLabel?: string,
): SelectedFoodForConfirmation {
  return {
    id: "source" in food ? (food.source === "catalog" ? food.catalogFoodId : food.foodEntryId) : food.id,
    name: food.name,
    brand: food.brand ?? undefined,
    calories: food.calories,
    totalFatGrams: food.totalFatGrams,
    saturatedFatGrams: food.saturatedFatGrams,
    cholesterolMg: food.cholesterolMg,
    sodiumMg: food.sodiumMg,
    totalCarbohydrateGrams: food.totalCarbohydrateGrams,
    fiberGrams: food.fiberGrams,
    sugarGrams: food.sugarGrams,
    proteinGrams: food.proteinGrams,
    quantityServing: food.quantityServing,
    servingLabel: food.servingLabel,
    quantityMass: food.quantityMass,
    massUnit: food.massUnit,
    quantityVolume: food.quantityVolume,
    volumeUnit: food.volumeUnit,
    lastUsedLabel: food.source === "recent" ? food.recency.displayLabel : undefined,
    lastUsedDate: food.source === "recent" ? food.recency.lastUsedDate : undefined,
    chosenQuantity: food.source === "recent" ? food.chosenQuantity : undefined,
    chosenUnit: food.source === "recent" ? food.chosenUnit : undefined,
    lastUsedLabel: food.source === "recent" ? food.recency.displayLabel : lastUsedLabel,
  };
}

export function FoodSearch({ selectedDate, preselectedMeal }: FoodSearchProps) {
  const navigate = useNavigate();
  const session = useAuthenticatedSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const activeSearch = debouncedQuery.length >= 3 ? { query: debouncedQuery } : null;
  const search = useFoodSearch(apiTransport, activeSearch);
  const searchFoods = useMemo(
    () =>
      search.data?.results.map((food) =>
        toConfirmationFood(
          food,
          food.source === "recent" ? formatRecentFoodDate(food.recency.lastUsedDate) : undefined,
        ),
      ),
    [search.data],
  );
  const cachedFoods = useMemo(() => {
    if (!session) return [];
    const slots = queryClient
      .getQueriesData<DayLogResponse | null | undefined>({
        queryKey: dayLogSlotQueryKeyPrefix(session.user.id),
      })
      .map(([queryKey, data]) => ({ date: String(queryKey[3]), data }));

    return rankRecentFoodsFromCache({ slots, today: getTodayDateString(), preselectedMeal }).map(
      ({ date, food }) => toConfirmationFood(food, formatRecentFoodDate(date)),
    );
  }, [preselectedMeal, queryClient, session]);
  const state = activeSearch
    ? search.isPending
      ? "loading"
      : search.isError
        ? "error"
        : searchFoods?.length === 0
          ? "empty"
          : "ready"
    : cachedFoods.length === 0
      ? "empty"
      : "ready";

  return (
    <>
      <FoodSearchPage
        query={query}
        onQueryChange={setQuery}
        recentFoods={activeSearch ? (searchFoods ?? []) : cachedFoods}
        state={state}
        onSelectFood={(foodConfirmation) =>
          navigate({
            to: "/logs/confirm-food",
            search: { date: selectedDate },
            state: { foodConfirmation: { ...foodConfirmation, preselectedMeal } },
            viewTransition: true,
          })
        }
      />
    </>
  );
}
