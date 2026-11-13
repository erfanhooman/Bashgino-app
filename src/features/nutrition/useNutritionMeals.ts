import { useCallback, useMemo, useState } from "react";

import {
  MAX_FOODS_PER_MEAL,
  MAX_MEALS,
  type NutritionFoodDraft,
  type NutritionMealDraft,
  duplicateMeal as duplicateMealDraft,
  emptyFood,
  emptyMeal,
  isNutritionPlanReady,
  nutritionTotals,
  moveMeal as moveMealDraft,
} from "@bashgino/domain";

/**
 * Draft state for one nutrition plan, plus the two flags the screen needs:
 * "has the coach touched anything" (drives the back-confirmation) and "is the
 * plan assignable yet" (drives the assign step).
 *
 * All list surgery delegates to `@bashgino/domain` so the web and the phone apply
 * the same limits (12 meals, 30 foods per meal) and the same copy suffix on a
 * duplicated meal.
 */
export function useNutritionMeals(initial: NutritionMealDraft[] = []) {
  const [meals, setMeals] = useState<NutritionMealDraft[]>(initial);
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const addMeal = useCallback(() => {
    setMeals((current) => (current.length >= MAX_MEALS ? current : [...current, emptyMeal(current.length + 1)]));
    markDirty();
  }, [markDirty]);

  const duplicateMeal = useCallback(
    (mealKey: string) => {
      setMeals((current) => duplicateMealDraft(current, mealKey));
      markDirty();
    },
    [markDirty],
  );

  const moveMeal = useCallback(
    (mealKey: string, direction: -1 | 1) => {
      setMeals((current) => moveMealDraft(current, mealKey, direction));
      markDirty();
    },
    [markDirty],
  );

  const removeMeal = useCallback(
    (mealKey: string) => {
      setMeals((current) => current.filter((meal) => meal.key !== mealKey));
      markDirty();
    },
    [markDirty],
  );

  const patchMeal = useCallback(
    (mealKey: string, patch: Partial<NutritionMealDraft>) => {
      setMeals((current) => current.map((meal) => (meal.key === mealKey ? { ...meal, ...patch } : meal)));
      markDirty();
    },
    [markDirty],
  );

  const addFood = useCallback(
    (mealKey: string) => {
      setMeals((current) =>
        current.map((meal) =>
          meal.key === mealKey && meal.foods.length < MAX_FOODS_PER_MEAL
            ? { ...meal, foods: [...meal.foods, emptyFood()] }
            : meal,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const patchFood = useCallback(
    (mealKey: string, foodKey: string, patch: Partial<NutritionFoodDraft>) => {
      setMeals((current) =>
        current.map((meal) =>
          meal.key === mealKey
            ? {
                ...meal,
                foods: meal.foods.map((food) => (food.key === foodKey ? { ...food, ...patch } : food)),
              }
            : meal,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const removeFood = useCallback(
    (mealKey: string, foodKey: string) => {
      setMeals((current) =>
        current.map((meal) =>
          meal.key === mealKey ? { ...meal, foods: meal.foods.filter((food) => food.key !== foodKey) } : meal,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const totals = useMemo(() => nutritionTotals(meals), [meals]);
  const ready = useMemo(() => isNutritionPlanReady(meals), [meals]);

  return {
    meals,
    setMeals,
    dirty,
    setDirty,
    markDirty,
    addMeal,
    duplicateMeal,
    moveMeal,
    removeMeal,
    patchMeal,
    addFood,
    patchFood,
    removeFood,
    totals,
    ready,
  };
}
