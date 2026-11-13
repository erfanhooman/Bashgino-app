import { router } from "expo-router";
import { Compass } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useTheme } from "@/theme";

/** Unknown route — offer a destination, not a dead end. */
export default function NotFoundScreen() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        padding: theme.spacing.xl,
        justifyContent: "center",
        gap: 12,
      }}
    >
      <Card style={{ gap: 10, alignItems: "center" }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: theme.radius.lg,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceSubtle,
          }}
        >
          <Compass size={24} color={theme.colors.textSecondary} strokeWidth={1.8} />
        </View>
        <AppText variant="title" center>
          این صفحه پیدا نشد
        </AppText>
        <AppText variant="caption" tone="secondary" center>
          ممکن است نشانی تغییر کرده باشد یا دسترسی به آن برای حساب شما تعریف نشده باشد.
        </AppText>
        <Button label="رفتن به میز کار من" onPress={() => router.replace("/dashboard")} />
      </Card>
    </View>
  );
}
