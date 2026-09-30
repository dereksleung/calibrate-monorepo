import type { DayLogSlotResult, FoodEntry } from "@calibrate/frontend-core/shared/models/day-logs/day-log";
import type { FoodSearchResult } from "@calibrate/frontend-core/verticals/foods/models/search-foods";

import { apiTransport } from "#/shared/api/api-client.ts";
import { useAuthenticatedSession } from "#/verticals/auth/authenticated-session.ts";
import {
  normalizeFoodEntryForStorage,
  type CreateFoodEntryRequest,
  type MealNameEnumType,
} from "@calibrate/api-contracts";
import { useSaveFoodEntry } from "@calibrate/frontend-core/feature-workflows/day-logs/save-food-entry";
import { useFoodSearch } from "@calibrate/frontend-core/feature-workflows/foods/search-foods";
import { dayLogSlotQueryKeyPrefix } from "@calibrate/frontend-core/verticals/day-log-cache/day-log-slots";
import {
  getFoodUnitOptions,
  scaleFoodNutrition,
} from "@calibrate/frontend-core/verticals/foods/confirm-food-nutrition";
import { rankRecentFoodsFromCache } from "@calibrate/frontend-core/verticals/recent-foods/rank-recent-foods-from-cache";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { FoodConfirmationState, SelectedFoodForConfirmation } from "../food-confirmation-state.ts";

import { getTodayDateString } from "../log-page-helpers.ts";
import { MEAL_SECTIONS } from "../log-page-helpers.ts";
import { FoodSearchPage } from "./components/FoodSearchPage.tsx";

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
  food: FoodSearchResult | FoodEntry,
): food is Extract<FoodSearchResult, { source: "recent" }> {
  return "source" in food && food.source === "recent";
}

function toConfirmationFood(
  food: FoodSearchResult | FoodEntry,
  lastUsedLabel?: string,
): SelectedFoodForConfirmation {
  const recentSearch = isRecentSearchResult(food) ? food : null;
  const hasChosenServing = "chosenQuantity" in food && "chosenUnit" in food;

  return {
    id: food.id,
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
    chosenQuantity: hasChosenServing ? food.chosenQuantity : undefined,
    chosenUnit: hasChosenServing ? food.chosenUnit : undefined,
  };
}

export function FoodSearch({ selectedDate, preselectedMeal }: FoodSearchProps) {
  const navigate = useNavigate();
  const session = useAuthenticatedSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [addingFoodIds, setAddingFoodIds] = useState<ReadonlySet<string>>(new Set());
  const [recentFoodsRevision, setRecentFoodsRevision] = useState(0);
  const save = useSaveFoodEntry(apiTransport, session!.user.id, selectedDate, {
    onError: () => {
      toast.error("We couldn't save that food.", { closeButton: true });
    },
  });

  async function quickAdd(food: SelectedFoodForConfirmation, meal: MealNameEnumType) {
    setAddingFoodIds((ids) => new Set(ids).add(food.id));
    try {
      await save.mutateAsync(toFoodEntry(food, meal));
      setRecentFoodsRevision((revision) => revision + 1);
      toast.success(`Added to ${MEAL_SECTIONS.find((section) => section.meal === meal)?.title}`);
    } catch {
      return;
    } finally {
      setAddingFoodIds((ids) => {
        const next = new Set(ids);
        next.delete(food.id);
        return next;
      });
    }
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
      .getQueriesData<DayLogSlotResult>({
        queryKey: dayLogSlotQueryKeyPrefix(session.user.id),
      })
      .map(([queryKey, data]) => ({ date: String(queryKey[3]), data }));

    return rankRecentFoodsFromCache({ slots, today: getTodayDateString(), preselectedMeal }).map(
      ({ date, food }) => toConfirmationFood(food, formatRecentFoodDate(date)),
    );
  }, [preselectedMeal, queryClient, recentFoodsRevision, session]);
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
