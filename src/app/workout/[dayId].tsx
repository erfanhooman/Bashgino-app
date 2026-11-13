import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Circle, Clock, Play, Timer } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Badge, Card, Divider, MetaChip } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useExerciseCatalogueSlice } from "@/hooks/useExerciseArtwork";
import { useWorkoutDay } from "@/hooks/queries";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, formatRest, toPersianDigits } from "@bashgino/domain";

/**
 * Session overview — what the coach prescribed, before it starts.
 *
 * Once a session exists for this day and date the page is read-only: re-entering
 * a completed workout must not silently create a second log.
 */
export default function WorkoutDayScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const params = useLocalSearchParams<{ dayId: string; date?: string }>();
  const dayId = params.dayId;
  const date = params.date;
  const query = useWorkoutDay(orgId, dayId, date);
  const exerciseIds = (query.data?.day.exercises ?? []).map((exercise) => exercise.exercise);
  const catalogue = useExerciseCatalogueSlice(exerciseIds);

  const detail = query.data;
  const day = detail?.day;
  const alreadyLogged = Boolean(detail?.session?.status === "COMPLETED");

  if (query.isLoading) {
    return (
      <AppScreen showHeader={false}>
        <SkeletonCard rows={4} />
      </AppScreen>
    );
  }

  if (query.isError || !day) {
    return (
      <AppScreen showHeader={false}>
        <ErrorState message="این جلسه بارگذاری نشد." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="secondary" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <View style={{ gap: 6 }}>
        <Button
          label="بازگشت"
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
          style={{ alignSelf: "flex-start" }}
        />
        <AppText variant="display" weight="extrabold">
          {day.name}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {detail?.plan.name ?? "برنامه تمرینی"}
          {date ? ` · ${formatJalaliDate(date, { format: "full" })}` : ""}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          <MetaChip label={`${toPersianDigits(day.exercises.length)} حرکت`} />
          <MetaChip
            label={`${toPersianDigits(
              day.exercises.reduce((total, exercise) => total + (exercise.target_sets || 0), 0),
            )} ست`}
          />
          {alreadyLogged ? <Badge label="ثبت‌شده" tone="success" /> : null}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {day.exercises.map((exercise, index) => {
          const timed = Boolean(exercise.target_duration_seconds);
          return (
            <Card key={exercise.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.primarySubtle,
                  }}
                >
                  <AppText variant="overline" weight="bold" numeric style={{ color: theme.colors.brandInk }}>
                    {toPersianDigits(index + 1)}
                  </AppText>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="body" weight="semibold">
                    {catalogue.data?.names[exercise.exercise] ?? exercise.exercise_name}
                  </AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <AppText variant="caption" tone="secondary">
                      {toPersianDigits(exercise.target_sets)} ست •{" "}
                      {timed
                        ? `${toPersianDigits(exercise.target_duration_seconds ?? 0)} ثانیه`
                        : `${toPersianDigits(exercise.target_reps)} تکرار`}
                    </AppText>
                    {exercise.rest_interval_seconds ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Timer size={12} color={theme.colors.textMuted} strokeWidth={2} />
                        <AppText variant="caption" tone="muted">
                          استراحت {formatRest(exercise.rest_interval_seconds)}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  {exercise.coach_instructions ? (
                    <>
                      <Divider style={{ marginVertical: 6 }} />
                      <AppText variant="caption" tone="secondary">
                        {exercise.coach_instructions}
                      </AppText>
                    </>
                  ) : null}
                </View>
                {timed ? (
                  <Clock size={16} color={theme.colors.textMuted} strokeWidth={2} />
                ) : (
                  <View>
                    {alreadyLogged ? (
                      <CheckCircle2 size={16} color={theme.colors.success} strokeWidth={2} />
                    ) : (
                      <Circle size={16} color={theme.colors.borderStrong} strokeWidth={2} />
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <Button
        label={alreadyLogged ? "تمرین ثبت شده است" : "شروع جلسه"}
        icon={alreadyLogged ? undefined : Play}
        size="lg"
        disabled={alreadyLogged || day.exercises.length === 0}
        onPress={() =>
          router.push(`/session/${day.id}${date ? `?date=${date}` : ""}` as never)
        }
      />
    </AppScreen>
  );
}
