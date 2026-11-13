import { router } from "expo-router";
import { Building2, ChevronLeft, ClipboardList, UserCog, Users } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard, StatTile } from "@/components/ui/layout";
import { Card } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useClients, useOrgCoaches, useTrainingPlans } from "@/hooks/queries";
import { useOrgId, useSession } from "@/store/session";
import { useTheme } from "@/theme";
import { toPersianDigits } from "@bashgino/domain";
import { useRequireRole } from "@/hooks/useRequireRole";

/**
 * Gym admin panel.
 *
 * The manager's job is different from the coaching desk, so it gets its own
 * surface: how many people, how many coaches, who is unassigned. Metrics come
 * from three plain list endpoints — no aggregate endpoint is needed for counts
 * this small.
 */
export default function AdminHomeScreen() {
  useRequireRole(["ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const activeOrg = useSession((state) => state.activeOrg);
  const coaches = useOrgCoaches(orgId);
  const clients = useClients(orgId);
  const plans = useTrainingPlans(orgId);

  const unassigned = (clients.data ?? []).filter((client) => !client.primary_coach).length;
  const loading = coaches.isLoading || clients.isLoading || plans.isLoading;
  const failed = coaches.isError || clients.isError || plans.isError;

  return (
    <AppScreen
      title="پنل مدیریت"
      subtitle={activeOrg?.name ?? ""}
      refreshing={coaches.isRefetching || clients.isRefetching}
      onRefresh={() => {
        void coaches.refetch();
        void clients.refetch();
        void plans.refetch();
      }}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <Card variant="inverse" style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Building2 size={18} color={theme.colors.inverseMuted} strokeWidth={2} />
          <AppText variant="overline" style={{ color: theme.colors.inverseMuted }}>
            {activeOrg?.organization_type === "GYM" ? "باشگاه" : "فضای کاری"}
          </AppText>
        </View>
        <AppText variant="title" weight="extrabold" style={{ color: theme.colors.inverseText }}>
          {activeOrg?.name ?? "فضای کاری"}
        </AppText>
        <AppText variant="caption" style={{ color: theme.colors.inverseMuted }}>
          مدیریت کادر مربیان، تخصیص شاگردان و برنامه‌های فضا
        </AppText>
      </Card>

      {loading ? (
        <SkeletonCard rows={2} />
      ) : failed ? (
        <ErrorState message="آمار پنل بارگذاری نشد." onRetry={() => void clients.refetch()} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <StatTile
              label="مربیان"
              value={toPersianDigits((coaches.data ?? []).length)}
              icon={<UserCog size={16} color={theme.colors.brandInk} strokeWidth={2} />}
              tone="brand"
            />
            <StatTile
              label="شاگردان"
              value={toPersianDigits((clients.data ?? []).length)}
              icon={<Users size={16} color={theme.colors.textSecondary} strokeWidth={2} />}
            />
            <StatTile
              label="تخصیص‌نیافته"
              value={toPersianDigits(unassigned)}
              icon={<ClipboardList size={16} color={theme.colors.warning} strokeWidth={2} />}
              tone="warning"
            />
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Card padded={false} onPress={() => router.push("/admin/coaches")} style={{ padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.primarySubtle,
                  }}
                >
                  <UserCog size={18} color={theme.colors.brandInk} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="semibold">
                    کادر مربیان
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {toPersianDigits((coaches.data ?? []).length)} عضو · شاگردان و برنامه‌های هر مربی
                  </AppText>
                </View>
                <ChevronLeft size={18} color={theme.colors.textMuted} strokeWidth={2} />
              </View>
            </Card>

            <Card padded={false} onPress={() => router.push("/admin/clients")} style={{ padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.warningSubtle,
                  }}
                >
                  <ClipboardList size={18} color={theme.colors.warning} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="semibold">
                    تخصیص شاگردان
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {toPersianDigits(unassigned)} شاگرد بدون مربی
                  </AppText>
                </View>
                <ChevronLeft size={18} color={theme.colors.textMuted} strokeWidth={2} />
              </View>
            </Card>

            <Card padded={false} onPress={() => router.push("/training")} style={{ padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.surfaceSubtle,
                  }}
                >
                  <Users size={18} color={theme.colors.textSecondary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="semibold">
                    برنامه‌های تمرینی فضا
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {toPersianDigits((plans.data ?? []).length)} برنامه ثبت‌شده
                  </AppText>
                </View>
                <ChevronLeft size={18} color={theme.colors.textMuted} strokeWidth={2} />
              </View>
            </Card>
          </View>
        </>
      )}

      <Button
        label="ورود به میز مربیگری"
        variant="outline"
        onPress={() => router.replace("/dashboard")}
      />
    </AppScreen>
  );
}
