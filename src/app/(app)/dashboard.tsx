import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { CoachHome } from "@/features/dashboard/CoachHome";
import { TraineeHome } from "@/features/dashboard/TraineeHome";
import { useSession } from "@/store/session";
import { useTheme } from "@/theme";

/**
 * `/dashboard` — one route, two jobs, decided by the active membership's role.
 *
 * This mirrors the web shell exactly: a coach lands on the desk, a trainee on
 * their own home, and a manager on the desk with the admin panel one tap away.
 */
export default function DashboardScreen() {
  const theme = useTheme();
  const status = useSession((state) => state.status);
  const activeOrg = useSession((state) => state.activeOrg);
  const role = activeOrg?.role ?? null;

  // Deep link while signed out: send them to sign in instead of rendering an
  // empty shell that would look like a broken account.
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status]);

  if (status !== "authenticated") return null;

  if (!activeOrg) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing.xl, gap: 12 }}>
        <Card style={{ gap: 10 }}>
          <AppText variant="subtitle">هنوز به فضای کاری متصل نیستید</AppText>
          <AppText variant="caption" tone="secondary">
            برای ورود به یک باشگاه یا فضای مربیگری، از لینک دعوتی که برای شما پیامک شده استفاده
            کنید. ساخت فضای جدید از نسخه وب انجام می‌شود.
          </AppText>
          <Button label="بستن نشست" variant="secondary" onPress={() => router.replace("/login")} />
        </Card>
      </View>
    );
  }

  if (role === "CLIENT") return <TraineeHome />;
  return <CoachHome />;
}
