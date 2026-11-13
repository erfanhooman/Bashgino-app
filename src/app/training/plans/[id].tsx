import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ExercisePickerSheet, PlanDayCard } from "@/features/training/PlanDayCard";
import { useExerciseCatalogueSlice } from "@/hooks/useExerciseArtwork";
import { useRequireRole } from "@/hooks/useRequireRole";
import * as api from "@/services/api/endpoints";
import { qk } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import {
  CUSTOM_GOAL,
  TRAINING_GOALS,
  buildTemplatePayload,
  createDay,
  createExerciseDraft,
  duplicateDay,
  duplicateExercise,
  goalLabel,
  hasMetaErrors,
  hydrateTemplateDays,
  hydrateTemplateMeta,
  serializeWorkoutDays,
  toPersianDigits,
  validateTemplateMeta,
  validateWorkoutDays,
  type ExerciseLibraryItem,
  type PlanDayDraft,
  type PlanTemplateMetaDraft,
} from "@bashgino/domain";
import type { TrainingPlan } from "@bashgino/types";

/**
 * One trainee's training plan.
 *
 * The server keeps a full copy per trainee, so this editor never touches the
 * library template: it PATCHes the plan and sends `revision_number` back, which is
 * how the API refuses to overwrite a plan another device edited meanwhile.
 */
export default function TrainingPlanEditorScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = typeof id === "string" ? id : undefined;
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const query = useQuery<TrainingPlan>({
    queryKey: ["training-plan", orgId, planId] as const,
    queryFn: () => api.getTrainingPlanDetail(orgId as string, planId as string),
    enabled: Boolean(orgId && planId),
  });

  const [meta, setMeta] = useState<PlanTemplateMetaDraft>({
    name: "",
    goal: "",
    customGoal: "",
    description: "",
  });
  const [startDate, setStartDate] = useState<string | null>(null);
  const [days, setDays] = useState<PlanDayDraft[]>([]);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  // One catalogue request for every exercise in the draft, so each row shows the
  // dataset illustration the web builder shows.
  const draftExerciseIds = days.flatMap((day) => day.exercises.map((row) => row.exerciseId));
  const catalogue = useExerciseCatalogueSlice(draftExerciseIds);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    if (hydratedFor.current === query.data.id) return;
    hydratedFor.current = query.data.id;
    setMeta(hydrateTemplateMeta(query.data));
    setStartDate(query.data.start_date ?? null);
    setDays(hydrateTemplateDays(query.data as unknown as { days?: unknown[] }));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!dirty) return false;
      setLeaveOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [dirty]);

  const touch = () => setDirty(true);

  const save = useMutation({
    mutationFn: async () => {
      const metaCheck = validateTemplateMeta(meta);
      if (hasMetaErrors(metaCheck) || !metaCheck.valid) {
        throw new Error(metaCheck.name ?? "اطلاعات برنامه معتبر نیست.");
      }
      const dayCheck = validateWorkoutDays(days);
      if (!dayCheck.valid) throw new Error("برای ذخیره، پارامترهای نامعتبر روزهای تمرینی را اصلاح کنید.");
      return api.updateTrainingPlan(orgId as string, planId as string, {
        ...buildTemplatePayload(meta, days),
        start_date: startDate ?? undefined,
        revision_number: query.data?.revision_number,
        days: serializeWorkoutDays(days),
      });
    },
    onSuccess: () => {
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: qk.trainingPlans(orgId) });
      void queryClient.invalidateQueries({ queryKey: ["training-plan", orgId, planId] });
      void clientInvalidate();
      show("برنامه تمرینی این ورزشکار ذخیره شد.", "success");
    },
    onError: (error) => setSaveError(error instanceof Error ? error.message : "ذخیره انجام نشد."),
  });

  const clientInvalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["today", orgId] });

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
        <ErrorState message="دریافت برنامه تمرینی ناموفق بود." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="ghost" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  const exerciseCount = days.reduce((total, day) => total + day.exercises.length, 0);

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
        onPress={() => (dirty ? setLeaveOpen(true) : router.back())}
        style={{ alignSelf: "flex-start" }}
      />

      <View style={{ gap: 4 }}>
        <AppText variant="caption" tone="muted">
          {query.data.client_name ?? "ورزشکار"}
        </AppText>
        <AppText variant="display" weight="extrabold" numberOfLines={2}>
          {meta.name || "برنامه بدون عنوان"}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {meta.goal ? goalLabel(meta.goal, meta.customGoal) : "بدون هدف ثبت‌شده"}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <Badge label={exerciseCount > 0 ? "آماده" : "ناقص"} tone={exerciseCount > 0 ? "success" : "warning"} />
          {dirty ? <Badge label="ذخیره نشده" tone="warning" /> : null}
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <MetaChip label={`${toPersianDigits(days.length)} روز`} />
          <MetaChip label={`${toPersianDigits(exerciseCount)} حرکت`} />
        </View>
        <JalaliDateField label="تاریخ شروع" required value={startDate} onChange={setStartDate} />
        <Input label="عنوان برنامه" value={meta.name} onChangeText={(name) => { setMeta({ ...meta, name }); touch(); }} />
        <Input
          label="توضیح"
          value={meta.description}
          onChangeText={(description) => { setMeta({ ...meta, description }); touch(); }}
          multiline
        />
        <View style={{ gap: 6 }}>
          <AppText variant="caption" weight="semibold" tone="secondary">
            هدف تمرینی
          </AppText>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {TRAINING_GOALS.map((goal) => (
              <Button
                key={goal}
                label={goalLabel(goal)}
                size="sm"
                variant={meta.goal === goal ? "primary" : "secondary"}
                onPress={() => { setMeta({ ...meta, goal }); touch(); }}
              />
            ))}
            <Button
              label="هدف دلخواه"
              size="sm"
              variant={meta.goal === CUSTOM_GOAL ? "primary" : "secondary"}
              onPress={() => { setMeta({ ...meta, goal: CUSTOM_GOAL }); touch(); }}
            />
          </View>
          {meta.goal === CUSTOM_GOAL ? (
            <Input
              label="متن هدف"
              value={meta.customGoal}
              onChangeText={(customGoal) => { setMeta({ ...meta, customGoal }); touch(); }}
            />
          ) : null}
        </View>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="روزهای تمرینی" hint={`${toPersianDigits(days.length)} روز`} />
        {days.length === 0 ? (
          <EmptyState
            title="این برنامه روزی ندارد"
            description="یک روز اضافه کنید و حرکات آن را انتخاب کنید."
            action={
              <Button
                label="افزودن روز"
                icon={Plus}
                onPress={() => {
                  setDays((current) => [...current, createDay(current)]);
                  touch();
                }}
              />
            }
          />
        ) : (
          days.map((day, index) => (
            <PlanDayCard
              key={day.key}
              day={day}
              index={index}
              canMoveUp={index > 0}
              canMoveDown={index < days.length - 1}
              onPatch={(patch) => {
                setDays((current) => current.map((entry) => (entry.key === day.key ? { ...entry, ...patch } : entry)));
                touch();
              }}
              onRemove={() => {
                setDays((current) => current.filter((entry) => entry.key !== day.key));
                touch();
              }}
              onDuplicate={() => {
                setDays((current) => [...current, duplicateDay(day)]);
                touch();
              }}
              onMove={(direction) => {
                setDays((current) => {
                  const at = current.findIndex((entry) => entry.key === day.key);
                  const target = at + direction;
                  if (at === -1 || target < 0 || target >= current.length) return current;
                  const next = [...current];
                  const moved = next[at] as PlanDayDraft;
                  next[at] = next[target] as PlanDayDraft;
                  next[target] = moved;
                  return next;
                });
                touch();
              }}
              exerciseImages={catalogue.data?.images ?? {}}
              exerciseNames={catalogue.data?.names ?? {}}
              onAddExercise={() => setPickerDay(day.key)}
              onPatchExercise={(exerciseKey, patch) => {
                setDays((current) =>
                  current.map((entry) =>
                    entry.key === day.key
                      ? {
                          ...entry,
                          exercises: entry.exercises.map((row) =>
                            row.key === exerciseKey ? { ...row, ...patch } : row,
                          ),
                        }
                      : entry,
                  ),
                );
                touch();
              }}
              onRemoveExercise={(exerciseKey) => {
                setDays((current) =>
                  current.map((entry) =>
                    entry.key === day.key
                      ? { ...entry, exercises: entry.exercises.filter((row) => row.key !== exerciseKey) }
                      : entry,
                  ),
                );
                touch();
              }}
              onDuplicateExercise={(exerciseKey) => {
                setDays((current) =>
                  current.map((entry) =>
                    entry.key === day.key
                      ? {
                          ...entry,
                          exercises: entry.exercises.flatMap((row) =>
                            row.key === exerciseKey ? [row, duplicateExercise(row)] : [row],
                          ),
                        }
                      : entry,
                  ),
                );
                touch();
              }}
            />
          ))
        )}
        <Button
          label="افزودن روز"
          variant="secondary"
          icon={Plus}
          onPress={() => {
            setDays((current) => [...current, createDay(current)]);
            touch();
          }}
        />
      </View>

      {saveError ? (
        <Card style={{ backgroundColor: theme.colors.errorSubtle, borderColor: theme.colors.errorBorder }}>
          <AppText variant="caption" style={{ color: theme.colors.error }}>
            {saveError}
          </AppText>
        </Card>
      ) : null}

      <ExercisePickerSheet
        visible={Boolean(pickerDay)}
        onClose={() => setPickerDay(null)}
        onSelect={(item: ExerciseLibraryItem) => {
          if (!pickerDay) return;
          setDays((current) =>
            current.map((entry) =>
              entry.key === pickerDay
                ? { ...entry, exercises: [...entry.exercises, createExerciseDraft(item)] }
                : entry,
            ),
          );
          touch();
        }}
      />

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
          setDirty(false);
          router.back();
        }}
      />
    </AppScreen>
  );
}
