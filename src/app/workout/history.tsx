import { router } from "expo-router";
import { Activity, Clock, Dumbbell, Flame } from "lucide-react-native";
import { useMemo } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard, StatTile } from "@/components/ui/layout";
import { Badge, Card } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useWorkoutSessions } from "@/hooks/queries";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits } from "@bashgino/domain";

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  const minutes = Math.round(seconds / 60);
  return `${toPersianDigits(minutes)} دقیقه`;
};

/**
 * Practice history.
 *
 * Answers "how much have I actually trained?" with real totals from the session
 * list — volume renders as «—» when zero rather than «۰ کیلو», because a zero
 * that looks like a measurement reads as a bug.
 */
export default function WorkoutHistoryScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const query = useWorkoutSessions(orgId, 100);

  const sessions = useMemo(() => query.data ?? [], [query.data]);
  const stats = useMemo(() => {
    const completed = sessions.filter((session) => session.status === "COMPLETED");
    const partial = sessions.length - completed.length;
    const duration = sessions.reduce((total, session) => total + (session.duration_seconds ?? 0), 0);
    const volume = sessions.reduce((total, session) => total + (session.total_volume_kg ?? 0), 0);
    const sets = sessions.reduce((total, session) => total + session.completed_set_count, 0);
    return { completed: completed.length, partial, duration, volume, sets };
  }, [sessions]);

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />

      <View style={{ gap: 4 }}>
        <AppText variant="display" weight="extrabold">
          تاریخچه تمرین
        </AppText>
        <AppText variant="caption" tone="secondary">
          {toPersianDigits(sessions.length)} جلسه ثبت‌شده
          {stats.partial > 0 ? ` · ${toPersianDigits(stats.partial)} جلسه نیمه‌کاره` : ""}
        </AppText>
      </View>

      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <StatTile
          label="جلسه کامل"
          value={toPersianDigits(stats.completed)}
          icon={<Activity size={16} color={theme.colors.brandInk} strokeWidth={2} />}
          tone="brand"
        />
        <StatTile
          label="ست ثبت‌شده"
          value={toPersianDigits(stats.sets)}
          icon={<Dumbbell size={16} color={theme.colors.textSecondary} strokeWidth={2} />}
        />
      </View>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <StatTile
          label="زمان تمرین"
          value={formatDuration(stats.duration)}
          icon={<Clock size={16} color={theme.colors.textSecondary} strokeWidth={2} />}
        />
        <StatTile
          label="حجم کل"
          value={stats.volume > 0 ? `${toPersianDigits(Math.round(stats.volume))} کیلو` : "—"}
          icon={<Flame size={16} color={theme.colors.warning} strokeWidth={2} />}
          tone="warning"
        />
      </View>

      {query.isLoading ? (
        <SkeletonCard rows={5} />
      ) : query.isError ? (
        <ErrorState message="تاریخچه بارگذاری نشد." onRetry={() => void query.refetch()} />
      ) : sessions.length === 0 ? (
        <Card>
          <AppText variant="caption" tone="secondary">
            هنوز جلسه‌ای ثبت نکرده‌اید.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {sessions.map((session) => (
            <Card key={session.id} padded={false} style={{ padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: theme.radius.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.primarySubtle,
                  }}
                >
                  <Activity size={17} color={theme.colors.brandInk} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {session.plan_day_name ?? "جلسه تمرین"}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {formatJalaliDate(session.started_at, { format: "medium", showTime: true })}
                  </AppText>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  {session.status !== "COMPLETED" ? <Badge label="نیمه‌کاره" tone="warning" /> : null}
                  <AppText variant="overline" tone="muted" numeric>
                    {toPersianDigits(session.completed_set_count)} ست · {formatDuration(session.duration_seconds)}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </AppScreen>
  );
}
