import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  ListOrdered,
  Minus,
  Plus,
  SkipForward,
  Timer,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { randomUUID } from "expo-crypto";

import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, LoadingBlock, ProgressBar } from "@/components/ui/layout";
import { Dialog, Sheet, useSnackbar } from "@/components/ui/overlay";
import { Badge, Card, MetaChip } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { RestRing } from "@/components/workout/RestRing";
import { useExerciseCatalogueSlice } from "@/hooks/useExerciseArtwork";
import { useSessionMachine } from "@/hooks/useSessionMachine";
import { useWorkoutDay } from "@/hooks/queries";
import { completeWorkout } from "@/services/api/endpoints";
import { qk, queryClient } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import {
  formatRest,
  toPersianDigits,
  type FlowExercise,
} from "@bashgino/domain";
import type { TrainingPlanDay as ApiPlanDay } from "@bashgino/types";

// Persian digits throughout: the header clock sits next to «حرکت ۱ از ۱۲», and a
// Latin 00:08 between Persian numerals reads as a different, foreign value.
const formatClock = (seconds: number) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return toPersianDigits(`${minutes}:${remainder}`);
};

/**
 * Guided workout.
 *
 * Three phases, no chrome: work → rest → finish. The stage is artwork first and
 * text second, because a trainee mid-set looks at the picture, not the sentence.
 * Android's back button asks before abandoning a session that already has logged
 * sets.
 */
export default function SessionScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const params = useLocalSearchParams<{ dayId: string; date?: string }>();
  const query = useWorkoutDay(orgId, params.dayId, params.date);

  const ids = useMemo(
    () => (query.data?.day.exercises ?? []).map((exercise) => exercise.exercise),
    [query.data],
  );
  const catalogue = useExerciseCatalogueSlice(ids);

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center" }}>
        <LoadingBlock label="در حال آماده‌سازی جلسه…" />
      </View>
    );
  }

  if (query.isError || !query.data?.day) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing.lg, justifyContent: "center", gap: 12 }}>
        <ErrorState message="جلسه بارگذاری نشد." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <SessionRunner
      orgId={orgId as string}
      day={query.data.day}
      planName={query.data.plan?.name ?? ""}
      date={params.date}
      images={catalogue.data?.images ?? {}}
      names={catalogue.data?.names ?? {}}
    />
  );
}

function SessionRunner({
  orgId,
  day,
  planName,
  date,
  images,
  names,
}: {
  orgId: string;
  day: ApiPlanDay;
  planName: string;
  date?: string;
  images: Record<string, string>;
  names: Record<string, string>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { show } = useSnackbar();

  const exercises = useMemo<FlowExercise[]>(
    () =>
      day.exercises
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((exercise) => ({
          exerciseId: exercise.exercise,
          name: names[exercise.exercise] ?? exercise.exercise_name,
          canonicalName: exercise.exercise_name,
          frames: images[exercise.exercise] ? [images[exercise.exercise] as string] : [],
          targetSets: exercise.target_sets,
          reps: exercise.target_reps,
          durationSeconds: exercise.target_duration_seconds ?? null,
          restSeconds: exercise.rest_interval_seconds ?? 0,
          instructions: exercise.coach_instructions ?? "",
          weightKg: exercise.target_weight_kg ?? null,
        })),
    // The artwork map arrives after the first render; rebuilding the list is
    // safe because `createSession` only reads it on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day.id, images, names],
  );

  const machine = useSessionMachine(exercises);
  const [notes, setNotes] = useState("");
  const [exitOpen, setExitOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      completeWorkout(orgId, {
        client_session_uuid: randomUUID(),
        plan_day_id: day.id,
        started_at: machine.state.startedAt,
        completed_at: new Date().toISOString(),
        client_notes: notes.trim() || undefined,
        sets: machine.log.map((set) => ({
          exercise_id: set.exercise_id,
          set_number: set.set_number,
          actual_reps: set.actual_reps,
          actual_weight_kg: set.actual_weight_kg,
          actual_duration_seconds: set.actual_duration_seconds,
          is_completed: true,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.sessions(orgId) });
      void queryClient.invalidateQueries({ queryKey: qk.today(orgId, date ?? "") });
      void queryClient.invalidateQueries({ queryKey: qk.schedule(orgId) });
      show("جلسه ثبت شد. کارتونی عالی بود!", "success");
      router.replace("/workout" as never);
    },
    onError: (error) => {
      show(error instanceof Error ? error.message : "ثبت جلسه انجام نشد.", "error");
    },
  });

  const { state, currentExercise } = machine;
  const phase = state.phase;
  const progressPct = state.steps.length ? (machine.completedCount / state.steps.length) * 100 : 0;

  const requestExit = () => {
    if (machine.completedCount > 0) setExitOpen(true);
    else router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* App bar: exit, position, session clock, jump list */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 6,
        }}
      >
        <IconButton icon={X} label="بستن جلسه" onPress={requestExit} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <AppText variant="caption" weight="semibold">
            {phase === "rest"
              ? "استراحت"
              : phase === "finish"
                ? "پایان جلسه"
                : `حرکت ${toPersianDigits(Math.min(state.stepIndex + 1, state.steps.length))} از ${toPersianDigits(
                    state.steps.length,
                  )}`}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Clock size={11} color={theme.colors.textMuted} strokeWidth={2} />
            <AppText variant="overline" tone="muted" numeric>
              {formatClock(machine.elapsedSeconds)}
            </AppText>
          </View>
        </View>
        <IconButton icon={ListOrdered} label="فهرست حرکات" onPress={() => setListOpen(true)} />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <ProgressBar value={progressPct} />
      </View>

      {phase === "finish" ? (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing["3xl"],
            gap: theme.spacing.lg,
          }}
        >
          <Card style={{ gap: 10, alignItems: "center", paddingVertical: theme.spacing["2xl"] }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.successSubtle,
              }}
            >
              <Check size={28} color={theme.colors.success} strokeWidth={2.5} />
            </View>
            <AppText variant="title">جلسه تمام شد</AppText>
            <AppText variant="caption" tone="secondary" center>
              {toPersianDigits(machine.completedCount)} از {toPersianDigits(state.steps.length)} ست ثبت شد ·
              زمان {formatClock(machine.elapsedSeconds)}
            </AppText>
          </Card>

          {machine.completedCount === 0 ? (
            <Card style={{ gap: 4 }}>
              <AppText variant="caption" tone="warning">
                هیچ ستی ثبت نشده است؛ با ثبت، جلسه خالی در تاریخچه ساخته نمی‌شود.
              </AppText>
            </Card>
          ) : null}

          <Input
            label="یادداشت جلسه (اختیاری)"
            placeholder="مثلاً: وزنه‌ها سبک بود، ست آخر سنگین‌تر"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <Button
            label="ثبت و پایان"
            size="lg"
            loading={save.isPending}
            disabled={machine.completedCount === 0}
            onPress={() => save.mutate()}
          />
          <Button label="بازگشت بدون ثبت" variant="secondary" onPress={requestExit} />
        </ScrollView>
      ) : phase === "rest" ? (
        <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg, alignItems: "center", justifyContent: "center" }}>
          <RestRing remaining={state.restRemaining} total={state.restTotal} />
          {machine.nextExercise ? (
            <Card style={{ width: "100%", gap: 6 }}>
              <AppText variant="overline" tone="muted">
                حرکت بعدی
              </AppText>
              <AppText variant="subtitle" numberOfLines={2}>
                {machine.nextExercise.name}
              </AppText>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <MetaChip label={`${toPersianDigits(machine.nextExercise.targetSets)} ست`} />
                <MetaChip
                  label={
                    machine.nextExercise.durationSeconds
                      ? `${toPersianDigits(machine.nextExercise.durationSeconds)} ثانیه`
                      : `${toPersianDigits(machine.nextExercise.reps)} تکرار`
                  }
                />
              </View>
            </Card>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
            <Button
              label="۲۰+ ثانیه"
              variant="secondary"
              onPress={() => machine.addRest(20)}
              style={{ flex: 1 }}
              icon={Plus}
            />
            <Button
              label="رد کردن استراحت"
              onPress={machine.skipRest}
              style={{ flex: 1.4 }}
              icon={SkipForward}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing["3xl"],
            gap: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {currentExercise ? (
            <>
              <ExerciseStage
                name={currentExercise.name}
                image={currentExercise.frames[0]}
                timerLabel={
                  currentExercise.durationSeconds ? formatClock(state.workRemaining) : null
                }
                timerRunning={state.running}
              />

              <View style={{ gap: 6 }}>
                <AppText variant="title" weight="extrabold" numberOfLines={2}>
                  {currentExercise.name}
                </AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <MetaChip label={`ست ${toPersianDigits(machine.currentStep?.setNumber ?? 1)} از ${toPersianDigits(currentExercise.targetSets)}`} />
                  {currentExercise.durationSeconds ? (
                    <MetaChip label={`${toPersianDigits(currentExercise.durationSeconds)} ثانیه`} />
                  ) : (
                    <MetaChip label={`${toPersianDigits(currentExercise.reps)} تکرار`} />
                  )}
                  {currentExercise.weightKg ? (
                    <MetaChip label={`${toPersianDigits(currentExercise.weightKg)} کیلوگرم`} />
                  ) : null}
                  {currentExercise.restSeconds ? (
                    <MetaChip label={`استراحت ${formatRest(currentExercise.restSeconds)}`} />
                  ) : null}
                </View>
                {currentExercise.instructions ? (
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                    {currentExercise.instructions}
                  </AppText>
                ) : null}
              </View>

              {currentExercise.durationSeconds ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    label={state.running ? "توقف" : "شروع زمان‌سنج"}
                    variant="secondary"
                    onPress={machine.toggleTimer}
                    style={{ flex: 1 }}
                    icon={Timer}
                  />
                  <Button label="از نو" variant="ghost" onPress={machine.resetTimer} style={{ flex: 1 }} />
                </View>
              ) : (
                <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <AppText variant="body" weight="medium">
                    تکرار انجام‌شده
                  </AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <IconButton icon={Minus} label="کاهش تکرار" onPress={() => machine.adjustReps(-1)} />
                    <AppText variant="title" numeric style={{ minWidth: 34, textAlign: "center" }}>
                      {toPersianDigits(machine.currentReps)}
                    </AppText>
                    <IconButton icon={Plus} label="افزایش تکرار" onPress={() => machine.adjustReps(1)} />
                  </View>
                </Card>
              )}

              <Button
                label="انجام دادم"
                size="lg"
                icon={Check}
                onPress={machine.confirm}
                fullWidth
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  label="حرکت قبل"
                  variant="ghost"
                  onPress={machine.previous}
                  disabled={state.stepIndex === 0}
                  style={{ flex: 1 }}
                />
                <Button
                  label="رد کردن این ست"
                  variant="secondary"
                  onPress={machine.skipSet}
                  style={{ flex: 1.2 }}
                />
              </View>
            </>
          ) : (
            <ErrorState title="حرکتی برای نمایش نیست" message="این روز تمرینی خالی است." />
          )}
        </ScrollView>
      )}

      {/* Jump list — one row per exercise, with its set count. */}
      <Sheet visible={listOpen} onClose={() => setListOpen(false)} title="حرکات این جلسه">
        <View style={{ gap: 6 }}>
          {exercises.map((exercise, index) => {
            const done = state.steps
              .filter((step) => step.exerciseIndex === index)
              .every((step) => state.completed[`${step.exerciseIndex}:${step.setNumber}`]);
            return (
              <Card
                key={`${exercise.exerciseId}-${index}`}
                padded={false}
                onPress={() => {
                  setListOpen(false);
                  machine.jumpToExercise(index);
                }}
                style={{ padding: theme.spacing.md }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Dumbbell size={16} color={done ? theme.colors.success : theme.colors.textMuted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight="medium" numberOfLines={1}>
                      {exercise.name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {toPersianDigits(exercise.targetSets)} ست ·{" "}
                      {exercise.durationSeconds
                        ? `${toPersianDigits(exercise.durationSeconds)} ثانیه`
                        : `${toPersianDigits(exercise.reps)} تکرار`}
                    </AppText>
                  </View>
                  {done ? <Badge label="تمام" tone="success" /> : null}
                  <ChevronRight size={16} color={theme.colors.textMuted} strokeWidth={2} />
                </View>
              </Card>
            );
          })}
        </View>
      </Sheet>

      <Dialog
        visible={exitOpen}
        title="جلسه نیمه‌کاره است"
        message="ست‌های ثبت‌شده تا این لحظه هنوز ذخیره نشده‌اند. می‌توانید جلسه را ثبت و تمام کنید یا بدون ذخیره خارج شوید."
        confirmLabel="ثبت و پایان"
        cancelLabel="ادامه تمرین"
        onCancel={() => setExitOpen(false)}
        onConfirm={() => {
          setExitOpen(false);
          machine.finish();
        }}
      />

      {planName ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 2 }}>
          <AppText variant="overline" tone="muted" center>
            {planName}
            {date ? ` · ${toPersianDigits(date)}` : ""}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The stage.
 *
 * Square artwork with the dataset's own light backdrop; when the catalogue has
 * no image for a movement the panel says so instead of showing a broken box —
 * the workout continues either way.
 */
function ExerciseStage({
  name,
  image,
  timerLabel,
  timerRunning,
}: {
  name: string;
  image?: string;
  timerLabel: string | null;
  timerRunning: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 1,
        maxHeight: 380,
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          transition={160}
          cachePolicy="memory-disk"
          onError={(event) => {
            if (__DEV__) console.warn("[stage] image failed", image, event?.error);
          }}
        />
      ) : (
        <View style={{ alignItems: "center", gap: 8, padding: theme.spacing.lg }}>
          <Dumbbell size={44} color={theme.colors.borderStrong} strokeWidth={1.6} />
          <AppText variant="caption" tone="muted" center>
            تصویری برای این حرکت ثبت نشده است
          </AppText>
        </View>
      )}

      {timerLabel ? (
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: theme.radius.full,
            backgroundColor: timerRunning ? theme.colors.primary : theme.colors.inverseSurface,
          }}
        >
          <Timer size={13} color={theme.colors.onPrimary} strokeWidth={2.2} />
          <AppText variant="caption" weight="bold" numeric style={{ color: theme.colors.onPrimary }}>
            {timerLabel}
          </AppText>
        </View>
      ) : null}

      <View
        style={{
          position: "absolute",
          bottom: 10,
          right: 12,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: theme.radius.full,
          backgroundColor: "rgba(11,15,20,0.55)",
        }}
      >
        <AppText variant="overline" style={{ color: "#F9FAFB" }} numberOfLines={1}>
          {name}
        </AppText>
      </View>
    </View>
  );
}
