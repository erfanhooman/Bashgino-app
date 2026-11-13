import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SnackbarProvider } from "@/components/ui/overlay";
import { queryClient } from "@/services/query";
import { useSession } from "@/store/session";
import { ThemeProvider, useThemeMode } from "@/theme";
import { useAppFonts } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { isDark } = useThemeMode();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="forgot-password" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="(app)" options={{ animation: "fade" }} />
        {/* Pushed detail screens live outside the tabs: a trip into one athlete
            or one plan is a drill-down with its own back button, not a tab. */}
        <Stack.Screen name="clients/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="training/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="training/builder/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="training/plans/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="workout/[dayId]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="workout/history" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="session/[dayId]" options={{ animation: "fade" }} />
        <Stack.Screen name="nutrition/builder/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="nutrition/plans/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="notifications" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="admin/index" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="admin/coaches" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="admin/clients" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const status = useSession((state) => state.status);
  const bootstrap = useSession((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const ready = fontsLoaded && status !== "booting";

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Holding the splash is honest here: the next frame is either the shell or the
  // login screen, and a white flash between the two looks like a crash.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SnackbarProvider>
              <RootNavigator />
            </SnackbarProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
