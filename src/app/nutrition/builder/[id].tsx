import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Plus, Save, Users } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, ProgressBar, SkeletonCard } from "@/components/ui/layout";
import { Dialog, Sheet, useSnackbar } from "@/components/ui/overlay";
import { Badge, Card, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { NutritionMealCard } from "@/features/nutrition/NutritionMealCard";
import { useNutritionMeals } from "@/features/nutrition/useNutritionMeals";
import { useClients, useNutritionTemplate } from "@/hooks/queries";
import { useRequireRole } from "@/hooks/useRequireRole";
import * as api from "@/services/api/endpoints";
import { qk } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import {
  MAX_MEALS,
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
 * Reusable nutrition template editor.
 *
 * Functionally the same page as the web editor: metadata + targets, meals with
 * foods, assignment to athletes, and the same guard rails (a plan that has no
 * food anywhere cannot be assigned; unsaved changes ask before leaving; a
 * template created by someone else opens read-only).
 */
export default function NutritionTemplateEditorScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { id, new: isNewParam } = useLocalSearchParams<{ id: string; new?: string }>();
  const templateId = typeof id === "string" ? id : undefined;
  const isNewPlan = isNewParam === "1";
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const query = useNutritionTemplate(orgId, templateId);
  const clients = useClients(orgId);

  const [meta, setMeta] = useState<NutritionMetaDraft>({
    name: "",
    description: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [metaOpen, setMetaOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [serverAssignees, setServerAssignees] = useState<string[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draft = useNutritionMeals([]);
  // Hydrate once per loaded plan. A refetch (e.g. the one triggered by saving)
  // must not copy the server document back over what the coach is typing.
  const hydratedFor = useRef<string | null>(null);

  const readOnly = query.data ? query.data.can_manage === false : false;

  // Hydrate once per load: re-running on every keystroke would fight the draft.
  useEffect(() => {
    if (!query.data) return;
    if (hydratedFor.current === query.data.id) return;
    hydratedFor.current = query.data.id;
    setMeta(hydrateNutritionMeta(query.data));
    draft.setMeals(hydrateMeals(query.data.meals));
    const ids = (query.data.assignments ?? [])
      .filter((assignment) => assignment.is_active)
      .map((assignment) => assignment.client_profile);
    setAssignees(ids);
    setServerAssignees(ids);
    draft.setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  // Android hardware back must run through the same unsaved-changes guard.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!draft.dirty) return false;
      setLeaveOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [draft.dirty]);

  const clientRows = useMemo(
    () =>
      (clients.data ?? [])
        .filter((client) => client.status !== "ARCHIVED")
        .map((client) => ({ id: client.id, name: client.user?.full_name ?? "بدون نام" })),
    [clients.data],
  );

  const save = useMutation({
    mutationFn: async () => {
      const errors = validateNutritionMeta(meta);
      if (hasMetaErrors(errors)) throw new Error(errors.name ?? "عنوان برنامه را وارد کنید.");
      await api.updateNutritionTemplate(orgId as string, templateId as string, {
        name: meta.name.trim(),
        description: meta.description.trim(),
        ...nutritionTargetsFromMeta(meta),
        meals: serializeMeals(draft.meals),
      });
      // Content saves are allowed on an incomplete plan; assignment is not.
      if (draft.ready) {
        await api.setNutritionTemplateAssignments(orgId as string, templateId as string, {
          client_profile_ids: assignees,
        });
        setServerAssignees(assignees);
      }
    },
    onSuccess: () => {
      draft.setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["nutrition-templates", orgId] });
      void queryClient.invalidateQueries({ queryKey: qk.nutritionTemplate(orgId, templateId ?? "") });
      if (isNewPlan) {
        router.replace(`/nutrition?saved=${encodeURIComponent(meta.name.trim())}` as never);
        return;
      }
      show("برنامه تغذیه ذخیره شد.", "success");
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

  const { totals } = draft;

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
      footer={
        readOnly ? null : (
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
        )
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
        <AppText variant="display" weight="extrabold" numberOfLines={2}>
          {meta.name || "برنامه بدون عنوان"}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {meta.description || "بدون توضیح"}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {draft.ready ? <Badge label="آماده تخصیص" tone="success" /> : <Badge label="ناقص" tone="warning" />}
          {draft.dirty ? <Badge label="ذخیره نشده" tone="warning" /> : null}
          {readOnly ? <Badge label="فقط مشاهده" tone="neutral" /> : null}
          {query.data.is_public_to_org === false ? <Badge label="خصوصی" tone="neutral" /> : null}
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <MetaChip label={`${toPersianDigits(totals.meals)} وعده`} />
          <MetaChip label={`${toPersianDigits(totals.foods)} ماده غذایی`} />
          {meta.calories ? <MetaChip label={`${toPersianDigits(meta.calories)} کالری هدف`} /> : null}
          {meta.protein ? <MetaChip label={`${toPersianDigits(meta.protein)} گرم پروتئین`} /> : null}
        </View>

        {totals.meals > 0 ? (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="caption" tone="secondary">
                پیشرفت ساخت
              </AppText>
              <AppText variant="caption" numeric weight="semibold">
                {toPersianDigits(draft.ready ? 100 : Math.round((totals.foods / 4) * 100))}٪
              </AppText>
            </View>
            <ProgressBar value={draft.ready ? 100 : Math.min(95, (totals.foods / 4) * 100)} />
          </View>
        ) : null}

        {readOnly ? (
          <AppText variant="caption" tone="muted">
            این برنامه توسط مربی دیگری ساخته شده است؛ فقط می‌توانید آن را ببینید و تخصیص دهید.
          </AppText>
        ) : (
          <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
            <Button label="ویرایش اطلاعات" variant="secondary" size="sm" onPress={() => setMetaOpen(true)} />
            <Button
              label="تخصیص به ورزشکاران"
              variant="secondary"
              size="sm"
              icon={Users}
              onPress={() => setAssignOpen(true)}
            />
          </View>
        )}

        <AppText variant="overline" tone="muted">
          {toPersianDigits(serverAssignees.length)} ورزشکار تخصیص‌یافته
        </AppText>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="وعده‌ها"
          hint={`${toPersianDigits(draft.meals.length)} از ${toPersianDigits(MAX_MEALS)}`}
        />
        {draft.meals.length === 0 ? (
          <EmptyState
            title="هنوز وعده‌ای اضافه نکرده‌اید"
            description="برای تخصیص برنامه، حداقل یک وعده با یک ماده غذایی لازم است."
            action={
              readOnly ? undefined : (
                <Button label="افزودن وعده" icon={Plus} onPress={draft.addMeal} />
              )
            }
          />
        ) : (
          draft.meals.map((meal, index) => (
            <NutritionMealCard
              key={meal.key}
              meal={meal}
              index={index}
              readOnly={readOnly}
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

        {readOnly ? null : (
          <Button
            label="افزودن وعده"
            variant="secondary"
            icon={Plus}
            disabled={draft.meals.length >= MAX_MEALS}
            onPress={draft.addMeal}
          />
        )}
      </View>

      {saveError ? (
        <Card
          style={{
            backgroundColor: theme.colors.errorSubtle,
            borderColor: theme.colors.errorBorder,
          }}
        >
          <AppText variant="caption" style={{ color: theme.colors.error }}>
            {saveError}
          </AppText>
        </Card>
      ) : null}

      <Sheet
        visible={metaOpen}
        onClose={() => setMetaOpen(false)}
        title="اطلاعات برنامه"
        footer={
          <Button
            label="ذخیره اطلاعات"
            fullWidth
            onPress={() => {
              const errors = validateNutritionMeta(meta);
              if (hasMetaErrors(errors)) {
                setSaveError(errors.name ?? "مقادیر واردشده معتبر نیستند.");
                return;
              }
              setMetaOpen(false);
              draft.markDirty();
            }}
          />
        }
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Input label="عنوان برنامه" required value={meta.name} onChangeText={(name) => setMeta({ ...meta, name })} />
          <Input
            label="توضیح"
            value={meta.description}
            onChangeText={(description) => setMeta({ ...meta, description })}
            multiline
          />
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="کالری روزانه"
                value={meta.calories}
                onChangeText={(calories) => setMeta({ ...meta, calories })}
                keyboardType="number-pad"
                numeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="پروتئین (گ)"
                value={meta.protein}
                onChangeText={(protein) => setMeta({ ...meta, protein })}
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
                onChangeText={(carbs) => setMeta({ ...meta, carbs })}
                keyboardType="decimal-pad"
                numeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="چربی (گ)"
                value={meta.fat}
                onChangeText={(fat) => setMeta({ ...meta, fat })}
                keyboardType="decimal-pad"
                numeric
              />
            </View>
          </View>
        </View>
      </Sheet>

      <Sheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="تخصیص برنامه"
        description={
          draft.ready
            ? "با ذخیره، برای هر ورزشکار یک نسخه جداگانه ساخته می‌شود که تاریخچه و وضعیت خودش را دارد."
            : "برای تخصیص، ابتدا حداقل یک وعده با یک ماده غذایی اضافه کنید."
        }
        footer={
          <Button
            label="ثبت تخصیص"
            fullWidth
            disabled={!draft.ready || assignees.length === 0}
            onPress={() => {
              draft.markDirty();
              setAssignOpen(false);
              show("تخصیص با ذخیره برنامه اعمال می‌شود.");
            }}
          />
        }
      >
        <View style={{ gap: 6 }}>
          {clientRows.length === 0 ? (
            <AppText variant="caption" tone="muted">
              ورزشکاری در این فضا نیست.
            </AppText>
          ) : (
            clientRows.map((client) => {
              const checked = assignees.includes(client.id);
              return (
                <Card
                  key={client.id}
                  padded={false}
                  onPress={() =>
                    setAssignees((current) =>
                      current.includes(client.id)
                        ? current.filter((value) => value !== client.id)
                        : [...current, client.id],
                    )
                  }
                  style={{
                    padding: theme.spacing.md,
                    borderColor: checked ? theme.colors.selected : theme.colors.border,
                    backgroundColor: checked ? theme.colors.primarySubtle : theme.colors.surface,
                  }}
                >
                  <AppText variant="body" weight="medium">
                    {client.name}
                  </AppText>
                </Card>
              );
            })
          )}
        </View>
      </Sheet>

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
