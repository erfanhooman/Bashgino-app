import { router } from "expo-router";
import { CalendarCheck, CalendarRange, ChevronLeft, ClipboardList, Users } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard, StatTile } from "@/components/ui/layout";
import { Avatar, Badge, Card, EmptyState, SectionHeader } from "@/components/ui/surface";
import { AppText, PageTitle, ltrIsolate } from "@/components/ui/text";
import { useClients, useDashboardSummary } from "@/hooks/queries";
import { useOrgId, useSession } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits } from "@bashgino/domain";

/**
 * The coaching desk.
 *
 * Every number comes from `GET /dashboard-summary/`, which the server scopes to
 * the caller's roster — a coach's counts cover only their own trainees, an
 * admin's cover the gym. Nothing on this screen is estimated client-side.
 */
export function CoachHome() {
  const theme = useTheme();
  const orgId = useOrgId();
  const user = useSession((state) => state.user);
  const summary = useDashboardSummary(orgId);
  const clients = useClients(orgId);

  const firstName = (user?.full_name ?? "").trim().split(" ")[0] || "مربی";
  const week = summary.data?.week;
  const roster = (clients.data ?? []).filter((client) => client.status === "ACTIVE").slice(0, 4);

  const refreshAll = () => {
    void summary.refetch();
    void clients.refetch();
  };

  return (
    <AppScreen
      refreshing={summary.isRefetching || clients.isRefetching}
      onRefresh={refreshAll}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <View style={{ gap: 4 }}>
        <PageTitle>سلام، {firstName}</PageTitle>
        <AppText variant="caption" tone="secondary">
          {week
            ? `این هفته: ${formatJalaliDate(week.from, { format: "medium" })} تا ${formatJalaliDate(week.to, {
                format: "medium",
              })}`
            : "نمای کلی میز مربیگری شما"}
        </AppText>
      </View>

      {summary.isError ? (
        <ErrorState message="خلاصه هفته بارگذاری نشد." onRetry={() => void summary.refetch()} />
      ) : summary.isLoading ? (
        <View style={{ gap: theme.spacing.md }}>
          <SkeletonCard rows={2} />
        </View>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <StatTile
              label="تمرین ثبت‌شده"
              value={toPersianDigits(summary.data?.workouts_logged ?? 0)}
              icon={<CalendarCheck size={16} color={theme.colors.brandInk} strokeWidth={2} />}
              tone="brand"
            />
            <StatTile
              label="برنامه فعال"
              value={toPersianDigits(summary.data?.active_plans ?? 0)}
              icon={<CalendarRange size={16} color={theme.colors.textSecondary} strokeWidth={2} />}
            />
          </View>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <StatTile
              label="ورزشکار فعال"
              value={toPersianDigits(summary.data?.active_clients ?? 0)}
              icon={<Users size={16} color={theme.colors.textSecondary} strokeWidth={2} />}
            />
            <StatTile
              label="در انتظار ثبت‌نام"
              value={toPersianDigits(summary.data?.pending_clients ?? 0)}
              icon={<ClipboardList size={16} color={theme.colors.warning} strokeWidth={2} />}
              tone="warning"
            />
          </View>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Button
          label="ورزشکاران"
          icon={Users}
          onPress={() => router.push("/clients")}
          style={{ flex: 1 }}
        />
        <Button
          label="کتابخانه تمرین"
          variant="outline"
          icon={CalendarRange}
          onPress={() => router.push("/training")}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="ورزشکاران شما"
          hint={
            summary.data ? `مجموع ${toPersianDigits(summary.data.total_clients)} ورزشکار` : undefined
          }
          action={
            <Button
              label="همه"
              size="sm"
              variant="ghost"
              icon={ChevronLeft}
              iconPosition="end"
              onPress={() => router.push("/clients")}
            />
          }
        />

        {clients.isLoading ? (
          <SkeletonCard rows={3} />
        ) : clients.isError ? (
          <ErrorState message="فهرست ورزشکاران بارگذاری نشد." onRetry={() => void clients.refetch()} />
        ) : roster.length === 0 ? (
          <EmptyState
            title="هنوز ورزشکاری اضافه نشده"
            description="با دعوت ورزشکار، برنامه تمرینی و تغذیه او را از همین‌جا مدیریت کنید."
            action={<Button label="رفتن به ورزشکاران" onPress={() => router.push("/clients")} />}
          />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {roster.map((client) => {
              const trainee = client.user;
              return (
                <Card
                  key={client.id}
                  padded={false}
                  onPress={() => router.push(`/clients/${client.id}`)}
                  style={{ padding: theme.spacing.md }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar name={trainee?.full_name ?? "؟"} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="body" weight="semibold" numberOfLines={1}>
                        {trainee?.full_name ?? "بدون نام"}
                      </AppText>
                      <AppText variant="caption" tone="muted" numeric>
                        {ltrIsolate(trainee?.phone_number ?? "—")}
                      </AppText>
                    </View>
                    <Badge
                      label={client.primary_coach ? client.primary_coach.full_name : "بدون مربی"}
                      tone={client.primary_coach ? "neutral" : "warning"}
                    />
                    <ChevronLeft size={16} color={theme.colors.textMuted} strokeWidth={2} />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </AppScreen>
  );
}
