import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/ui/layout";

import { useTheme } from "@/theme";

/**
 * A tab screen: utility bar on top, then the scrollable body with the app's
 * standard padding. Screens never position their own header, so the top bar can
 * never drift between modules.
 */
export function AppScreen({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentContainerStyle,
  showHeader = true,
  footer,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ViewStyle;
  showHeader?: boolean;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {showHeader ? <AppHeader /> : null}
      <Screen
        title={title}
        subtitle={subtitle}
        headerRight={headerRight}
        scroll={scroll}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={contentContainerStyle}
        footer={footer}
      >
        {children}
      </Screen>
    </View>
  );
}
