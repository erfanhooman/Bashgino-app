import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { MAX_FOODS_PER_MEAL, toPersianDigits, type NutritionMealDraft } from "@bashgino/domain";

import { Button, IconButton } from "@/components/ui/button";
import { Input, ToggleRow } from "@/components/ui/form";
import { Card, MetaChip } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useTheme } from "@/theme";

/**
 * One meal in the plan editor.
 *
 * Collapsed by default: a 6-meal plan with 30 foods each would otherwise be a
 * 180-field page. The header carries everything needed to skim the plan, and the
 * body only appears for the meal being worked on.
 */
export function NutritionMealCard({
  meal,
  index,
  readOnly,
  canMoveUp,
  canMoveDown,
  onPatch,
  onRemove,
  onDuplicate,
  onMove,
  onAddFood,
  onPatchFood,
  onRemoveFood,
}: {
  meal: NutritionMealDraft;
  index: number;
  readOnly?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPatch: (patch: Partial<NutritionMealDraft>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onAddFood: () => void;
  onPatchFood: (foodKey: string, patch: FoodPatch) => void;
  onRemoveFood: (foodKey: string) => void;
}) {
  const theme = useTheme();
  const filled = meal.foods.filter((food) => food.foodName.trim()).length;

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {meal.name.trim() || `وعده ${toPersianDigits(index + 1)}`}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {[
              meal.time.trim() || null,
              `${toPersianDigits(filled)} ماده غذایی`,
              meal.targetCalories.trim() ? `${toPersianDigits(meal.targetCalories)} کالری` : null,
              meal.isMandatory ? "الزامی" : "اختیاری",
            ]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
        </View>

        {readOnly ? null : (
          <IconButton
            icon={meal.collapsed ? ChevronDown : ChevronUp}
            label={meal.collapsed ? "باز کردن وعده" : "بستن وعده"}
            onPress={() => onPatch({ collapsed: !meal.collapsed })}
          />
        )}
      </View>

      {meal.collapsed ? null : (
        <View style={{ gap: theme.spacing.sm }}>
          <Input label="نام وعده" value={meal.name} onChangeText={(name) => onPatch({ name })} editable={!readOnly} />

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="زمان"
                value={meal.time}
                onChangeText={(time) => onPatch({ time })}
                placeholder="مثلاً ۸:۰۰"
                editable={!readOnly}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="کالری هدف"
                value={meal.targetCalories}
                onChangeText={(targetCalories) => onPatch({ targetCalories })}
                keyboardType="number-pad"
                numeric
                editable={!readOnly}
              />
            </View>
          </View>

          <Input
            label="یادداشت مربی"
            value={meal.notes}
            onChangeText={(notes) => onPatch({ notes })}
            placeholder="نکته‌ای برای این وعده"
            multiline
            editable={!readOnly}
          />

          <ToggleRow
            label="وعده الزامی"
            description="اگر خاموش باشد، ورزشکار می‌تواند آن را رد کند."
            value={meal.isMandatory}
            disabled={readOnly}
            onToggle={(isMandatory) => onPatch({ isMandatory })}
          />

          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <AppText variant="caption" weight="semibold" tone="secondary">
                مواد غذایی
              </AppText>
              <MetaChip label={`${toPersianDigits(meal.foods.length)} / ${toPersianDigits(MAX_FOODS_PER_MEAL)}`} />
            </View>

            {meal.foods.length === 0 ? (
              <AppText variant="caption" tone="muted">
                هنوز ماده غذایی اضافه نشده است.
              </AppText>
            ) : (
              meal.foods.map((food) => (
                <FoodRow
                  key={food.key}
                  food={food}
                  readOnly={readOnly}
                  onPatch={(patch) => onPatchFood(food.key, patch)}
                  onRemove={() => onRemoveFood(food.key)}
                />
              ))
            )}

            {readOnly ? null : (
              <Button
                label="افزودن ماده غذایی"
                variant="secondary"
                size="sm"
                icon={Plus}
                disabled={meal.foods.length >= MAX_FOODS_PER_MEAL}
                onPress={onAddFood}
              />
            )}
          </View>

          {readOnly ? null : (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
              <Button
                label="جابه‌جایی به بالا"
                variant="ghost"
                size="sm"
                disabled={!canMoveUp}
                onPress={() => onMove(-1)}
              />
              <Button
                label="جابه‌جایی به پایین"
                variant="ghost"
                size="sm"
                disabled={!canMoveDown}
                onPress={() => onMove(1)}
              />
              <Button label="تکرار وعده" variant="ghost" size="sm" icon={Copy} onPress={onDuplicate} />
              <Button
                label="حذف وعده"
                variant="ghost"
                size="sm"
                icon={Trash2}
                onPress={onRemove}
                accessibilityLabel={`حذف ${meal.name}`}
              />
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

type FoodPatch = {
  foodName?: string;
  quantity?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  alternatives?: string;
  expanded?: boolean;
};

function FoodRow({
  food,
  readOnly,
  onPatch,
  onRemove,
}: {
  food: NutritionMealDraft["foods"][number];
  readOnly?: boolean;
  onPatch: (patch: FoodPatch) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceSubtle,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="نام ماده غذایی"
            value={food.foodName}
            onChangeText={(foodName) => onPatch({ foodName })}
            editable={!readOnly}
          />
        </View>
        <IconButton
          icon={expanded ? ChevronUp : ChevronDown}
          label={expanded ? "بستن جزئیات" : "جزئیات ماده غذایی"}
          onPress={() => setExpanded((current) => !current)}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="مقدار (مثلاً ۱۰۰ گرم)"
            value={food.quantity}
            onChangeText={(quantity) => onPatch({ quantity })}
            editable={!readOnly}
          />
        </View>
        {readOnly ? null : <IconButton icon={Trash2} label="حذف ماده غذایی" onPress={onRemove} />}
      </View>

      {expanded ? (
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="کالری"
                value={food.calories}
                onChangeText={(calories) => onPatch({ calories })}
                keyboardType="number-pad"
                numeric
                editable={!readOnly}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="پروتئین (گ)"
                value={food.protein}
                onChangeText={(protein) => onPatch({ protein })}
                keyboardType="decimal-pad"
                numeric
                editable={!readOnly}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="کربوهیدرات (گ)"
                value={food.carbs}
                onChangeText={(carbs) => onPatch({ carbs })}
                keyboardType="decimal-pad"
                numeric
                editable={!readOnly}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="چربی (گ)"
                value={food.fat}
                onChangeText={(fat) => onPatch({ fat })}
                keyboardType="decimal-pad"
                numeric
                editable={!readOnly}
              />
            </View>
          </View>
          <Input
            label="جایگزین‌ها"
            value={food.alternatives}
            onChangeText={(alternatives) => onPatch({ alternatives })}
            placeholder="مثلاً ماست یونانی بدون چربی"
            multiline
            editable={!readOnly}
          />
        </View>
      ) : null}
    </View>
  );
}
