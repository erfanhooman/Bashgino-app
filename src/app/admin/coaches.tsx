import { router } from "expo-router";
import { Search, ShieldCheck, UserCog } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/surface";
import { AppText, ltrIsolate } from "@/components/ui/text";
import { useOrgCoaches } from "@/hooks/queries";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits } from "@bashgino/domain";
import { useRequireRole } from "@/hooks/useRequireRole";

/** Coaching staff roster — cards, because a five-column table is unreadable at 390dp. */
export default function AdminCoachesScreen() {
  useRequireRole(["ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const query = useOrgCoaches(orgId);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = query.data ?? [];
    if (!needle) return list;
    return list.filter(
      (coach) =>
        coach.full_name.toLowerCase().includes(needle) ||
        (coach.phone_number ?? "").includes(needle),
    );
  }, [query.data, search]);

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
    >
      <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />

      <View style={{ gap: 4 }}>
        <AppText variant="display" weight="extrabold">
          کادر مربیان
        </AppText>
        <AppText variant="caption" tone="secondary">
          {toPersianDigits((query.data ?? []).length)} عضو در این فضا
        </AppText>
      </View>

      <Input
        placeholder="جست‌وجوی نام یا شماره"
        value={search}
        onChangeText={setSearch}
        leading={<Search size={17} color={theme.colors.textMuted} strokeWidth={2} />}
      />

      {query.isLoading ? (
        <SkeletonCard rows={4} />
      ) : query.isError ? (
        <ErrorState message="کادر مربیان بارگذاری نشد." onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="مربی‌ای یافت نشد"
          description="با دعوت مربی از نسخه وب، کادر باشگاه را کامل کنید."
          icon={<UserCog size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
        />
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {rows.map((coach) => (
            <Card key={coach.membership_id} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar name={coach.full_name} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" weight="semibold" numberOfLines={1}>
                    {coach.full_name}
                  </AppText>
                  <AppText variant="caption" tone="muted" numeric>
                    {ltrIsolate(coach.phone_number ?? "—")}
                  </AppText>
                </View>
                {coach.role === "ORG_ADMIN" ? (
                  <Badge
                    label="مدیر"
                    tone="primary"
                    icon={<ShieldCheck size={12} color={theme.colors.brandInk} strokeWidth={2} />}
                  />
                ) : (
                  <Badge label="مربی" tone="neutral" />
                )}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Metric label="شاگرد" value={toPersianDigits(coach.client_count)} />
                <Metric label="برنامه فعال" value={toPersianDigits(coach.active_plans)} />
                <Metric label="عضویت" value={formatJalaliDate(coach.joined_at, { format: "medium" })} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2, alignItems: "center" }}>
      <AppText variant="overline" tone="muted">
        {label}
      </AppText>
      <AppText variant="caption" weight="semibold" numeric>
        {value}
      </AppText>
    </View>
  );
}
