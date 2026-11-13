import { Users } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View, type ViewProps, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

import { AppText } from "./text";

export interface CardProps extends ViewProps {
  variant?: "surface" | "raised" | "subtle" | "inverse";
  padded?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Card surface.
 *
 * The web's `.card` is a bordered surface with a restrained shadow — not a
 * floating panel. Keeping the border is what makes dense rosters readable in
 * both themes, so the shadow stays optional and very light.
 */
export function Card({ variant = "surface", padded = true, pressable, onPress, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const background =
    variant === "raised"
      ? theme.colors.surfaceRaised
      : variant === "subtle"
        ? theme.colors.surfaceSubtle
        : variant === "inverse"
          ? theme.colors.inverseSurface
          : theme.colors.surface;

  const body = (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: theme.radius.lg,
          borderWidth: variant === "inverse" ? 0 : 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (!pressable && !onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error" | "info" | "inverse";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
  style?: ViewStyle;
}

/** Status pill. Semantic tones are never used for brand emphasis. */
export function Badge({ label, tone = "neutral", icon, style }: BadgeProps) {
  const theme = useTheme();
  const palette: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
    neutral: { bg: theme.colors.surfaceSubtle, fg: theme.colors.textSecondary, border: theme.colors.border },
    primary: { bg: theme.colors.primarySubtle, fg: theme.colors.brandInk, border: theme.colors.primarySubtle },
    success: { bg: theme.colors.successSubtle, fg: theme.colors.success, border: theme.colors.successBorder },
    warning: { bg: theme.colors.warningSubtle, fg: theme.colors.warning, border: theme.colors.warningBorder },
    error: { bg: theme.colors.errorSubtle, fg: theme.colors.error, border: theme.colors.errorBorder },
    info: { bg: theme.colors.infoSubtle, fg: theme.colors.info, border: theme.colors.infoBorder },
    inverse: { bg: "rgba(255,255,255,0.14)", fg: theme.colors.inverseText, border: "transparent" },
  };
  const toneColors = palette[tone];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: theme.radius.full,
          backgroundColor: toneColors.bg,
          borderWidth: 1,
          borderColor: toneColors.border,
        },
        style,
      ]}
    >
      {icon}
      <AppText variant="overline" weight="medium" style={{ color: toneColors.fg }}>
        {label}
      </AppText>
    </View>
  );
}

/** Small outline pill for metadata (counts, units, dates). */
export function MetaChip({ label, icon, style }: { label: string; icon?: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      {icon}
      <AppText variant="overline" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

/** Initials avatar — the app never blocks a row on a missing photo. */
export function Avatar({ name, size = 40, inverse }: { name: string; size?: number; inverse?: boolean }) {
  const theme = useTheme();
  const initial = (name || "?").trim().charAt(0);
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: inverse ? "rgba(255,255,255,0.16)" : theme.colors.primarySubtle,
      }}
    >
      <AppText
        weight="bold"
        style={{ color: inverse ? theme.colors.inverseText : theme.colors.brandInk, fontSize: size * 0.42 }}
      >
        {initial}
      </AppText>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.colors.border }, style]} />;
}

export function SectionHeader({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        {icon}
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">{title}</AppText>
          {hint ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {hint}
            </AppText>
          ) : null}
        </View>
      </View>
      {action}
    </View>
  );
}

/** Empty state: art, one headline, one line of copy, one action. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Card style={{ alignItems: "center", gap: 10, paddingVertical: theme.spacing["2xl"] }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.lg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.primarySubtle,
        }}
      >
        {icon ?? <Users size={26} color={theme.colors.brandInk} strokeWidth={1.8} />}
      </View>
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" tone="secondary" center style={{ maxWidth: 280 }}>
          {description}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: 6, width: "100%", maxWidth: 280 }}>{action}</View> : null}
    </Card>
  );
}
