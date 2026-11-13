import { router } from "expo-router";
import { Activity, CalendarClock, ChevronLeft, Dumbbell, Moon, Play } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Badge, Card, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText, PageTitle } from "@/components/ui/text";
import { useTodayWorkout, useWorkoutSessions } from "@/hooks/queries";
import { useOrgId, useSession } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, relativeDayLabel, toPersianDigits } from "@bashgino/domain";

const isoToday = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Trainee home.
 *
 * "What am I doing today" is the only question this screen exists to answer, so
 * the answer is the first thing on it. The server resolves the day
 * (`/training-plans/today/`) — the client never guesses which cycle day it is.
 */
export function TraineeHome() {
  const theme = useTheme();
  const orgId = useOrgId();
  const user = useSession((state) => state.user);
  const today = useTodayWorkout(orgId, isoToday());
  const sessions = useWorkoutSessions(orgId, 3);

  const firstName = (user?.full_name ?? "").trim().split(" ")[0] || "ورزشکار";
  const data = today.data;
  const day = data?.day ?? null;
  const sets = day?.exercises.reduce((total, exercise) => total + (exercise.target_sets || 0), 0) ?? 0;

  return (
    <AppScreen
      refreshing={today.isRefetching || sessions.isRefetching}
      onRefresh={() => {
        void today.refetch();
        void sessions.refetch();
      }}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <View style={{ gap: 4 }}>
        <PageTitle>سلام، {firstName}</PageTitle>
        <AppText variant="caption" tone="secondary" numeric>
          {formatJalaliDate(new Date(), { format: "full" })}
        </AppText>
      </View>

      {today.isLoading ? (
        <SkeletonCard rows={3} />
      ) : today.isError ? (
        <ErrorState message="برنامه امروز بارگذاری نشد." onRetry={() => void today.refetch()} />
      ) : data?.reason === "SCHEDULED" && day ? (
        <Card variant="inverse" style={{ gap: theme.spacing.md, padding: theme.spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Badge label="تمرین امروز" tone="inverse" />
            {data.plan?.name ? (
              <AppText variant="overline" style={{ color: theme.colors.inverseMuted }} numberOfLines={1}>
                {data.plan.name}
              </AppText>
            ) : null}
          </View>

          <AppText variant="title" weight="extrabold" style={{ color: theme.colors.inverseText }}>
            {day.name}
          </AppText>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <MetaChip label={`${toPersianDigits(day.exercises.length)} حرکت`} />
            <MetaChip label={`${toPersianDigits(sets)} ست`} />
            {data.next_date ? (
              <MetaChip label={`جلسه بعد: ${formatJalaliDate(data.next_date, { format: "medium" })}`} />
            ) : null}
          </View>

          <Button
            label="شروع تمرین"
            icon={Play}
            size="lg"
            onPress={() => router.push(`/workout/${day.id}` as never)}
          />
        </Card>
      ) : data?.reason === "REST_DAY" ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceSubtle,
              }}
            >
              <Moon size={18} color={theme.colors.textSecondary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">امروز روز استراحت</AppText>
              <AppText variant="caption" tone="secondary">
                ریکاوری بخشی از برنامه است؛ فردا با انرژی برگردید.
              </AppText>
            </View>
          </View>

          {data.next_day && data.next_date ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CalendarClock size={16} color={theme.colors.textMuted} strokeWidth={2} />
                <AppText variant="caption" tone="secondary">
                  جلسه بعد: {data.next_day.name} · {formatJalaliDate(data.next_date, { format: "medium" })}
                </AppText>
              </View>
              <Button
                label="مشاهده"
                size="sm"
                variant="ghost"
                onPress={() => router.push(`/workout/${data.next_day?.id}` as never)}
              />
            </View>
          ) : null}
        </Card>
      ) : data?.reason === "NO_PLAN" || data?.reason === "NO_DAYS" ? (
        <EmptyState
          title="هنوز برنامه تمرینی فعالی ندارید"
          description="از مربی خود بخواهید برنامه‌ای برای شما فعال کند؛ به‌محض فعال شدن، همین‌جا نمایش داده می‌شود."
          icon={<Dumbbell size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
        />
      ) : data?.reason === "BEFORE_START" ? (
        <Card style={{ gap: 6 }}>
          <AppText variant="subtitle">برنامه شما هنوز شروع نشده</AppText>
          <AppText variant="caption" tone="secondary">
            شروع برنامه: {data.plan?.start_date ? formatJalaliDate(data.plan.start_date) : "—"}
          </AppText>
        </Card>
      ) : (
        <Card style={{ gap: 6 }}>
          <AppText variant="subtitle">برنامه شما به پایان رسیده</AppText>
          <AppText variant="caption" tone="secondary">
            برای ادامه، از مربی خود برنامه تازه بخواهید.
          </AppText>
        </Card>
      )}

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="آخرین جلسه‌ها"
          action={
            <Button
              label="تاریخچه"
              size="sm"
              variant="ghost"
              icon={ChevronLeft}
              iconPosition="end"
              onPress={() => router.push("/workout/history" as never)}
            />
          }
        />

        {sessions.isLoading ? (
          <SkeletonCard rows={2} />
        ) : sessions.isError ? (
          <ErrorState message="تاریخچه بارگذاری نشد." onRetry={() => void sessions.refetch()} />
        ) : (sessions.data ?? []).length === 0 ? (
          <Card style={{ gap: 6 }}>
            <AppText variant="caption" tone="secondary">
              هنوز جلسه‌ای ثبت نکرده‌اید. اولین تمرین را شروع کنید تا تاریخچه شما ساخته شود.
            </AppText>
          </Card>
        ) : (
          (sessions.data ?? []).map((session) => (
            <Card key={session.id} padded={false} style={{ padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: theme.radius.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.primarySubtle,
                  }}
                >
                  <Activity size={16} color={theme.colors.brandInk} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {session.plan_day_name ?? "جلسه تمرین"}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {relativeDayLabel(session.started_at)} · {toPersianDigits(session.completed_set_count)} ست
                  </AppText>
                </View>
                {session.status !== "COMPLETED" ? <Badge label="نیمه‌کاره" tone="warning" /> : null}
              </View>
            </Card>
          ))
        )}
      </View>
    </AppScreen>
  );
}
