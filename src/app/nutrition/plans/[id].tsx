import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Plus, Save } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";

import { JalaliDateField } from "@/components/JalaliDateField";
import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Dialog, useSnackbar } from "@/components/ui/overlay";
import { Badge, Card, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { NutritionMealCard } from "@/features/nutrition/NutritionMealCard";
import { useNutritionMeals } from "@/features/nutrition/useNutritionMeals";
import { useNutritionPlan } from "@/hooks/queries";
import { useRequireRole } from "@/hooks/useRequireRole";
import * as api from "@/services/api/endpoints";
import { qk } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import {
  MAX_MEALS,
  formatJalaliDate,
  hasMetaErrors,
  hydrateMeals,
  hydrateNutritionMeta,
  nutritionTargetsFromMeta,
  serializeMeals,
  toPersianDigits,
  validateNutritionMeta,
  type NutritionMetaDraft,
} from "@bashgino/domain";

/**
 * One trainee's nutrition plan.
 *
 * The coach's copy is independent of the template it came from — editing here
 * must never rewrite the library entry (or another trainee's plan). Saving sends
 * the whole document plus the date window, exactly like the web editor.
 */
export default function NutritionPlanEditorScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = typeof id === "string" ? id : undefined;
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const query = useNutritionPlan(orgId, planId);

  const [meta, setMeta] = useState<NutritionMetaDraft>({
    name: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draft = useNutritionMeals([]);
  // Hydrate once per loaded plan. A refetch (e.g. the one triggered by saving)
  // must not copy the server document back over what the coach is typing.
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    if (hydratedFor.current === query.data.id) return;
    hydratedFor.current = query.data.id;
    setMeta(hydrateNutritionMeta(query.data));
    setStartDate(query.data.start_date ?? null);
    setEndDate(query.data.end_date ?? null);
    draft.setMeals(hydrateMeals(query.data.meals));
    draft.setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!draft.dirty) return false;
      setLeaveOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [draft.dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const errors = validateNutritionMeta(meta);
      if (hasMetaErrors(errors)) throw new Error(errors.name ?? "عنوان برنامه را وارد کنید.");
      if (!startDate) throw new Error("تاریخ شروع دوره را انتخاب کنید.");
      if (endDate && endDate < startDate) {
        throw new Error("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
      }
      return api.updateNutritionPlan(orgId as string, planId as string, {
        name: meta.name.trim(),
        description: meta.description.trim(),
        ...nutritionTargetsFromMeta(meta),
        start_date: startDate,
        end_date: endDate || null,
        meals: serializeMeals(draft.meals),
      });
    },
    onSuccess: () => {
      draft.setDirty(false);
      void queryClient.invalidateQueries({ queryKey: qk.nutritionPlan(orgId, planId ?? "") });
      void queryClient.invalidateQueries({ queryKey: ["nutrition-plans", orgId] });
      show("برنامه تغذیه این شاگرد ذخیره شد.", "success");
    },
    onError: (error) => setSaveError(error instanceof Error ? error.message : "ذخیره انجام نشد."),
  });

  if (query.isLoading) {
    return (
      <AppScreen showHeader={false} contentContainerStyle={{ gap: theme.spacing.md }}>
        <SkeletonCard rows={5} />
      </AppScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <AppScreen showHeader={false}>
        <ErrorState message="دریافت برنامه تغذیه ناموفق بود." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="ghost" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  const plan = query.data;
  const { totals } = draft;

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
      footer={
        <Button
          label="ذخیره برنامه"
          size="lg"
          icon={Save}
          fullWidth
          loading={save.isPending}
          onPress={() => {
            setSaveError(null);
            save.mutate();
          }}
        />
      }
    >
      <Button
        label="بازگشت"
        variant="ghost"
        size="sm"
        icon={ArrowRight}
        onPress={() => (draft.dirty ? setLeaveOpen(true) : router.back())}
        style={{ alignSelf: "flex-start" }}
      />

      <View style={{ gap: 4 }}>
        <AppText variant="caption" tone="muted">
          {plan.client_name ?? "ورزشکار"}
        </AppText>
        <AppText variant="display" weight="extrabold" numberOfLines={2}>
          {meta.name || "برنامه بدون عنوان"}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {meta.description || "بدون توضیح"}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {plan.is_active ? <Badge label="فعال" tone="success" /> : <Badge label="غیرفعال" tone="neutral" />}
          {draft.dirty ? <Badge label="ذخیره نشده" tone="warning" /> : null}
          {plan.source_template ? <Badge label="از کتابخانه" tone="neutral" /> : null}
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <MetaChip label={`${toPersianDigits(totals.meals)} وعده`} />
          <MetaChip label={`${toPersianDigits(totals.foods)} ماده غذایی`} />
          {startDate ? (
            <MetaChip label={`شروع ${formatJalaliDate(startDate, { format: "medium" })}`} />
          ) : null}
          <MetaChip
            label={endDate ? `پایان ${formatJalaliDate(endDate, { format: "medium" })}` : "بدون تاریخ پایان"}
          />
        </View>

        <JalaliDateField label="تاریخ شروع دوره" required value={startDate} onChange={setStartDate} />
        <JalaliDateField
          label="تاریخ پایان (اختیاری)"
          value={endDate}
          onChange={(iso) => setEndDate(iso)}
          placeholder="بدون تاریخ پایان"
        />
        <AppText variant="overline" tone="muted">
          {endDate
            ? "پس از تاریخ پایان، برنامه به‌صورت خودکار غیرفعال می‌شود."
            : "بدون تاریخ پایان، برنامه تا زمان جایگزینی فعال می‌ماند."}
        </AppText>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="وعده‌ها"
          hint={`${toPersianDigits(draft.meals.length)} از ${toPersianDigits(MAX_MEALS)}`}
        />
        {draft.meals.length === 0 ? (
          <EmptyState
            title="این برنامه وعده‌ای ندارد"
            description="برای اینکه ورزشکار بتواند برنامه را ببیند، حداقل یک وعده اضافه کنید."
            action={<Button label="افزودن وعده" icon={Plus} onPress={draft.addMeal} />}
          />
        ) : (
          draft.meals.map((meal, index) => (
            <NutritionMealCard
              key={meal.key}
              meal={meal}
              index={index}
              canMoveUp={index > 0}
              canMoveDown={index < draft.meals.length - 1}
              onPatch={(patch) => draft.patchMeal(meal.key, patch)}
              onRemove={() => draft.removeMeal(meal.key)}
              onDuplicate={() => draft.duplicateMeal(meal.key)}
              onMove={(direction) => draft.moveMeal(meal.key, direction)}
              onAddFood={() => draft.addFood(meal.key)}
              onPatchFood={(foodKey, patch) => draft.patchFood(meal.key, foodKey, patch)}
              onRemoveFood={(foodKey) => draft.removeFood(meal.key, foodKey)}
            />
          ))
        )}
        <Button
          label="افزودن وعده"
          variant="secondary"
          icon={Plus}
          disabled={draft.meals.length >= MAX_MEALS}
          onPress={draft.addMeal}
        />
      </View>

      <Card style={{ gap: 10 }}>
        <AppText variant="caption" weight="semibold" tone="secondary">
          اطلاعات برنامه
        </AppText>
        <Input label="عنوان" value={meta.name} onChangeText={(name) => { setMeta({ ...meta, name }); draft.markDirty(); }} />
        <Input
          label="توضیح"
          value={meta.description}
          onChangeText={(description) => { setMeta({ ...meta, description }); draft.markDirty(); }}
          multiline
        />
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label="کالری روزانه"
              value={meta.calories}
              onChangeText={(calories) => { setMeta({ ...meta, calories }); draft.markDirty(); }}
              keyboardType="number-pad"
              numeric
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="پروتئین (گ)"
              value={meta.protein}
              onChangeText={(protein) => { setMeta({ ...meta, protein }); draft.markDirty(); }}
              keyboardType="decimal-pad"
              numeric
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label="کربوهیدرات (گ)"
              value={meta.carbs}
              onChangeText={(carbs) => { setMeta({ ...meta, carbs }); draft.markDirty(); }}
              keyboardType="decimal-pad"
              numeric
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="چربی (گ)"
              value={meta.fat}
              onChangeText={(fat) => { setMeta({ ...meta, fat }); draft.markDirty(); }}
              keyboardType="decimal-pad"
              numeric
            />
          </View>
        </View>
      </Card>

      {saveError ? (
        <Card style={{ backgroundColor: theme.colors.errorSubtle, borderColor: theme.colors.errorBorder }}>
          <AppText variant="caption" style={{ color: theme.colors.error }}>
            {saveError}
          </AppText>
        </Card>
      ) : null}

      <Dialog
        visible={leaveOpen}
        title="تغییرات ذخیره نشده"
        message="اگر خارج شوید، تغییرات ذخیره‌نشده از بین می‌رود."
        confirmLabel="خروج بدون ذخیره"
        cancelLabel="بمان"
        destructive
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          draft.setDirty(false);
          router.back();
        }}
      />
    </AppScreen>
  );
}
