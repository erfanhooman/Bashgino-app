import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

import { createTheme, type Theme } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "bashgino.theme_mode";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  /** Resolved darkness, after the system preference is applied. */
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // The stored choice is read once on mount. Rendering the default first is
  // intentional: reading AsyncStorage is async, and blocking the first frame on
  // it would show a blank screen for a purely cosmetic preference.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .catch(() => {
        // A storage failure only costs the persisted preference; the app keeps
        // working with the system theme.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const theme = useMemo(() => createTheme(isDark), [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, isDark, setMode }),
    [theme, mode, isDark, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx.theme;
}

export function useThemeMode(): Pick<ThemeContextValue, "mode" | "setMode" | "isDark"> {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used inside <ThemeProvider>");
  return { mode: ctx.mode, setMode: ctx.setMode, isDark: ctx.isDark };
}

/**
 * Styles derived from the theme, created once per theme (not per render).
 *
 * Deliberately returns plain objects instead of going through
 * `StyleSheet.create`: in React Native 0.88 `create` is an identity function,
 * and its generic signature no longer accepts a `NamedStyles` shape. The
 * memoisation is what saves the work.
 */
export function useThemedStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
