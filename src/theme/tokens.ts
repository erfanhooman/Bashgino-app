/**
 * Semantic theme — the single styling surface for the Android app.
 *
 * Values come from `tokens.generated.ts`, which is extracted from the web
 * app's `globals.css`; this file only gives them names a component can read.
 * Components must never hardcode a hex value, a radius or a spacing number:
 * `useTheme()` is the only way to style, so light/dark and the web palette stay
 * in sync by construction.
 *
 * Rules carried over from `docs/gym-plan-design-preferences-v2.md`:
 * - `primary` is a *fill*; brand-coloured text/icons use `brandInk`.
 * - Semantic states (success/warning/error/info) are distinct from brand red.
 * - `inverseSurface` is intentionally dark in both themes (photo scrims).
 */
import { colorTokens, sharedTokens } from "./tokens.generated";

type RawColorKey = keyof typeof colorTokens.light;
type RawColors = Record<RawColorKey, string>;

export interface ThemeColors {
  // Surfaces and text
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;

  // Brand
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  onPrimary: string;
  primarySubtle: string;
  /** Readable brand text/icon colour on neutral surfaces. */
  brandInk: string;
  selected: string;
  focus: string;

  // Semantic states
  success: string;
  successSubtle: string;
  successBorder: string;
  warning: string;
  warningSubtle: string;
  warningBorder: string;
  error: string;
  errorSubtle: string;
  errorBorder: string;
  errorStrong: string;
  errorStrongHover: string;
  info: string;
  infoSubtle: string;
  infoBorder: string;

  // Overlays and intentionally-dark panels
  overlay: string;
  inverseSurface: string;
  inverseRaised: string;
  inverseText: string;
  inverseMuted: string;

  // Data visualisation
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  /** `rgb(r g b)` triplet for alpha compositing; null when the token is not a triplet. */
  rgb: (name: string) => { r: number; g: number; b: number } | null;
}

function rgbTriplet(raw: string | undefined) {
  if (!raw) return null;
  const parts = raw.trim().split(/\s+/).map(Number);
  const [r, g, b] = parts;
  if (parts.length !== 3 || r === undefined || g === undefined || b === undefined) return null;
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function buildColors(raw: RawColors): ThemeColors {
  return {
    bg: raw["color-bg"],
    surface: raw["color-surface"],
    surfaceRaised: raw["color-surface-raised"],
    surfaceSubtle: raw["color-surface-subtle"],
    text: raw["color-text"],
    textSecondary: raw["color-text-secondary"],
    textMuted: raw["color-text-muted"],
    border: raw["color-border"],
    borderStrong: raw["color-border-strong"],

    primary: raw["color-primary"],
    primaryHover: raw["color-primary-hover"],
    primaryPressed: raw["color-primary-pressed"],
    onPrimary: raw["color-on-primary"],
    primarySubtle: raw["color-primary-subtle"],
    brandInk: raw["color-primary-ink"],
    selected: raw["color-selected-border"],
    focus: raw["color-focus"],

    success: raw["color-success"],
    successSubtle: raw["color-success-subtle"],
    successBorder: raw["color-success-border"],
    warning: raw["color-warning"],
    warningSubtle: raw["color-warning-subtle"],
    warningBorder: raw["color-warning-border"],
    error: raw["color-error"],
    errorSubtle: raw["color-error-subtle"],
    errorBorder: raw["color-error-border"],
    errorStrong: raw["color-error-strong"],
    errorStrongHover: raw["color-error-strong-hover"],
    info: raw["color-info"],
    infoSubtle: raw["color-info-subtle"],
    infoBorder: raw["color-info-border"],

    overlay: raw["color-overlay"],
    inverseSurface: raw["color-inverse-surface"],
    inverseRaised: raw["color-inverse-raised"],
    inverseText: raw["color-inverse-text"],
    inverseMuted: raw["color-inverse-muted"],

    chart1: raw["color-chart-1"],
    chart2: raw["color-chart-2"],
    chart3: raw["color-chart-3"],
    chart4: raw["color-chart-4"],
    chart5: raw["color-chart-5"],

    // Only some tokens are declared as `r g b` triplets; everything else (hex,
    // rgba) has no alpha compositing path and returns null so callers fall back
    // to the solid token instead of silently rendering nothing.
    rgb: (name) => rgbTriplet(raw[name as RawColorKey]),
  };
}

export const lightTheme = buildColors(colorTokens.light);
export const darkTheme = buildColors(colorTokens.dark);

/** 4px rhythm. The named steps come from the stylesheet; the rest complete the scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

/** `rounded-sm/md/lg` in the web app are 6/10/14; `rounded-xl` stays Tailwind's 12. */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 12,
  "2xl": 16,
  "3xl": 20,
  full: 999,
} as const;

/** Tailwind's default scale, which the web UI is built on (px → dp 1:1). */
export const typography = {
  size: {
    "2xs": 10,
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28,
    "5xl": 32,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.4,
    normal: 1.55,
    relaxed: 1.7,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
} as const;

/**
 * Font families per weight. React Native cannot synthesise Persian weights
 * from a single file: each weight is a separate TTF, so the mapping is explicit
 * and the loaded families are asserted in `useAppFonts`.
 */
export const fontFamily = {
  regular: "Vazirmatn_400Regular",
  medium: "Vazirmatn_500Medium",
  semibold: "Vazirmatn_600SemiBold",
  bold: "Vazirmatn_700Bold",
  extrabold: "Vazirmatn_800ExtraBold",
  black: "Vazirmatn_900Black",
} as const;

export type FontWeightToken = keyof typeof fontFamily;

/** Elevation is deliberately restrained on web; Android gets the same feel. */
export const shadows = {
  none: null,
  card: { shadowColor: "#0B0F14", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  raised: { shadowColor: "#0B0F14", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  sheet: { shadowColor: "#0B0F14", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 16 },
} as const;

/** Motion tokens — same curves as the web, parsed for Reanimated. */
export const motion = {
  duration: {
    press: 120,
    control: 180,
    surface: 200,
    step: 220,
    settle: 320,
  },
  /** cubic-bezier control points, for `Easing.bezier(...)`. */
  bezier: {
    out: [0.23, 1, 0.32, 1] as [number, number, number, number],
    inOut: [0.77, 0, 0.175, 1] as [number, number, number, number],
  },
} as const;

/** Minimum touch target per the design doc (44px) and Android accessibility. */
export const TOUCH_TARGET = 44;

/** Asserts the generated file still matches the stylesheet at runtime/build. */
export const tokenSource = {
  radiusSm: sharedTokens["radius-sm"],
  radiusMd: sharedTokens["radius-md"],
  radiusLg: sharedTokens["radius-lg"],
} as const;

export type Theme = {
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  shadows: typeof shadows;
  motion: typeof motion;
};

export function createTheme(dark: boolean): Theme {
  return {
    dark,
    colors: dark ? darkTheme : lightTheme,
    spacing,
    radius,
    typography,
    fontFamily,
    shadows,
    motion,
  };
}
