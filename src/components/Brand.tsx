import { Dumbbell } from "lucide-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { useTheme } from "@/theme";

/**
 * Brand lockup.
 *
 * A dark-red tile with the dumbbell mark and the wordmark — the same
 * relationship the web's header uses. `inverse` renders it for photographic or
 * dark panels without inventing a second logo.
 */
export function Brand({
  size = 44,
  showWordmark = true,
  inverse = false,
  tagline,
}: {
  size?: number;
  showWordmark?: boolean;
  inverse?: boolean;
  tagline?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: inverse ? "rgba(255,255,255,0.16)" : theme.colors.primary,
        }}
      >
        <Dumbbell size={size * 0.52} color={theme.colors.onPrimary} strokeWidth={2.2} />
      </View>
      {showWordmark ? (
        <View style={{ gap: 1 }}>
          <AppText variant="title" weight="extrabold" style={{ color: inverse ? theme.colors.inverseText : theme.colors.text }}>
            باشگینو
          </AppText>
          {tagline ? (
            <AppText variant="overline" style={{ color: inverse ? theme.colors.inverseMuted : theme.colors.textMuted }}>
              {tagline}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
