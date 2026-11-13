import { Tabs } from "expo-router";
import { Activity, Apple, CalendarRange, Camera, Dumbbell, Users } from "lucide-react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRole } from "@/store/session";
import { useTheme } from "@/theme";

/**
 * The signed-in shell.
 *
 * One tab bar, role-driven items — the same model as the web's `resolveNav`:
 * a gym manager gets the coaching desk, a trainee gets their own four modules,
 * and no account ever sees a module its active membership would 403.
 *
 * Admin-only routes (`/admin/*`) are not tabs; they are reached from the
 * dashboard's management cards, exactly like the web's panel switch.
 */
export default function AppLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const isTrainee = role === "CLIENT";
  const canCoach = role === "COACH" || role === "ORG_ADMIN";

  const label = (text: string) => (Platform.OS === "android" ? text : text);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brandInk,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.medium,
          fontSize: 10,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: isTrainee ? label("داشبورد") : label("میز مربی"),
          tabBarIcon: ({ color, size }) => <Activity size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      {/* Coach modules — hidden (not removed) for a trainee account. */}
      <Tabs.Screen
        name="clients/index"
        options={{
          href: canCoach ? undefined : null,
          title: label("ورزشکاران"),
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="training/index"
        options={{
          href: canCoach ? undefined : null,
          title: label("تمرین"),
          tabBarIcon: ({ color, size }) => <CalendarRange size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="nutrition/index"
        options={{
          href: canCoach ? undefined : null,
          title: label("رژیم"),
          tabBarIcon: ({ color, size }) => <Apple size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      {/* Trainee modules. */}
      <Tabs.Screen
        name="workout/index"
        options={{
          href: isTrainee ? undefined : null,
          title: label("تمرین‌ها"),
          tabBarIcon: ({ color, size }) => <Dumbbell size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="nutrition-log"
        options={{
          href: isTrainee ? undefined : null,
          title: label("تغذیه"),
          tabBarIcon: ({ color, size }) => <Apple size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          title: label("پیشرفت"),
          tabBarIcon: ({ color, size }) => <Camera size={size - 2} color={color} strokeWidth={2} />,
        }}
      />

      {/* Drill-downs (settings, notifications, the admin panel) are root-stack
          routes: a tab declared with `href: null` is not navigable at all —
          `router.push` silently no-ops and the user stays where they were. */}
    </Tabs>
  );
}
