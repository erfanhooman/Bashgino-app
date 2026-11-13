import { router } from "expo-router";
import { Bell, Building2, ChevronDown, LogOut, Settings, UserCog } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUnreadCount } from "@/hooks/queries";
import { useOrgId, useSession } from "@/store/session";
import { useTheme } from "@/theme";

import { Brand } from "./Brand";
import { ActionMenu, Dialog } from "./ui/overlay";
import { Avatar } from "./ui/surface";
import { AppText } from "./ui/text";

/**
 * Utility bar.
 *
 * Mirrors the web's 56px top bar: brand, the active workspace, notifications and
 * the account menu — nothing that navigates *within* a space (that is the tab
 * bar's job). The workspace chip is the switch: on a phone there is no room for
 * a session in the middle of a header, and a manager moving between a gym and
 * their own desk needs one tap.
 */
export function AppHeader({ title }: { title?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSession((state) => state.user);
  const activeOrg = useSession((state) => state.activeOrg);
  const workspaces = useSession((state) => state.workspaces);
  const setActiveOrg = useSession((state) => state.setActiveOrg);
  const logout = useSession((state) => state.logout);
  const orgId = useOrgId();
  const unread = useUnreadCount(orgId);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const unreadCount = unread.data?.unread_count ?? 0;
  const roleLabel =
    activeOrg?.role === "ORG_ADMIN"
      ? "مدیر باشگاه"
      : activeOrg?.role === "CLIENT"
        ? "ورزشکار"
        : activeOrg?.organization_type === "SOLO_STUDIO"
          ? "مربی مستقل"
          : "مربی باشگاه";

  return (
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 8,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="فضای کاری"
          onPress={() => setWorkspaceOpen(true)}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Brand size={34} showWordmark={false} />
          <View style={{ flex: 1, gap: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <AppText variant="caption" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {activeOrg?.name ?? "بدون فضا"}
              </AppText>
              <ChevronDown size={14} color={theme.colors.textMuted} strokeWidth={2} />
            </View>
            <AppText variant="overline" tone="muted" numberOfLines={1}>
              {roleLabel}
            </AppText>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `اعلان‌ها، ${unreadCount} خوانده‌نشده` : "اعلان‌ها"}
          hitSlop={8}
          onPress={() => router.push("/notifications")}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <Bell size={20} color={theme.colors.textSecondary} strokeWidth={2} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 3,
                borderRadius: 8,
                backgroundColor: theme.colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText variant="overline" numeric style={{ color: theme.colors.onPrimary, fontSize: 9 }}>
                {unreadCount > 9 ? "۹+" : unreadCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="حساب کاربری"
          onPress={() => setAccountOpen(true)}
          hitSlop={8}
        >
          <Avatar name={user?.full_name ?? "?"} size={32} />
        </Pressable>
      </View>

      {title ? (
        <AppText variant="display" weight="extrabold" style={{ marginTop: 2 }}>
          {title}
        </AppText>
      ) : null}

      <ActionMenu
        visible={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        title="فضای کاری"
        actions={[
          ...workspaces.map((workspace) => ({
            label:
              workspace.id === activeOrg?.id
                ? `${workspace.name} • فعال`
                : workspace.name,
            icon: <Building2 size={18} color={theme.colors.textSecondary} strokeWidth={2} />,
            onPress: () => {
              void setActiveOrg(workspace.id);
            },
          })),
          ...(workspaces.length === 0
            ? [
                {
                  label: "هیچ فضایی ندارید",
                  icon: <Building2 size={16} color={theme.colors.textMuted} />,
                  onPress: () => undefined,
                },
              ]
            : []),
        ]}
      />

      <ActionMenu
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        title={user?.full_name ?? "حساب کاربری"}
        actions={[
          {
            label: "تنظیمات حساب",
            icon: <Settings size={18} color={theme.colors.textSecondary} strokeWidth={2} />,
            onPress: () => router.push("/settings"),
          },
          ...(activeOrg?.role === "ORG_ADMIN"
            ? [
                {
                  label: activeOrg?.organization_type === "GYM" ? "پنل مدیریت باشگاه" : "پنل مدیریت فضا",
                  icon: <UserCog size={18} color={theme.colors.textSecondary} strokeWidth={2} />,
                  onPress: () => router.push("/admin"),
                },
              ]
            : []),
          {
            label: "خروج از حساب",
            icon: <LogOut size={18} color={theme.colors.error} strokeWidth={2} />,
            destructive: true,
            onPress: () => setConfirmLogout(true),
          },
        ]}
      />

      <Dialog
        visible={confirmLogout}
        title="خروج از حساب"
        message="برای ورود دوباره به شماره موبایل و رمز عبور نیاز دارید."
        confirmLabel="خروج"
        destructive
        busy={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setLoggingOut(true);
          try {
            await logout();
            router.replace("/login");
          } finally {
            setLoggingOut(false);
            setConfirmLogout(false);
          }
        }}
      />
    </View>
  );
}
