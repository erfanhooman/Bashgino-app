import { router } from "expo-router";
import { Building2, LogOut, Moon, Smartphone, Sun } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Badge, Card, Divider, SectionHeader } from "@/components/ui/surface";
import { SegmentedTabs } from "@/components/ui/tabs";
import { AppText, ltrIsolate } from "@/components/ui/text";
import { useSession } from "@/store/session";
import { useTheme, useThemeMode, type ThemeMode } from "@/theme";

/**
 * Account and appearance.
 *
 * The theme control is here (not buried in a menu) because the app ships with a
 * designed dark mode; the workspace list mirrors the header's switcher for
 * managers who belong to more than one space.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const user = useSession((state) => state.user);
  const workspaces = useSession((state) => state.workspaces);
  const activeOrg = useSession((state) => state.activeOrg);
  const setActiveOrg = useSession((state) => state.setActiveOrg);
  const logout = useSession((state) => state.logout);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <AppScreen
      showHeader={false}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={user?.full_name ?? "?"} size={52} />
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            {user?.full_name ?? "کاربر"}
          </AppText>
          <AppText variant="caption" tone="secondary" numeric>
            {ltrIsolate(user?.phone_number ?? "—")}
          </AppText>
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <SectionHeader title="ظاهر برنامه" icon={<Moon size={18} color={theme.colors.brandInk} strokeWidth={2} />} />
        <SegmentedTabs
          value={mode}
          onChange={(next) => setMode(next as ThemeMode)}
          options={[
            { key: "light", label: "روشن" },
            { key: "dark", label: "تیره" },
            { key: "system", label: "سیستم" },
          ]}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {mode === "dark" ? (
            <Moon size={13} color={theme.colors.textMuted} strokeWidth={2} />
          ) : mode === "light" ? (
            <Sun size={13} color={theme.colors.textMuted} strokeWidth={2} />
          ) : (
            <Smartphone size={13} color={theme.colors.textMuted} strokeWidth={2} />
          )}
          <AppText variant="overline" tone="muted">
            {mode === "system" ? "هم‌راستا با تنظیمات گوشی" : "انتخاب دستی شما"}
          </AppText>
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionHeader
          title="فضاهای کاری"
          hint={`${workspaces.length} فضا`}
          icon={<Building2 size={18} color={theme.colors.brandInk} strokeWidth={2} />}
        />
        <Divider />
        {workspaces.map((workspace) => (
          <Card
            key={workspace.id}
            padded={false}
            onPress={() => void setActiveOrg(workspace.id)}
            style={{
              padding: theme.spacing.md,
              borderColor: workspace.id === activeOrg?.id ? theme.colors.selected : theme.colors.border,
              backgroundColor:
                workspace.id === activeOrg?.id ? theme.colors.primarySubtle : theme.colors.surface,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="medium" numberOfLines={1}>
                  {workspace.name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {workspace.role === "ORG_ADMIN"
                    ? "مدیر"
                    : workspace.role === "CLIENT"
                      ? "ورزشکار"
                      : "مربی"}
                  {" · "}
                  {workspace.organization_type === "GYM" ? "باشگاه" : "فضای شخصی"}
                </AppText>
              </View>
              {workspace.id === activeOrg?.id ? <Badge label="فعال" tone="primary" /> : null}
            </View>
          </Card>
        ))}
        <AppText variant="caption" tone="muted">
          ساخت فضای جدید و مدیریت فضاها در نسخه وب انجام می‌شود.
        </AppText>
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionHeader title="درباره" />
        <AppText variant="caption" tone="secondary">
          باشگینو — سامانه هوشمند مدیریت و تمرین ورزشی. نسخه اپلیکیشن ۱.۰.۰
        </AppText>
        <Brand size={30} tagline="نسخه اندروید" />
      </Card>

      <Button
        label="خروج از حساب"
        variant="secondary"
        icon={LogOut}
        onPress={() => setConfirmLogout(true)}
      />

      <Dialog
        visible={confirmLogout}
        title="خروج از حساب"
        message="برای ورود دوباره به شماره موبایل و رمز عبور نیاز دارید."
        confirmLabel="خروج"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          await logout();
          setConfirmLogout(false);
          router.replace("/login");
        }}
      />
    </AppScreen>
  );
}
