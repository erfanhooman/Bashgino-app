import { useMutation, useQuery } from "@tanstack/react-query";
import { Apple, Check, Flame } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, ProgressBar, SkeletonCard } from "@/components/ui/layout";
import { useSnackbar } from "@/components/ui/overlay";
import { Badge, Card, Divider, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import * as api from "@/services/api/endpoints";
import { queryClient, qk } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits } from "@bashgino/domain";
import type { NutritionLog, NutritionPlan } from "@bashgino/types";

const isoToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

/**
 * The trainee's nutrition day.
 *
 * Read the assigned plan, tick what was followed, send one log per day. The plan
 * is a server-side copy, so a coach editing a template never rewrites the meals a
 * trainee already saw.
 *
 * Adherence is measured the way the web measures it (`ACC-NUT-02`): followed
 * *mandatory* meals over total mandatory meals, capped at 100. Optional meals can
 * be ticked but must not flatter the score.
 */
export default function NutritionLogScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const { show } = useSnackbar();
  const today = isoToday();

  const plans = useQuery<NutritionPlan[]>({
    queryKey: ["nutrition-plans", orgId],
    queryFn: () => api.getNutritionPlans(orgId as string),
    enabled: Boolean(orgId),
  });
  const logs = useQuery<NutritionLog[]>({
    queryKey: ["nutrition-logs", orgId],
    queryFn: () => api.getNutritionLogs(orgId as string),
    enabled: Boolean(orgId),
  });

  const [followed, setFollowed] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const plan = (plans.data ?? []).find((entry) => entry.is_active) ?? (plans.data ?? [])[0] ?? null;
  const meals = useMemo(() => plan?.meals ?? [], [plan]);

  /** Meal identity: the server id, or a stable index when the row is unsaved. */
  const mealKey = (index: number) => meals[index]?.id ?? `meal-${index}`;

  const mandatoryCount = meals.filter((meal) => meal.is_mandatory !== false).length;
  const followedMandatory = meals.filter(
    (meal, index) => meal.is_mandatory !== false && followed.includes(mealKey(index)),
  ).length;
  const adherence =
    mandatoryCount > 0 ? Math.min(100, Math.round((followedMandatory / mandatoryCount) * 100)) : 100;

  const loggedToday = useMemo(
    () => (logs.data ?? []).some((log) => log.log_date === today),
    [logs.data, today],
  );

  const submit = useMutation({
    mutationFn: () =>
      api.submitNutritionLog(orgId as string, {
        log_date: today,
        meals_followed: followed,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nutrition-logs", orgId] });
      show(`گزارش پایبندی امروز با موفقیت ثبت شد (${toPersianDigits(adherence)}٪).`, "success");
      setNotes("");
    },
    onError: (error) => show(error instanceof Error ? error.message : "ثبت انجام نشد.", "error"),
  });

  const caloriesTarget = plan?.daily_calories_target ?? null;

  return (
    <AppScreen
      title="تغذیه امروز"
      subtitle={formatJalaliDate(new Date(), { format: "full" })}
      refreshing={plans.isRefetching || logs.isRefetching}
      onRefresh={() => {
        void plans.refetch();
        void logs.refetch();
      }}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {plans.isLoading ? (
        <SkeletonCard rows={4} />
      ) : plans.isError ? (
        <ErrorState message="برنامه غذایی بارگذاری نشد." onRetry={() => void plans.refetch()} />
      ) : !plan || meals.length === 0 ? (
        <EmptyState
          title="هنوز برنامه غذایی ندارید"
          description="از مربی خود بخواهید برنامه غذایی برای شما فعال کند."
          icon={<Apple size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
        />
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <AppText variant="subtitle" style={{ flex: 1 }} numberOfLines={2}>
                {plan.name}
              </AppText>
              {loggedToday ? <Badge label="امروز ثبت شد" tone="success" /> : null}
            </View>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              <MetaChip label={`${toPersianDigits(meals.length)} وعده`} />
              {caloriesTarget ? (
                <MetaChip label={`${toPersianDigits(caloriesTarget)} کالری هدف`} />
              ) : null}
              {plan.protein_grams_target ? (
                <MetaChip label={`${toPersianDigits(plan.protein_grams_target)} گرم پروتئین`} />
              ) : null}
            </View>

            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText variant="caption" tone="secondary">
                  پایبندی امروز
                </AppText>
                <AppText variant="caption" weight="semibold" numeric>
                  {toPersianDigits(adherence)}٪
                </AppText>
              </View>
              <ProgressBar value={adherence} />
              <AppText variant="overline" tone="muted">
                {toPersianDigits(followedMandatory)} از {toPersianDigits(mandatoryCount)} وعده الزامی
              </AppText>
            </View>
          </Card>

          <View style={{ gap: theme.spacing.sm }}>
            <SectionHeader title="وعده‌ها" hint="وعده‌هایی که رعایت کردید را انتخاب کنید" />
            {meals.map((meal, index) => {
              const key = mealKey(index);
              const checked = followed.includes(key);
              const calories = meal.food_items.reduce((total, food) => total + (food.calories ?? 0), 0);
              return (
                <Card
                  key={key}
                  padded={false}
                  onPress={() =>
                    setFollowed((current) =>
                      current.includes(key)
                        ? current.filter((id) => id !== key)
                        : [...current, key],
                    )
                  }
                  style={{
                    padding: theme.spacing.md,
                    gap: 6,
                    borderColor: checked ? theme.colors.selected : theme.colors.border,
                    backgroundColor: checked ? theme.colors.primarySubtle : theme.colors.surface,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="body" weight="semibold" numberOfLines={1}>
                        {meal.name || `وعده ${toPersianDigits(index + 1)}`}
                      </AppText>
                      <AppText variant="caption" tone="muted" numberOfLines={1}>
                        {[
                          meal.time_indicator || null,
                          meal.is_mandatory === false ? "اختیاری" : "الزامی",
                          (meal.target_calories ?? calories) > 0
                            ? `${toPersianDigits(meal.target_calories ?? calories)} کالری`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </AppText>
                    </View>
                    {checked ? <Check size={18} color={theme.colors.brandInk} strokeWidth={2.5} /> : null}
                  </View>

                  {meal.coach_notes ? (
                    <AppText variant="caption" tone="secondary">
                      {meal.coach_notes}
                    </AppText>
                  ) : null}

                  {meal.food_items.length > 0 ? (
                    <>
                      <Divider />
                      {meal.food_items.map((food, foodIndex) => (
                        <View
                          key={food.id ?? `${food.food_name}-${foodIndex}`}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                        >
                          <AppText variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                            {food.food_name}
                          </AppText>
                          <AppText variant="overline" tone="muted" numeric>
                            {food.quantity}
                          </AppText>
                        </View>
                      ))}
                    </>
                  ) : null}
                </Card>
              );
            })}
          </View>

          <Input
            label="یادداشت (اختیاری)"
            placeholder="مثلاً: ناهار را بیرون خوردم"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Button
            label={loggedToday ? "ثبت دوباره وضعیت امروز" : "ثبت وضعیت امروز"}
            size="lg"
            loading={submit.isPending}
            disabled={followed.length === 0}
            onPress={() => submit.mutate()}
          />
          {followed.length === 0 ? (
            <AppText variant="caption" tone="muted" center>
              حداقل یک وعده را انتخاب کنید تا بتوانید ثبت کنید.
            </AppText>
          ) : null}

          {(logs.data ?? []).length > 0 ? (
            <View style={{ gap: 6 }}>
              <SectionHeader title="ثبت‌های اخیر" />
              {(logs.data ?? []).slice(0, 5).map((log) => (
                <Card key={log.id} padded={false} style={{ padding: theme.spacing.md }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <AppText variant="caption" tone="secondary">
                      {formatJalaliDate(log.log_date, { format: "medium" })}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {toPersianDigits(log.meals_followed.length)} وعده رعایت شد
                    </AppText>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}
        </>
      )}
    </AppScreen>
  );
}
