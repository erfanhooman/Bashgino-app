import { AlertTriangle, Inbox } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import { Button } from "./button";
import { Card, EmptyState } from "./surface";
import { AppText, PageTitle } from "./text";

/**
 * Screen frame.
 *
 * Every pixel that matters for a phone is handled here once: safe-area insets
 * (Android gesture bars and notches), keyboard avoidance on forms, and the
 * scroll container. Screens supply content, never their own padding hacks.
 */
export function Screen({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentContainerStyle,
  footer,
  padded = true,
  scrollProps,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ViewStyle;
  footer?: ReactNode;
  padded?: boolean;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle" | "refreshControl">;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const body = (
    <View
      style={{
        paddingHorizontal: padded ? theme.spacing.lg : 0,
        paddingTop: title ? theme.spacing.sm : theme.spacing.md,
        gap: theme.spacing.lg,
        ...contentContainerStyle,
      }}
    >
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <PageTitle>{title}</PageTitle>
            {subtitle ? (
              <AppText variant="caption" tone="secondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {headerRight}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + theme.spacing["4xl"],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={theme.colors.brandInk}
                colors={[theme.colors.primary]}
              />
            ) : undefined
          }
          {...scrollProps}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer}
    </KeyboardAvoidingView>
  );
}

export function LoadingBlock({ label = "در حال بارگذاری…" }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ paddingVertical: theme.spacing["4xl"], alignItems: "center", gap: 10 }}>
      <ActivityIndicator color={theme.colors.primary} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

/** Grey bars that hold the layout while data loads — no spinner jump. */
export function Skeleton({ height = 16, width = "100%", radius }: { height?: number; width?: number | `${number}%`; radius?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height,
        width,
        borderRadius: radius ?? theme.radius.sm,
        backgroundColor: theme.colors.surfaceSubtle,
      }}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <Card style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={index === 0 ? 18 : 12} width={index === 0 ? "55%" : "85%"} />
      ))}
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = "بارگذاری انجام نشد",
}: {
  message?: string;
  onRetry?: () => void;
  title?: string;
}) {
  const theme = useTheme();
  return (
    <Card style={{ alignItems: "center", gap: 10, paddingVertical: theme.spacing["2xl"] }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: theme.radius.lg,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.errorSubtle,
        }}
      >
        <AlertTriangle size={24} color={theme.colors.error} strokeWidth={1.8} />
      </View>
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      <AppText variant="caption" tone="secondary" center style={{ maxWidth: 280 }}>
        {message ?? "اتصال برقرار نشد. اینترنت را بررسی کنید."}
      </AppText>
      {onRetry ? <Button label="تلاش دوباره" variant="outline" size="sm" onPress={onRetry} /> : null}
    </Card>
  );
}

export function NoData({ title, description }: { title: string; description?: string }) {
  const theme = useTheme();
  return (
    <EmptyState
      title={title}
      description={description}
      icon={<Inbox size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
    />
  );
}

/** Simple horizontal progress rail, direction-aware via flexbox. */
export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.surfaceSubtle,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${clamped}%`,
          borderRadius: height / 2,
          backgroundColor: theme.colors.primary,
        }}
      />
    </View>
  );
}

/** Metric tile used on both dashboards. */
export function StatTile({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "warning";
}) {
  const theme = useTheme();
  const tileBg =
    tone === "brand"
      ? theme.colors.primarySubtle
      : tone === "warning"
        ? theme.colors.warningSubtle
        : theme.colors.surfaceSubtle;
  const tileFg =
    tone === "brand" ? theme.colors.brandInk : tone === "warning" ? theme.colors.warning : theme.colors.textSecondary;

  return (
    <Card style={{ flex: 1, gap: 6, padding: theme.spacing.md, borderWidth: 1 }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: theme.radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tileBg,
        }}
      >
        {icon ?? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tileFg }} />}
      </View>
      <AppText variant="metric" numeric>
        {value}
      </AppText>
      <AppText variant="overline" tone="secondary" numberOfLines={2}>
        {label}
      </AppText>
    </Card>
  );
}
