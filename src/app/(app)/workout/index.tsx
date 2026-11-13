import { router } from "expo-router";
import { CalendarClock, ChevronLeft, Dumbbell, History } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Badge, Card, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useTodayWorkout, useWorkoutSchedule } from "@/hooks/queries";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits, weekdayNameFa } from "@bashgino/domain";

const isoToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

/**
 * Workout hub.
 *
 * Today's session, then the next five occurrences from the server's schedule —
 * the client never re-derives the calendar, so a weekly plan and an exact-date
 * plan read the same way here.
 */
export default function WorkoutHubScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const today = useTodayWorkout(orgId, isoToday());
  const schedule = useWorkoutSchedule(orgId);

  const upcoming = (schedule.data?.occurrences ?? [])
    .filter((occurrence) => !occurrence.is_today && occurrence.status === "SCHEDULED")
    .slice(0, 5);

  const day = today.data?.day ?? null;

  return (
    <AppScreen
      title="تمرین‌ها"
      subtitle="جلسات امروز و روزهای پیش‌رو"
      refreshing={today.isRefetching || schedule.isRefetching}
      onRefresh={() => {
        void today.refetch();
        void schedule.refetch();
      }}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {today.isLoading ? (
        <SkeletonCard rows={3} />
      ) : today.isError ? (
        <ErrorState message="برنامه امروز بارگذاری نشد." onRetry={() => void today.refetch()} />
      ) : day ? (
        <Card variant="inverse" style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Badge label="امروز" tone="inverse" />
            <AppText variant="overline" style={{ color: theme.colors.inverseMuted }}>
              {weekdayNameFa(today.data?.weekday ?? 0)}
            </AppText>
          </View>
          <AppText variant="title" weight="extrabold" style={{ color: theme.colors.inverseText }}>
            {day.name}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <MetaChip label={`${toPersianDigits(day.exercises.length)} حرکت`} />
            <MetaChip
              label={`${toPersianDigits(
                day.exercises.reduce((total, exercise) => total + (exercise.target_sets || 0), 0),
              )} ست`}
            />
            {today.data?.plan?.name ? <MetaChip label={today.data.plan.name} /> : null}
          </View>
          <Button
            label="مشاهده و شروع"
            size="lg"
            onPress={() => router.push(`/workout/${day.id}` as never)}
          />
        </Card>
      ) : (
        <EmptyState
          title="امروز جلسه‌ای برنامه‌ریزی نشده"
          description={
            today.data?.next_date
              ? `جلسه بعدی شما ${formatJalaliDate(today.data.next_date, { format: "medium" })} است.`
              : "برنامه فعالی برای امروز وجود ندارد."
          }
          icon={<Dumbbell size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
        />
      )}

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="جلسات پیش‌رو"
          action={
            <Button
              label="تاریخچه"
              size="sm"
              variant="ghost"
              icon={History}
              iconPosition="start"
              onPress={() => router.push("/workout/history" as never)}
            />
          }
        />

        {schedule.isLoading ? (
          <SkeletonCard rows={4} />
        ) : schedule.isError ? (
          <ErrorState message="تقویم تمرین بارگذاری نشد." onRetry={() => void schedule.refetch()} />
        ) : upcoming.length === 0 ? (
          <Card style={{ gap: 4 }}>
            <AppText variant="caption" tone="secondary">
              جلسه بعدی در بازه دو هفته آینده برنامه‌ریزی نشده است.
            </AppText>
          </Card>
        ) : (
          upcoming.map((occurrence) => (
            <Card
              key={`${occurrence.date}-${occurrence.day.id}`}
              padded={false}
              onPress={() => router.push(`/workout/${occurrence.day.id}?date=${occurrence.date}` as never)}
              style={{ padding: theme.spacing.md }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.surfaceSubtle,
                  }}
                >
                  <CalendarClock size={18} color={theme.colors.textSecondary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {occurrence.day.name}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {formatJalaliDate(occurrence.date, { format: "full" })}
                  </AppText>
                </View>
                <AppText variant="overline" tone="muted" numeric>
                  {toPersianDigits(occurrence.day.exercise_count)} حرکت
                </AppText>
                <ChevronLeft size={16} color={theme.colors.textMuted} strokeWidth={2} />
              </View>
            </Card>
          ))
        )}
      </View>
    </AppScreen>
  );
}

