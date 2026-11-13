import type { LucideIcon } from "lucide-react-native";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";

import { useTheme, TOUCH_TARGET } from "@/theme";

import { useAnimatedValue } from "./animated";
import { AppText } from "./text";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "start" | "end";
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Renders the label only for screen readers (icon-only control). */
  accessibilityLabel?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: TOUCH_TARGET, lg: 52 };
const PADDING: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

/**
 * The button primitive.
 *
 * Press feedback mirrors the web's `.press` primitive: scale to 0.97 on
 * pointer-down, 120ms, transform only. `useNativeDriver` keeps it off the JS
 * thread, so a press inside a long list never stutters.
 */
export function Button({
  label,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "start",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const scale = useAnimatedValue(1);
  const isDisabled = Boolean(disabled) || loading;

  const animate = (to: number) =>
    Animated.timing(scale, {
      toValue: to,
      duration: theme.motion.duration.press,
      easing: Easing.bezier(...theme.motion.bezier.out),
      useNativeDriver: true,
    }).start();

  const palette: Record<ButtonVariant, { bg: string; border: string; fg: string }> = {
    primary: { bg: theme.colors.primary, border: theme.colors.primary, fg: theme.colors.onPrimary },
    secondary: { bg: theme.colors.surface, border: theme.colors.border, fg: theme.colors.text },
    outline: { bg: "transparent", border: theme.colors.primary, fg: theme.colors.brandInk },
    ghost: { bg: "transparent", border: "transparent", fg: theme.colors.textSecondary },
    destructive: { bg: theme.colors.errorStrong, border: theme.colors.errorStrong, fg: theme.colors.onPrimary },
  };
  const tone = palette[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth ? { width: "100%" } : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        hitSlop={size === "sm" ? 6 : 0}
        style={[
          {
            height: HEIGHT[size],
            paddingHorizontal: PADDING[size],
            borderRadius: theme.radius.md,
            borderWidth: variant === "ghost" || variant === "primary" ? 0 : 1.5,
            borderColor: tone.border,
            backgroundColor: tone.bg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: isDisabled ? 0.55 : 1,
          },
          variant === "secondary" ? theme.shadows.card : null,
          style,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tone.fg} />
        ) : (
          <>
            {Icon && iconPosition === "start" ? <Icon size={18} color={tone.fg} strokeWidth={2} /> : null}
            <AppText
              variant={size === "sm" ? "caption" : "body"}
              weight="semibold"
              style={{ color: tone.fg, fontSize: size === "lg" ? 15 : 14 }}
              numberOfLines={1}
            >
              {label}
            </AppText>
            {Icon && iconPosition === "end" ? <Icon size={18} color={tone.fg} strokeWidth={2} /> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  icon: LucideIcon;
  label: string;
  tone?: "default" | "brand" | "danger";
  size?: number;
  style?: ViewStyle;
}

/** Square icon control with a 44dp touch area and a real accessible name. */
export function IconButton({ icon: Icon, label, tone = "default", size = 20, style, ...rest }: IconButtonProps) {
  const theme = useTheme();
  const color =
    tone === "brand" ? theme.colors.brandInk : tone === "danger" ? theme.colors.error : theme.colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: TOUCH_TARGET,
          height: TOUCH_TARGET,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? theme.colors.surfaceSubtle : "transparent",
        },
        style,
      ]}
      {...rest}
    >
      <View>
        <Icon size={size} color={color} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
