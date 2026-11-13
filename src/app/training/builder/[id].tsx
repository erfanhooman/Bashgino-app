import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Plus, Save, Users } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Dialog, Sheet, useSnackbar } from "@/components/ui/overlay";
import { Badge, Card, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { ExercisePickerSheet, PlanDayCard } from "@/features/training/PlanDayCard";
import { useClients, usePlanTemplate } from "@/hooks/queries";
import { useExerciseCatalogueSlice } from "@/hooks/useExerciseArtwork";
import { useRequireRole } from "@/hooks/useRequireRole";
import * as api from "@/services/api/endpoints";
import { qk } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import {
  CUSTOM_GOAL,
  TRAINING_GOALS,
  assignmentDiff,
  buildTemplatePayload,
  createDay,
  createExerciseDraft,
  duplicateDay,
  duplicateExercise,
  emptyTemplateMeta,
  goalLabel,
  hasMetaErrors,
  hydrateTemplateDays,
  hydrateTemplateMeta,
  toPersianDigits,
  validateTemplateMeta,
  validateWorkoutDays,
  type PlanDayDraft,
  type PlanTemplateMetaDraft,
} from "@bashgino/domain";
import type { ExerciseLibraryItem } from "@bashgino/domain";

/**
 * Reusable training template editor.
 *
 * Same document contract as the web builder: meta + `days[]`, each day carrying
 * its exercises with the full prescription (sets, reps, timed work, weight, RPE,
 * tempo, rest, coach notes). Saving then reconciles the trainee assignments.
 */
export default function TrainingBuilderScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { id, new: isNewParam } = useLocalSearchParams<{ id: string; new?: string }>();
  const templateId = typeof id === "string" ? id : undefined;
  const isNewPlan = isNewParam === "1";
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const query = usePlanTemplate(orgId, templateId);
  const clients = useClients(orgId);

  const [meta, setMeta] = useState<PlanTemplateMetaDraft>(emptyTemplateMeta());
  const [days, setDays] = useState<PlanDayDraft[]>([]);
  const [metaOpen, setMetaOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  // One catalogue request for every exercise in the draft, so each row shows the
  // dataset illustration the web builder shows.
  const draftExerciseIds = days.flatMap((day) => day.exercises.map((row) => row.exerciseId));
  const catalogue = useExerciseCatalogueSlice(draftExerciseIds);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [serverAssignees, setServerAssignees] = useState<string[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  const readOnly = query.data ? query.data.can_manage === false : false;

  useEffect(() => {
    if (!query.data) return;
    if (hydratedFor.current === query.data.id) return;
    hydratedFor.current = query.data.id;
    setMeta(hydrateTemplateMeta(query.data));
    setDays(hydrateTemplateDays(query.data));
    const ids = (query.data.assignments ?? []).map(
      (row: { client_profile: string; is_active?: boolean }) => row.client_profile,
    );
    setAssignees(ids);
    setServerAssignees(ids);
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

  const patchDay = (dayKey: string, patch: Partial<PlanDayDraft>) => {
    setDays((current) => current.map((day) => (day.key === dayKey ? { ...day, ...patch } : day)));
    touch();
  };

  const addDay = () => {
    setDays((current) => [...current, createDay(current)]);
    touch();
  };

  const addExercise = (dayKey: string, item: ExerciseLibraryItem) => {
    setDays((current) =>
      current.map((day) =>
        day.key === dayKey ? { ...day, exercises: [...day.exercises, createExerciseDraft(item)] } : day,
      ),
    );
    touch();
  };

  const patchExercise = (dayKey: string, exerciseKey: string, patch: Partial<PlanDayDraft["exercises"][number]>) => {
    setDays((current) =>
      current.map((day) =>
        day.key === dayKey
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.key === exerciseKey ? { ...exercise, ...patch } : exercise,
              ),
            }
          : day,
      ),
    );
    touch();
  };

  const save = useMutation({
    mutationFn: async () => {
      const metaCheck = validateTemplateMeta(meta);
      if (!metaCheck.valid) throw new Error(metaCheck.name ?? "اطلاعات برنامه معتبر نیست.");
      const dayCheck = validateWorkoutDays(days);
      if (!dayCheck.valid) throw new Error("برای ذخیره، پارامترهای نامعتبر روزهای تمرینی را اصلاح کنید.");

      const saved = await api.updatePlanTemplate(orgId as string, templateId as string, {
        ...buildTemplatePayload(meta, days),
      });

      // Assignment runs only after the content is saved, and only when the plan
      // actually has a day with an exercise — otherwise the server would refuse.
      const canAssign = days.some((day) => day.exercises.length > 0);
      if (canAssign) {
        await api.setPlanTemplateAssignments(orgId as string, templateId as string, {
          client_profile_ids: assignees,
          sync_content: true,
        });
        setServerAssignees(assignees);
      }
      return saved;
    },
    onSuccess: () => {
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["plan-templates", orgId] });
      void queryClient.invalidateQueries({ queryKey: qk.planTemplate(orgId, templateId ?? "") });
      if (isNewPlan) {
        router.replace(`/training?saved=${encodeURIComponent(meta.name.trim())}` as never);
        return;
      }
      show("برنامه تمرینی ذخیره شد.", "success");
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
        <ErrorState message="دریافت برنامه تمرینی ناموفق بود." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="ghost" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  const exerciseCount = days.reduce((total, day) => total + day.exercises.length, 0);
  const diff = assignmentDiff(serverAssignees, assignees);

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
        onPress={() => (dirty ? setLeaveOpen(true) : router.back())}
        style={{ alignSelf: "flex-start" }}
      />

      <View style={{ gap: 4 }}>
        <AppText variant="display" weight="extrabold" numberOfLines={2}>
          {meta.name || "برنامه بدون عنوان"}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {meta.goal ? goalLabel(meta.goal, meta.customGoal) : "بدون هدف ثبت‌شده"}
          {meta.description ? ` · ${meta.description}` : ""}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {exerciseCount > 0 ? <Badge label="آماده تخصیص" tone="success" /> : <Badge label="ناقص" tone="warning" />}
          {dirty ? <Badge label="ذخیره نشده" tone="warning" /> : null}
          {readOnly ? <Badge label="فقط مشاهده" tone="neutral" /> : null}
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <MetaChip label={`${toPersianDigits(days.length)} روز`} />
          <MetaChip label={`${toPersianDigits(exerciseCount)} حرکت`} />
          <MetaChip label={`${toPersianDigits(serverAssignees.length)} ورزشکار`} />
        </View>

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
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="روزهای تمرینی" hint={`${toPersianDigits(days.length)} روز`} />
        {days.length === 0 ? (
          <EmptyState
            title="این برنامه هنوز روز تمرینی ندارد"
            description="یک روز اضافه کنید و حرکات آن را انتخاب کنید."
            action={readOnly ? undefined : <Button label="افزودن روز" icon={Plus} onPress={addDay} />}
          />
        ) : (
          days.map((day, index) => (
            <PlanDayCard
              key={day.key}
              day={day}
              index={index}
              readOnly={readOnly}
              canMoveUp={index > 0}
              canMoveDown={index < days.length - 1}
              onPatch={(patch) => patchDay(day.key, patch)}
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
              onPatchExercise={(exerciseKey, patch) => patchExercise(day.key, exerciseKey, patch)}
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

        {readOnly ? null : (
          <Button label="افزودن روز" variant="secondary" icon={Plus} onPress={addDay} />
        )}
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
        onSelect={(item) => {
          if (pickerDay) addExercise(pickerDay, item);
        }}
      />

      <Sheet
        visible={metaOpen}
        onClose={() => setMetaOpen(false)}
        title="اطلاعات برنامه"
        footer={
          <Button
            label="ذخیره اطلاعات"
            fullWidth
            onPress={() => {
              const check = validateTemplateMeta(meta);
              if (!check.valid) {
                setSaveError(check.name ?? check.goal ?? "اطلاعات برنامه معتبر نیست.");
                return;
              }
              setMetaOpen(false);
              touch();
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
                  onPress={() => setMeta({ ...meta, goal })}
                />
              ))}
              <Button
                label="هدف دلخواه"
                size="sm"
                variant={meta.goal === CUSTOM_GOAL ? "primary" : "secondary"}
                onPress={() => setMeta({ ...meta, goal: CUSTOM_GOAL })}
              />
            </View>
            {meta.goal === CUSTOM_GOAL ? (
              <Input
                label="متن هدف"
                value={meta.customGoal}
                onChangeText={(customGoal) => setMeta({ ...meta, customGoal })}
                placeholder="مثلاً آماده‌سازی برای مسابقه"
              />
            ) : null}
          </View>
        </View>
      </Sheet>

      <Sheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="تخصیص برنامه"
        description={
          exerciseCount > 0
            ? "با ذخیره، برای هر ورزشکار یک نسخه جداگانه ساخته می‌شود که تاریخچه و وضعیت خودش را دارد."
            : "برای تخصیص، ابتدا یک روز با حداقل یک حرکت اضافه کنید."
        }
        footer={
          <Button
            label="ثبت تخصیص"
            fullWidth
            disabled={exerciseCount === 0}
            onPress={() => {
              touch();
              setAssignOpen(false);
              show(
                diff.added.length || diff.removed.length
                  ? "تخصیص با ذخیره برنامه اعمال می‌شود."
                  : "تخصیص تغییری ندارد.",
              );
            }}
          />
        }
      >
        <View style={{ gap: 6 }}>
          {(clients.data ?? []).filter((client) => client.status !== "ARCHIVED").length === 0 ? (
            <AppText variant="caption" tone="muted">
              ورزشکاری در این فضا نیست.
            </AppText>
          ) : (
            (clients.data ?? [])
              .filter((client) => client.status !== "ARCHIVED")
              .map((client) => {
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
                      {client.user?.full_name ?? "بدون نام"}
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
          setDirty(false);
          router.back();
        }}
      />
    </AppScreen>
  );
}
