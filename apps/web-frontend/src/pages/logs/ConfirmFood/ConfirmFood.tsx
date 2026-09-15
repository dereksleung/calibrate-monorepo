import { Button } from "#/shared/components/base/Button.tsx";
import { APP_CONTENT_FRAME_CLASS_NAME } from "#/shared/layout/app-content-frame.ts";
import {
  normalizeFoodEntryForStorage,
  normalizeFoodEntryQuantity,
  type CreateFoodEntryRequest,
  type MealNameEnumType,
} from "@calibrate/api-contracts";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FoodConfirmationState } from "../food-confirmation-state.ts";

import { ConfirmFoodUnitSelect } from "./components/ConfirmFoodUnitSelect.tsx";
import { DailyGoalProgress, NutritionAtGlance, NutritionFacts } from "./components/FoodNutritionPanels.tsx";
import {
  getFoodUnitOptions,
  recoverCatalogReferenceNutrition,
  scaleFoodNutrition,
} from "./confirm-food-nutrition.ts";

type ConfirmFoodProps = {
  confirmation: FoodConfirmationState;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (entry: CreateFoodEntryRequest) => void;
};

const meals: Array<{ value: MealNameEnumType; label: string }> = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACKS", label: "Snacks" },
];

export function ConfirmFood({ confirmation, isSaving, onCancel, onSave }: ConfirmFoodProps) {
  const food = useMemo(() => recoverCatalogReferenceNutrition(confirmation.food), [confirmation.food]);
  const units = useMemo(() => getFoodUnitOptions(food), [food]);
  const initialUnit = units.find((option) => option.unit === confirmation.food.chosenUnit)?.unit;
  const [quantity, setQuantity] = useState(
    String(
      normalizeFoodEntryQuantity(
        initialUnit ? (confirmation.food.chosenQuantity ?? 0) : food.quantityServing,
      ),
    ),
  );
  const [unit, setUnit] = useState(initialUnit ?? units[0]?.unit ?? food.servingLabel);
  const [meal, setMeal] = useState<MealNameEnumType>(confirmation.preselectedMeal ?? "BREAKFAST");
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const enteredQuantity = Number(quantity);
  const chosenQuantity = normalizeFoodEntryQuantity(enteredQuantity);
  const nutrition = useMemo(
    () => scaleFoodNutrition(food, chosenQuantity, unit),
    [chosenQuantity, food, unit],
  );

  useEffect(() => {
    const input = quantityInputRef.current;
    if (!input) {
      return;
    }

    input.focus();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(enteredQuantity) || enteredQuantity <= 0) {
      setQuantityError("Enter an amount greater than 0.");
      return;
    }
    if (chosenQuantity !== enteredQuantity) {
      setQuantityError("Use no more than two decimal places.");
      return;
    }

    setQuantityError(null);
    onSave(
      normalizeFoodEntryForStorage({
        name: food.name,
        brand: food.brand ?? null,
        meal,
        chosenQuantity,
        chosenUnit: unit,
        ...nutrition,
        quantityServing: food.quantityServing,
        servingLabel: food.servingLabel,
        quantityMass: food.quantityMass,
        massUnit: food.massUnit,
        quantityVolume: food.quantityVolume,
        volumeUnit: food.volumeUnit,
      }),
    );
  }

  return (
    <main className="min-h-screen bg-surface-container-low pb-24 antialiased subtle-aurora-fade-page-background md:bg-surface md:px-10 md:pb-20">
      <form className="w-full" onSubmit={submit}>
        <header
          className={`${APP_CONTENT_FRAME_CLASS_NAME} sticky top-0 z-40 border-b border-white/80 bg-surface/90 px-6 py-4 backdrop-blur-md shadow-[0_12px_24px_-20px_rgba(26,28,28,0.38)] md:static md:border-0 md:bg-transparent md:px-4 md:py-10 md:shadow-none`}
        >
          <div className="relative flex items-center justify-between gap-4">
            <Button
              aria-label="Back to food search"
              type="button"
              variant="ghost"
              size="icon"
              className="relative z-10 text-primary hover:bg-primary/10"
              onClick={onCancel}
            >
              <ArrowLeft aria-hidden strokeWidth={1.75} />
            </Button>
            <h1 className="pointer-events-none absolute inset-x-14 text-center font-heading text-xl font-medium tracking-tight text-on-surface">
              Add Food
            </h1>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="relative z-10 min-w-11 justify-center px-2 text-primary hover:bg-primary/10"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Done"}
            </Button>
          </div>
        </header>

        <div className={`${APP_CONTENT_FRAME_CLASS_NAME} px-6 pt-5 md:px-4 md:pt-0`}>
          <div className="grid gap-4 md:gap-6">
            <div className="space-y-4">
              <section
                aria-labelledby="food-name-heading"
                className="rounded-2xl bg-surface-container-lowest px-6 py-6 shadow-[0_18px_45px_-32px_rgba(26,28,28,0.42)]"
              >
                <h2 id="food-name-heading" className="font-heading text-xl font-medium text-on-surface">
                  {food.name}
                </h2>
                {food.brand ? <p className="mt-1 text-sm text-on-surface-variant/75">{food.brand}</p> : null}
              </section>

              <NutritionAtGlance nutrition={nutrition} />

              <section className="rounded-2xl bg-surface-container-lowest px-6 py-6 shadow-[0_18px_45px_-32px_rgba(26,28,28,0.42)]">
                <div className="grid grid-cols-2 gap-4">
                  <label className="min-w-0" htmlFor="food-quantity">
                    <span className="block text-[0.625rem] font-medium tracking-[0.12em] text-on-surface-variant/70 uppercase">
                      Quantity
                    </span>
                    <input
                      ref={quantityInputRef}
                      id="food-quantity"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      aria-invalid={Boolean(quantityError)}
                      className={`mt-2 h-12 w-full rounded-xl px-4 text-base font-medium tabular-nums text-on-surface outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${quantityError ? "bg-error-container" : "bg-surface-container-low"}`}
                    />
                  </label>

                  <label className="min-w-0" htmlFor="serving-unit">
                    <span className="block text-[0.625rem] font-medium tracking-[0.12em] text-on-surface-variant/70 uppercase">
                      Unit
                    </span>
                    <span className="mt-2 block">
                      <ConfirmFoodUnitSelect
                        id="serving-unit"
                        value={unit}
                        options={units}
                        onValueChange={setUnit}
                      />
                    </span>
                  </label>
                </div>

                {quantityError ? (
                  <p role="alert" className="mt-3 text-sm text-error">
                    {quantityError}
                  </p>
                ) : null}

                <fieldset className="mt-6">
                  <legend className="text-[0.625rem] font-medium tracking-[0.12em] text-on-surface-variant/70 uppercase">
                    Select a meal
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meals.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMeal(option.value)}
                        aria-pressed={meal === option.value}
                        className="rounded-full bg-surface-container px-3.5 py-2 text-sm font-medium text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 aria-pressed:bg-primary aria-pressed:text-on-primary"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>
            </div>

            <DailyGoalProgress nutrition={nutrition} />

            <NutritionFacts nutrition={nutrition} />
          </div>
        </div>
      </form>
    </main>
  );
}
