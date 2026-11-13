import { Pressable, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

import { AppText } from "./text";

export interface TabOption {
  key: string;
  label: string;
  count?: number;
}

/**
 * Segmented filter row (the roster's status tabs, the editor's sections).
 *
 * Scrolls horizontally when the labels cannot fit — a 320dp phone with three
 * Persian labels would otherwise squeeze the touch targets below 44dp.
 */
export function SegmentedTabs({
  options,
  value,
  onChange,
  style,
}: {
  options: TabOption[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: "row",
          gap: 6,
          padding: 4,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              typeof option.count === "number" ? `${option.label}، ${option.count} مورد` : option.label
            }
            onPress={() => onChange(option.key)}
            style={{
              flex: 1,
              minHeight: 34,
              paddingHorizontal: 8,
              borderRadius: theme.radius.sm,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: active ? theme.colors.surface : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: theme.colors.border,
            }}
          >
            <AppText
              variant="caption"
              weight={active ? "bold" : "medium"}
              tone={active ? "primary" : "secondary"}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
            {typeof option.count === "number" ? (
              <View
                style={{
                  minWidth: 18,
                  paddingHorizontal: 5,
                  borderRadius: 9,
                  backgroundColor: active ? theme.colors.primarySubtle : theme.colors.surface,
                  alignItems: "center",
                }}
              >
                <AppText
                  variant="overline"
                  weight="bold"
                  numeric
                  style={{ color: active ? theme.colors.brandInk : theme.colors.textMuted }}
                >
                  {option.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Underlined section switch used by the plan editors. */
export function UnderlineTabs({
  options,
  value,
  onChange,
}: {
  options: TabOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 2,
              borderBottomColor: active ? theme.colors.primary : "transparent",
              marginBottom: -1,
            }}
          >
            <AppText variant="caption" weight={active ? "bold" : "medium"} tone={active ? "brand" : "secondary"}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
