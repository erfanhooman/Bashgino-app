import {
  CUSTOM_GOAL,
  MAX_MEALS,
  buildTemplatePayload,
  duplicateMeal,
  emptyFood,
  emptyMeal,
  hydrateNutritionMeta,
  hydrateTemplateMeta,
  isNutritionPlanReady,
  moveMeal,
  nutritionTargetsFromMeta,
  nutritionTotals,
  serializeMeals,
  templateGoalValue,
  validateNutritionMeta,
  validateTemplateMeta,
} from "@bashgino/domain";

describe("nutrition draft contract", () => {
  it("keeps the web's validation messages", () => {
    expect(validateNutritionMeta({ name: " ", description: "", calories: "", protein: "", carbs: "", fat: "" })).toEqual({
      name: "عنوان برنامه را وارد کنید.",
    });
    expect(
      validateNutritionMeta({ name: "x", description: "", calories: "20000", protein: "", carbs: "", fat: "" }),
    ).toEqual({ calories: "کالری روزانه باید عددی بین ۰ تا ۱۰۰۰۰ باشد." });
    expect(
      validateNutritionMeta({ name: "x", description: "", calories: "", protein: "5000", carbs: "", fat: "" }),
    ).toEqual({ protein: "مقدار باید عددی بین ۰ تا ۲۰۰۰ گرم باشد." });
  });

  it("coerces a blank quantity to one portion and drops unnamed foods", () => {
    const meal = { ...emptyMeal(1), key: "m1", foods: [emptyFood()] };
    meal.foods[0] = { ...meal.foods[0]!, foodName: " برنج ", quantity: "" };

    const [payload] = serializeMeals([meal]);
    expect(payload?.food_items).toHaveLength(1);
    expect(payload?.food_items[0]?.quantity).toBe("۱ واحد");
    expect(payload?.name).toBe("وعده ۱");
  });

  it("is assignable only when some meal has a food", () => {
    const empty = [{ ...emptyMeal(1), foods: [emptyFood()] }];
    expect(isNutritionPlanReady(empty)).toBe(false);

    const filled = [{ ...emptyMeal(1), foods: [{ ...emptyFood(), foodName: "تخم مرغ" }] }];
    expect(isNutritionPlanReady(filled)).toBe(true);
  });

  it("duplicates and reorders without losing foods", () => {
    const first = { ...emptyMeal(1), key: "a", foods: [{ ...emptyFood(), foodName: "جو" }] };
    const second = { ...emptyMeal(2), key: "b" };
    const duplicated = duplicateMeal([first, second], "a");
    expect(duplicated).toHaveLength(3);
    expect(duplicated[1]?.name).toContain("(کپی)");
    expect(duplicated[1]?.foods[0]?.foodName).toBe("جو");

    const moved = moveMeal([first, second], "b", -1);
    expect(moved.map((meal) => meal.key)).toEqual(["b", "a"]);
    expect(moveMeal([first], "a", -1)).toHaveLength(1);
  });

  it("caps the meal list", () => {
    const many = Array.from({ length: MAX_MEALS }, (_, index) => ({ ...emptyMeal(index + 1), key: `k${index}` }));
    expect(duplicateMeal(many, "k0")).toHaveLength(MAX_MEALS);
  });

  it("totals only count named foods", () => {
    const meals = [
      {
        ...emptyMeal(1),
        foods: [
          { ...emptyFood(), foodName: "مرغ", calories: "200", protein: "30" },
          { ...emptyFood(), foodName: "", calories: "500" },
        ],
      },
    ];
    expect(nutritionTotals(meals)).toEqual({ meals: 1, foods: 1, calories: 200, protein: 30 });
  });

  it("hydrates targets as text and treats empty as null", () => {
    expect(hydrateNutritionMeta({ name: "p", daily_calories_target: 2200, protein_grams_target: "150.5" })).toEqual({
      name: "p",
      description: "",
      calories: "2200",
      protein: "150.5",
      carbs: "",
      fat: "",
    });
    expect(nutritionTargetsFromMeta({ name: "", description: "", calories: "", protein: "", carbs: "", fat: "" }))
      .toEqual({ daily_calories_target: null, protein_grams_target: null, carbs_grams_target: null, fat_grams_target: null });
  });
});

describe("training template contract", () => {
  it("turns an unknown stored goal into the custom value", () => {
    expect(hydrateTemplateMeta({ name: "p", goal: "STRENGTH" }).goal).toBe("STRENGTH");
    const custom = hydrateTemplateMeta({ name: "p", goal: "آماده‌سازی مسابقه" });
    expect(custom.goal).toBe(CUSTOM_GOAL);
    expect(custom.customGoal).toBe("آماده‌سازی مسابقه");
    expect(templateGoalValue(custom)).toBe("آماده‌سازی مسابقه");
  });

  it("requires a title and a goal when custom is chosen", () => {
    expect(validateTemplateMeta({ name: "", goal: "", customGoal: "", description: "" }).name).toBe(
      "عنوان برنامه را وارد کنید.",
    );
    expect(validateTemplateMeta({ name: "p", goal: CUSTOM_GOAL, customGoal: " ", description: "" }).goal).toBe(
      "متن هدف دلخواه را بنویسید یا یکی از گزینه‌های آماده را انتخاب کنید.",
    );
  });

  it("builds the day payload in order with defaults applied", () => {
    const payload = buildTemplatePayload(
      { name: " برنامه ", goal: "STRENGTH", customGoal: "", description: " توضیح " },
      [
        {
          key: "d1",
          name: " ",
          collapsed: false,
          weekday: 2,
          scheduledDate: null,
          exercises: [],
        },
      ],
    );
    expect(payload.name).toBe("برنامه");
    expect(payload.description).toBe("توضیح");
    expect(payload.days).toHaveLength(1);
    expect(payload.days[0]?.name).toBe("روز 1");
    expect(payload.days[0]?.order_index).toBe(1);
  });
});
