/**
 * Font loading.
 *
 * React Native cannot synthesise a Persian weight from one file: each weight is
 * its own TTF, and a missing family silently falls back to the system font —
 * which on Android renders Persian with Roboto and breaks the brand. So every
 * weight the design system uses is loaded up front and the splash screen waits.
 */
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
  Vazirmatn_900Black,
  useFonts,
} from "@expo-google-fonts/vazirmatn";

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
    Vazirmatn_900Black,
  });
  return loaded;
}
