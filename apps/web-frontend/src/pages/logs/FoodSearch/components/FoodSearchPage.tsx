import type { MealNameEnumType } from "@calibrate/api-contracts";

import { WarningBanner } from "#/shared/components/base/WarningBanner.tsx";
import { APP_CONTENT_FRAME_CLASS_NAME } from "#/shared/layout/app-content-frame.ts";
import { Search } from "lucide-react";

import type { FoodConfirmationState, SelectedFoodForConfirmation } from "../../food-confirmation-state.ts";

import { FoodResultCard } from "./FoodResultCard.tsx";

type FoodSearchState = "ready" | "loading" | "empty" | "error";

type FoodSearchPageProps = {
  recentFoods?: SelectedFoodForConfirmation[];
  state?: FoodSearchState;
  query?: string;
  onQueryChange?: (query: string) => void;
  onSelectFood?: (state: FoodConfirmationState) => void;
  onQuickAdd?: (food: SelectedFoodForConfirmation, meal: MealNameEnumType) => void;
  preselectedMeal?: MealNameEnumType;
  addingFoodIds?: ReadonlySet<string>;
};

export const mockRecentFoods: SelectedFoodForConfirmation[] = [
  {
    id: "mock-oat",
    name: "Zero Sugar Oat",
    calories: 40,
    quantityServing: 1,
    servingLabel: "cup",
    brand: "Earth's Own",
    totalFatGrams: 1,
    saturatedFatGrams: 0,
    cholesterolMg: 0,
    sodiumMg: 120,
    totalCarbohydrateGrams: 7,
    fiberGrams: 2,
    sugarGrams: 1,
    proteinGrams: 3,
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
  },
  {
    id: "mock-protein",
    name: "Protein and Greens - Chocolate",
    calories: 150,
    quantityServing: 1,
    servingLabel: "scoop",
    brand: "Vega",
    totalFatGrams: 3,
    saturatedFatGrams: 0.5,
    cholesterolMg: 0,
    sodiumMg: 290,
    totalCarbohydrateGrams: 8,
    fiberGrams: 4,
    sugarGrams: 1,
    proteinGrams: 20,
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
  },
  {
    id: "mock-chickpeas",
    name: "Chickpeas and Tofu",
    calories: 376,
    quantityServing: 1,
    servingLabel: "meal",
    totalFatGrams: 14,
    saturatedFatGrams: 2,
    cholesterolMg: 0,
    sodiumMg: 410,
    totalCarbohydrateGrams: 48,
    fiberGrams: 12,
    sugarGrams: 7,
    proteinGrams: 22,
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
  },
  {
    id: "mock-avocado-toast",
    name: "Avocado Toast",
    calories: 250,
    quantityServing: 2,
    servingLabel: "slices",
    brand: "Homemade",
    totalFatGrams: 14,
    saturatedFatGrams: 2,
    cholesterolMg: 0,
    sodiumMg: 380,
    totalCarbohydrateGrams: 30,
    fiberGrams: 8,
    sugarGrams: 3,
    proteinGrams: 8,
    quantityMass: null,
    massUnit: null,
    quantityVolume: null,
    volumeUnit: null,
  },
];

function RecentFoodSkeletons() {
  return (
    <div aria-busy="true" aria-label="Loading recently logged foods" className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl px-4 py-3">
          <div className="h-5 w-2/5 animate-pulse rounded-full bg-surface-container-high" />
          <div className="mt-3 h-4 w-3/5 animate-pulse rounded-full bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}

export function FoodSearchPage({
  recentFoods = [],
  state = "ready",
  query = "",
  onQueryChange,
  onQuickAdd,
  onSelectFood,
  preselectedMeal,
  addingFoodIds,
}: FoodSearchPageProps) {
  const isSearching = query.trim().length >= 3;
  const heading = isSearching ? "Search results" : "Recently logged";
  return (
    <main className="min-h-screen bg-surface subtle-aurora-fade-page-background pb-24 pt-8 antialiased md:pt-16">
      <div className={APP_CONTENT_FRAME_CLASS_NAME}>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-secondary"
            strokeWidth={1.75}
          />
          <input
            type="search"
            aria-label="Search foods"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder="Search foods, brands, flavors..."
            className="glass-card h-12 w-full rounded-full py-3 px-5 text-sm text-on-surface outline-none placeholder:text-secondary focus:ring-3 focus:ring-ring/30"
          />
        </div>

        <section aria-labelledby="recently-logged-heading" className="mt-10">
          <h1
            id="recently-logged-heading"
            className="font-heading text-2xl font-normal tracking-tight text-on-surface"
          >
            {heading}
          </h1>

          <div className="food-search-list-card mt-4 rounded-2xl p-2">
            {state === "loading" ? <RecentFoodSkeletons /> : null}
            {state === "empty" ? (
              <p role="status" className="px-3 py-5 text-on-surface-variant">
                {isSearching ? "No results." : "No recently logged foods."}
              </p>
            ) : null}
            {state === "error" ? <WarningBanner>Could not search.</WarningBanner> : null}
            {state === "ready" ? (
              <ul role="list" className="space-y-1">
                {recentFoods.map((food) => (
                  <FoodResultCard
                    key={food.id}
                    food={food}
                    isAdding={addingFoodIds?.has(food.id)}
                    onQuickAdd={onQuickAdd}
                    onSelect={(selectedFood) => onSelectFood?.({ food: selectedFood })}
                    preselectedMeal={preselectedMeal}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
