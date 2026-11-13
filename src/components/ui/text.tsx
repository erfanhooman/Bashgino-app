import { Text, type TextProps, type TextStyle } from "react-native";

import { useTheme, type Theme } from "@/theme";
import type { FontWeightToken } from "@/theme/tokens";

export type TextVariant =
  | "display" // page title, 28
  | "title" // section title, 20
  | "subtitle" // card title, 16
  | "body" // default copy, 14
  | "bodyStrong" // emphasis inside a body
  | "caption" // supporting text, 12
  | "overline" // 10-11 label above a value
  | "metric"; // numbers, tabular

export type TextTone =
  | "primary"
  | "secondary"
  | "muted"
  | "brand"
  | "inverse"
  | "onPrimary"
  | "success"
  | "warning"
  | "error";

const VARIANT_STYLE: Record<TextVariant, { size: number; weight: FontWeightToken; lineHeight: number }> = {
  display: { size: 26, weight: "bold", lineHeight: 1.35 },
  title: { size: 20, weight: "bold", lineHeight: 1.4 },
  subtitle: { size: 16, weight: "semibold", lineHeight: 1.45 },
  body: { size: 14, weight: "regular", lineHeight: 1.6 },
  bodyStrong: { size: 14, weight: "semibold", lineHeight: 1.6 },
  caption: { size: 12, weight: "regular", lineHeight: 1.55 },
  overline: { size: 11, weight: "medium", lineHeight: 1.45 },
  metric: { size: 24, weight: "bold", lineHeight: 1.25 },
};

function toneColor(theme: Theme, tone: TextTone): string {
  switch (tone) {
    case "secondary":
      return theme.colors.textSecondary;
    case "muted":
      return theme.colors.textMuted;
    case "brand":
      return theme.colors.brandInk;
    case "inverse":
      return theme.colors.inverseText;
    case "onPrimary":
      return theme.colors.onPrimary;
    case "success":
      return theme.colors.success;
    case "warning":
      return theme.colors.warning;
    case "error":
      return theme.colors.error;
    default:
      return theme.colors.text;
  }
}

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: FontWeightToken;
  /** Numeric content: tabular figures, so columns line up. */
  numeric?: boolean;
  align?: TextStyle["textAlign"];
  center?: boolean;
}

/**
 * The only text primitive.
 *
 * `writingDirection: rtl` is set explicitly rather than relying on
 * `I18nManager`: mixed Persian/Latin strings (exercise names, phone numbers,
 * `RPE 8`) then keep their Persian punctuation on the correct side even when a
 * single word is Latin.
 */
export function AppText({
  variant = "body",
  tone = "primary",
  weight,
  numeric,
  align,
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const preset = VARIANT_STYLE[variant];

  return (
    <Text
      {...rest}
      style={[
        {
          color: toneColor(theme, tone),
          fontFamily: theme.fontFamily[weight ?? preset.weight],
          fontSize: preset.size,
          lineHeight: Math.round(preset.size * preset.lineHeight),
          // React Native swaps physical left/right styles when the layout is RTL
          // (`I18nManager.doLeftAndRightSwapInRTL`), so an explicit `right` here
          // actually renders left. `auto` is the logical choice for Persian copy;
          // a numeric block would resolve LTR, so it asks for `left`, which the
          // swap turns into the visual right in an RTL app.
          textAlign: align ?? (center ? "center" : numeric ? "left" : "auto"),
          writingDirection: "rtl",
          includeFontPadding: false,
        },
        numeric ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}

/** Page heading with the app's standard rhythm above content. */
export function PageTitle({ children, style, ...rest }: AppTextProps) {
  return (
    <AppText variant="display" weight="extrabold" style={style} {...rest}>
      {children}
    </AppText>
  );
}

/**
 * Isolates a left-to-right value (phone, email, URL) inside RTL copy.
 *
 * The Unicode bidi algorithm otherwise treats a leading `+` as neutral and
 * reorders it to the visual end of the run — `+989990000001` rendered as
 * `989990000001+`. LRM/PDI isolates give the run its own direction without
 * touching the surrounding paragraph, which is the only fix that survives a
 * mixed string like «مربی: سارا · +9899…».
 */
export function ltrIsolate(value: string): string {
  return `\u2066${value}\u2069`;
}
