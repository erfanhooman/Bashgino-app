/**
 * Reusable nutrition plans — the contract shared by the web app and the Android
 * client.
 *
 * A `NutritionTemplate` is the coach's reusable library entry; the backend copies
 * it into an independent `NutritionPlan` per trainee. Nothing here assumes shared
 * mutable meals: the editor serialises a whole document every save, exactly like
 * the training builder.
 *
 * Validation messages are the product's Persian copy. They are asserted in tests
 * on both clients, so changing one is a deliberate product change, not a typo.
 */

export interface ApiNutritionFood {
  food_name: string;
  quantity: string;
  calories: number | null;
  protein_g: string | number | null;
  carbs_g: string | number | null;
  fat_g: string | number | null;
  source?: string;
  alternatives?: string;
  order_index?: number;
}

export interface ApiNutritionMeal {
  name: string;
  time_indicator: string;
  order_index?: number;
  target_calories: number | null;
  coach_notes: string;
  is_mandatory: boolean;
  food_items: ApiNutritionFood[];
}

export interface ApiNutritionAssignment {
  plan_id: string;
  client_profile: string;
  client_name: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export interface ApiNutritionTemplate {
  id: string;
  creator_name?: string;
  name: string;
  description: string | null;
  daily_calories_target: number | null;
  protein_grams_target: string | number | null;
  carbs_grams_target: string | number | null;
  fat_grams_target: string | number | null;
  is_public_to_org: boolean;
  meal_count: number;
  food_count: number;
  assigned_count: number;
  is_ready: boolean;
  can_manage: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiNutritionTemplateDetail extends ApiNutritionTemplate {
  meals: ApiNutritionMeal[];
  assignments: ApiNutritionAssignment[];
}

export interface ApiNutritionPlan {
  id: string;
  client_profile: string;
  client_name?: string;
  creator_name?: string;
  source_template?: string | null;
  name: string;
  description: string | null;
  daily_calories_target: number | null;
  protein_grams_target: string | number | null;
  carbs_grams_target: string | number | null;
  fat_grams_target: string | number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  meals: ApiNutritionMeal[];
  created_at?: string;
  updated_at?: string;
}

/** Upper bounds the editor enforces before the API has to say no. */
export const MAX_MEALS = 12;
export const MAX_FOODS_PER_MEAL = 30;

export interface NutritionMetaDraft {
  name: string;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface NutritionFoodDraft {
  key: string;
  foodName: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  alternatives: string;
  expanded: boolean;
}

export interface NutritionMealDraft {
  key: string;
  name: string;
  time: string;
  targetCalories: string;
  notes: string;
  isMandatory: boolean;
  collapsed: boolean;
  foods: NutritionFoodDraft[];
}

let counter = 0;

/**
 * Stable React key for a row that does not exist on the server yet.
 *
 * Index keys break reordering: moving meal 2 above meal 1 would remount both
 * inputs and drop whatever was being typed.
 */
export function nutritionDraftKey(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function emptyNutritionMeta(): NutritionMetaDraft {
  return { name: "", description: "", calories: "", protein: "", carbs: "", fat: "" };
}

export function emptyFood(): NutritionFoodDraft {
  return {
    key: nutritionDraftKey("food"),
    foodName: "",
    quantity: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    alternatives: "",
    expanded: false,
  };
}

export function emptyMeal(index: number): NutritionMealDraft {
  return {
    key: nutritionDraftKey("meal"),
    name: `وعده ${index.toLocaleString("fa-IR")}`,
    time: "",
    targetCalories: "",
    notes: "",
    isMandatory: true,
    collapsed: false,
    foods: [],
  };
}

const numberOrNull = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const textNumber = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

export function hydrateNutritionMeta(source: {
  name?: string;
  description?: string | null;
  daily_calories_target?: number | null;
  protein_grams_target?: string | number | null;
  carbs_grams_target?: string | number | null;
  fat_grams_target?: string | number | null;
}): NutritionMetaDraft {
  return {
    name: source.name || "",
    description: source.description || "",
    calories: textNumber(source.daily_calories_target),
    protein: textNumber(source.protein_grams_target),
    carbs: textNumber(source.carbs_grams_target),
    fat: textNumber(source.fat_grams_target),
  };
}

export interface NutritionMetaErrors {
  name?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export function validateNutritionMeta(
  meta: NutritionMetaDraft,
  { requireName = true }: { requireName?: boolean } = {},
): NutritionMetaErrors {
  const errors: NutritionMetaErrors = {};
  const name = meta.name.trim();
  if (requireName && !name) errors.name = "عنوان برنامه را وارد کنید.";
  else if (name.length > 255) errors.name = "عنوان برنامه حداکثر ۲۵۵ کاراکتر است.";

  const calories = meta.calories.trim();
  if (calories) {
    const value = Number(calories);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 10_000) {
      errors.calories = "کالری روزانه باید عددی بین ۰ تا ۱۰۰۰۰ باشد.";
    }
  }

  const macros: Array<[keyof NutritionMetaErrors, string]> = [
    ["protein", meta.protein],
    ["carbs", meta.carbs],
    ["fat", meta.fat],
  ];
  for (const [field, raw] of macros) {
    const value = raw.trim();
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2_000) {
      errors[field] = "مقدار باید عددی بین ۰ تا ۲۰۰۰ گرم باشد.";
    }
  }

  return errors;
}

export function hasMetaErrors(errors: NutritionMetaErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function nutritionTargetsFromMeta(meta: NutritionMetaDraft) {
  return {
    daily_calories_target: numberOrNull(meta.calories),
    protein_grams_target: numberOrNull(meta.protein),
    carbs_grams_target: numberOrNull(meta.carbs),
    fat_grams_target: numberOrNull(meta.fat),
  };
}

export function hydrateMeals(meals: ApiNutritionMeal[] | undefined): NutritionMealDraft[] {
  return (meals || []).map((meal) => ({
    key: nutritionDraftKey("meal"),
    name: meal.name || "",
    time: meal.time_indicator || "",
    targetCalories: textNumber(meal.target_calories),
    notes: meal.coach_notes || "",
    isMandatory: meal.is_mandatory !== false,
    collapsed: false,
    foods: (meal.food_items || []).map((food) => ({
      key: nutritionDraftKey("food"),
      foodName: food.food_name || "",
      quantity: food.quantity || "",
      calories: textNumber(food.calories),
      protein: textNumber(food.protein_g),
      carbs: textNumber(food.carbs_g),
      fat: textNumber(food.fat_g),
      alternatives: food.alternatives || "",
      expanded: false,
    })),
  }));
}

export interface NutritionMealPayload {
  name: string;
  time_indicator: string;
  target_calories: number | null;
  coach_notes: string;
  is_mandatory: boolean;
  food_items: Array<{
    food_name: string;
    quantity: string;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    alternatives: string;
  }>;
}

/**
 * Draft → API payload.
 *
 * Two deliberate coercions: a meal with no title still needs a name (the server
 * requires one), and a food with no quantity means "one portion" rather than an
 * empty string — the trainee prints it on their plan.
 */
export function serializeMeals(meals: NutritionMealDraft[]): NutritionMealPayload[] {
  return meals.map((meal, index) => ({
    name: meal.name.trim() || `وعده ${index + 1}`,
    time_indicator: meal.time.trim(),
    target_calories: numberOrNull(meal.targetCalories),
    coach_notes: meal.notes.trim(),
    is_mandatory: meal.isMandatory,
    food_items: meal.foods
      .filter((food) => food.foodName.trim())
      .map((food) => ({
        food_name: food.foodName.trim(),
        quantity: food.quantity.trim() || "۱ واحد",
        calories: numberOrNull(food.calories),
        protein_g: numberOrNull(food.protein),
        carbs_g: numberOrNull(food.carbs),
        fat_g: numberOrNull(food.fat),
        alternatives: food.alternatives.trim(),
      })),
  }));
}

export interface NutritionTotals {
  meals: number;
  foods: number;
  calories: number;
  protein: number;
}

export function nutritionTotals(meals: NutritionMealDraft[]): NutritionTotals {
  let foods = 0;
  let calories = 0;
  let protein = 0;
  for (const meal of meals) {
    for (const food of meal.foods) {
      if (!food.foodName.trim()) continue;
      foods += 1;
      calories += numberOrNull(food.calories) || 0;
      protein += numberOrNull(food.protein) || 0;
    }
  }
  return {
    meals: meals.length,
    foods,
    calories: Math.round(calories),
    protein: Math.round(protein),
  };
}

/** A plan is assignable only when at least one meal has at least one food. */
export function isNutritionPlanReady(meals: NutritionMealDraft[]): boolean {
  return meals.some((meal) => meal.foods.filter((food) => food.foodName.trim()).length > 0);
}

/** Duplicate a meal in place, suffixing the copy the same way the web does. */
export function duplicateMeal(meals: NutritionMealDraft[], mealKey: string): NutritionMealDraft[] {
  const index = meals.findIndex((meal) => meal.key === mealKey);
  if (index === -1 || meals.length >= MAX_MEALS) return meals;
  const source = meals[index] as NutritionMealDraft;
  const copy: NutritionMealDraft = {
    ...source,
    key: nutritionDraftKey("meal"),
    name: `${source.name} (کپی)`,
    collapsed: false,
    foods: source.foods.map((food) => ({ ...food, key: nutritionDraftKey("food"), expanded: false })),
  };
  const next = [...meals];
  next.splice(index + 1, 0, copy);
  return next;
}

/** Move a meal one slot up (-1) or down (+1); out-of-range moves are no-ops. */
export function moveMeal(
  meals: NutritionMealDraft[],
  mealKey: string,
  direction: -1 | 1,
): NutritionMealDraft[] {
  const index = meals.findIndex((meal) => meal.key === mealKey);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= meals.length) return meals;
  const next = [...meals];
  const moved = next[index] as NutritionMealDraft;
  next[index] = next[target] as NutritionMealDraft;
  next[target] = moved;
  return next;
}

export function formatNutritionTarget(
  value: string | number | null | undefined,
  unit: string,
): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${value} ${unit}`;
}
