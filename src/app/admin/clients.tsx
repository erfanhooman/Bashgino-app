import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Check, ClipboardList, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Sheet, useSnackbar } from "@/components/ui/overlay";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/surface";
import { SegmentedTabs } from "@/components/ui/tabs";
import { AppText, ltrIsolate } from "@/components/ui/text";
import { useClients, useOrgCoaches } from "@/hooks/queries";
import * as api from "@/services/api/endpoints";
import { qk, queryClient } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { toPersianDigits } from "@bashgino/domain";
import type { ClientProfile } from "@bashgino/types";
import { useRequireRole } from "@/hooks/useRequireRole";

/**
 * Client assignment.
 *
 * The only question here is "does this athlete have a coach?", so the filter and
 * the row badge answer it before the list is read. Assignment goes through the
 * same revive-or-create endpoint the rest of the app uses, which keeps history.
 */
export default function AdminClientsScreen() {
  useRequireRole(["ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { show } = useSnackbar();
  const clients = useClients(orgId);
  const coaches = useOrgCoaches(orgId);

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<ClientProfile | null>(null);

  const rows = useMemo(() => clients.data ?? [], [clients.data]);
  const unassigned = rows.filter((client) => !client.primary_coach);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((client) => {
      if (tab === "unassigned" && client.primary_coach) return false;
      if (tab === "active" && client.status !== "ACTIVE") return false;
      if (!needle) return true;
      return (
        (client.user?.full_name ?? "").toLowerCase().includes(needle) ||
        (client.user?.phone_number ?? "").includes(needle)
      );
    });
  }, [rows, tab, search]);

  const assign = useMutation({
    mutationFn: ({ clientId, membershipId }: { clientId: string; membershipId: string }) =>
      api.assignCoach(orgId as string, clientId, membershipId, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clients(orgId) });
      setAssigning(null);
      show("مربی مسئول تعیین شد.", "success");
    },
    onError: (error) => show(error instanceof Error ? error.message : "تخصیص انجام نشد.", "error"),
  });

  return (
    <AppScreen
      showHeader={false}
      refreshing={clients.isRefetching}
      onRefresh={() => void clients.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
    >
      <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />

      <View style={{ gap: 4 }}>
        <AppText variant="display" weight="extrabold">
          تخصیص شاگردان
        </AppText>
        <AppText variant="caption" tone="secondary">
          {toPersianDigits(rows.length)} شاگرد · {toPersianDigits(unassigned.length)} بدون مربی
        </AppText>
      </View>

      <Input
        placeholder="جست‌وجوی شاگرد"
        value={search}
        onChangeText={setSearch}
        leading={<Search size={17} color={theme.colors.textMuted} strokeWidth={2} />}
      />

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { key: "all", label: "همه", count: rows.length },
          { key: "unassigned", label: "بدون مربی", count: unassigned.length },
          { key: "active", label: "فعال", count: rows.filter((c) => c.status === "ACTIVE").length },
        ]}
      />

      {clients.isLoading ? (
        <SkeletonCard rows={4} />
      ) : clients.isError ? (
        <ErrorState message="فهرست شاگردان بارگذاری نشد." onRetry={() => void clients.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="شاگردی برای نمایش نیست"
          description="با تغییر فیلتر یا عبارت جست‌وجو دوباره تلاش کنید."
          icon={<ClipboardList size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
        />
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {visible.map((client) => (
            <Card key={client.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar name={client.user?.full_name ?? "؟"} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {client.user?.full_name ?? "بدون نام"}
                  </AppText>
                  <AppText variant="caption" tone="muted" numeric>
                    {ltrIsolate(client.user?.phone_number ?? "—")}
                  </AppText>
                </View>
                {client.primary_coach ? (
                  <Badge label={client.primary_coach.full_name} tone="neutral" />
                ) : (
                  <Badge label="بدون مربی" tone="warning" />
                )}
              </View>
              <Button
                label={client.primary_coach ? "تغییر مربی" : "تخصیص مربی"}
                size="sm"
                variant={client.primary_coach ? "secondary" : "primary"}
                onPress={() => setAssigning(client)}
              />
            </Card>
          ))}
        </View>
      )}

      <Sheet
        visible={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title="انتخاب مربی مسئول"
        description={assigning?.user?.full_name ?? undefined}
      >
        <View style={{ gap: 6 }}>
          {(coaches.data ?? []).map((coach) => {
            const active = assigning?.primary_coach?.coach_membership_id === coach.membership_id;
            return (
              <Card
                key={coach.membership_id}
                padded={false}
                onPress={() => {
                  if (!assigning) return;
                  assign.mutate({ clientId: assigning.id, membershipId: coach.membership_id });
                }}
                style={{
                  padding: theme.spacing.md,
                  borderColor: active ? theme.colors.selected : theme.colors.border,
                  backgroundColor: active ? theme.colors.primarySubtle : theme.colors.surface,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar name={coach.full_name} size={34} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight="medium">
                      {coach.full_name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {toPersianDigits(coach.client_count)} شاگرد
                    </AppText>
                  </View>
                  {active ? <Check size={18} color={theme.colors.brandInk} strokeWidth={2.5} /> : null}
                </View>
              </Card>
            );
          })}
        </View>
      </Sheet>
    </AppScreen>
  );
}
