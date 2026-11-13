import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/theme";

import { AppText } from "@/components/ui/text";

/**
 * Rest countdown ring.
 *
 * The remainder is drawn as a `strokeDashoffset` on a fixed circle, so every
 * tick is one cheap prop change. Countdowns are constant-rate — no easing — and
 * the last three seconds pulse, which is the only motion on the screen.
 */
export function RestRing({
  remaining,
  total,
  size = 220,
}: {
  remaining: number;
  total: number;
  size?: number;
}) {
  const theme = useTheme();
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const urgent = remaining <= 3;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const label = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceSubtle}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={urgent ? theme.colors.warning : theme.colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - ratio)}
          // Start at twelve o'clock instead of three, so the drain reads as a clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <AppText variant="metric" numeric style={{ fontSize: 40, color: theme.colors.text }}>
        {label}
      </AppText>
      <AppText variant="overline" tone="muted">
        استراحت باقی‌مانده
      </AppText>
    </View>
  );
}
