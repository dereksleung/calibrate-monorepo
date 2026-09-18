import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import { dayLogSlotQueryKeyPrefix } from "#/verticals/day-log-cache/day-log-cache.ts";
import { useSaveFoodEntry } from "#/verticals/day-log-cache/use-save-food-entry.ts";
import { useFoodSearch } from "@calibrate/api-client";
import {
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type DayLogResponse,
  type FoodEntryResponse,
  type FoodSearchResult,
  type MealNameEnumType,
} from "@calibrate/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { FoodConfirmationState, SelectedFoodForConfirmation } from "../food-confirmation-state.ts";

import { getFoodUnitOptions, scaleFoodNutrition } from "../ConfirmFood/confirm-food-nutrition.ts";
import { getTodayDateString } from "../log-page-helpers.ts";
import { MEAL_SECTIONS } from "../log-page-helpers.ts";
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

export function toFoodEntry(
  food: SelectedFoodForConfirmation,
  meal: MealNameEnumType,
): CreateFoodEntryRequest {
  const recentUnit =
    food.chosenQuantity !== undefined && food.chosenUnit !== undefined
      ? { unit: food.chosenUnit, baseQuantity: food.chosenQuantity }
      : undefined;
  const unit = recentUnit
    ? recentUnit
    : (getFoodUnitOptions(food)[0] ?? { unit: food.servingLabel, baseQuantity: food.quantityServing });
  const nutrition = recentUnit ? food : scaleFoodNutrition(food, unit.baseQuantity, unit.unit);

  return normalizeFoodEntryForStorage({
    name: food.name,
    brand: food.brand ?? null,
    meal,
    chosenQuantity: unit.baseQuantity,
    chosenUnit: unit.unit,
    ...nutrition,
    quantityServing: food.quantityServing,
    servingLabel: food.servingLabel,
    quantityMass: food.quantityMass,
    massUnit: food.massUnit,
    quantityVolume: food.quantityVolume,
    volumeUnit: food.volumeUnit,
  });
}

function isRecentSearchResult(
  food: FoodSearchResult | FoodEntryResponse,
): food is Extract<FoodSearchResult, { source: "recent" }> {
  return "source" in food && food.source === "recent";
}

function toConfirmationFood(
  food: FoodSearchResult | FoodEntryResponse,
  lastUsedLabel?: string,
): SelectedFoodForConfirmation {
  const recentSearch = isRecentSearchResult(food) ? food : null;

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
    lastUsedLabel: lastUsedLabel ?? recentSearch?.recency.displayLabel,
    lastUsedDate: recentSearch?.recency.lastUsedDate,
    chosenQuantity: recentSearch?.chosenQuantity,
    chosenUnit: recentSearch?.chosenUnit,
  };
}

export function FoodSearch({ selectedDate, preselectedMeal }: FoodSearchProps) {
  const navigate = useNavigate();
  const session = useAuthenticatedSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [addingFoodIds, setAddingFoodIds] = useState<ReadonlySet<string>>(new Set());
  const save = useSaveFoodEntry(selectedDate, {
    onSuccess: () => {
      // The save remains on this route; cache patching is handled by the shared hook.
    },
    onError: () => {
      toast.error("We couldn't save that food.", { closeButton: true });
    },
  });

  function quickAdd(food: SelectedFoodForConfirmation, meal: MealNameEnumType) {
    setAddingFoodIds((ids) => new Set(ids).add(food.id));
    save.mutate(toFoodEntry(food, meal), {
      onSuccess: () => {
        setAddingFoodIds((ids) => {
          const next = new Set(ids);
          next.delete(food.id);
          return next;
        });
        toast.success(`Added to ${MEAL_SECTIONS.find((section) => section.meal === meal)?.title}`);
      },
      onError: () => {
        setAddingFoodIds((ids) => {
          const next = new Set(ids);
          next.delete(food.id);
          return next;
        });
      },
    });
  }

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
        addingFoodIds={addingFoodIds}
        onQuickAdd={quickAdd}
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
        preselectedMeal={preselectedMeal}
      />
    </>
  );
}
