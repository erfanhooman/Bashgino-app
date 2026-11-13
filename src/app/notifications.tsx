import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Card, EmptyState } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useNotifications } from "@/hooks/queries";
import * as api from "@/services/api/endpoints";
import { qk, queryClient } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { relativeDayLabel } from "@bashgino/domain";

/** Notification inbox. Rows mark themselves read; the header can clear the lot. */
export default function NotificationsScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const query = useNotifications(orgId);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.notifications(orgId) });
    void queryClient.invalidateQueries({ queryKey: qk.unread(orgId) });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(orgId, id),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(orgId),
    onSuccess: invalidate,
  });

  const unread = (query.data ?? []).filter((item) => !item.is_read).length;

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
    >
      <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View>
          <AppText variant="display" weight="extrabold">
            اعلان‌ها
          </AppText>
          <AppText variant="caption" tone="muted">
            {unread > 0 ? `${unread} اعلان خوانده‌نشده` : "همه خوانده شده‌اند"}
          </AppText>
        </View>
        {unread > 0 ? (
          <Button
            label="خواندن همه"
            size="sm"
            variant="secondary"
            icon={CheckCheck}
            loading={markAll.isPending}
            onPress={() => markAll.mutate()}
          />
        ) : null}
      </View>

      {query.isLoading ? (
        <SkeletonCard rows={4} />
      ) : query.isError ? (
        <ErrorState message="اعلان‌ها بارگذاری نشد." onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          title="اعلانی ندارید"
          description="خبرهای برنامه‌ها و دعوت‌ها اینجا نمایش داده می‌شود."
          icon={<Bell size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
        />
      ) : (
        (query.data ?? []).map((item) => (
          <Card
            key={item.id}
            padded={false}
            onPress={() => {
              if (!item.is_read) markRead.mutate(item.id);
              if (item.target_route) router.push(item.target_route as never);
            }}
            style={{
              padding: theme.spacing.md,
              gap: 4,
              borderColor: item.is_read ? theme.colors.border : theme.colors.selected,
              backgroundColor: item.is_read ? theme.colors.surface : theme.colors.primarySubtle,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <AppText variant="body" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                {item.title}
              </AppText>
              <AppText variant="overline" tone="muted">
                {relativeDayLabel(item.created_at)}
              </AppText>
            </View>
            <AppText variant="caption" tone="secondary">
              {item.message}
            </AppText>
          </Card>
        ))
      )}
    </AppScreen>
  );
}
