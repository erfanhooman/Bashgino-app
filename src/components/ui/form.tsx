import { Eye, EyeOff } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { useTheme, TOUCH_TARGET } from "@/theme";

import { AppText } from "./text";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  leading?: ReactNode;
  /** Password inputs get an eye toggle; never set `dir=ltr` on them. */
  secureToggle?: boolean;
  numeric?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Text field.
 *
 * Heights and borders follow the design spec (44dp, 1.5px, semantic tokens).
 * Direction handling is deliberate: the field inherits the app's RTL layout, and
 * only `numeric` content (phone, weight, reps) switches to LTR + left alignment
 * so digits don't jump around. A password field must stay direction-neutral —
 * dots are direction-agnostic and switching the field to LTR moves the reserved
 * space for the eye toggle to the opposite side.
 */
export function Input({
  label,
  hint,
  error,
  required,
  leading,
  secureToggle,
  numeric,
  secureTextEntry,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  const hidden = isPassword && !revealed;
  const isMultiline = Boolean(rest.multiline);

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.focus
      : theme.colors.borderStrong;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <AppText variant="caption" weight="medium" tone="secondary">
            {label}
          </AppText>
          {required ? (
            <AppText variant="caption" style={{ color: theme.colors.error }}>
              *
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          height: isMultiline ? undefined : TOUCH_TARGET,
          minHeight: isMultiline ? 92 : undefined,
          flexDirection: "row",
          alignItems: isMultiline ? "flex-start" : "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: isMultiline ? 10 : 0,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: theme.colors.surface,
        }}
      >
        {leading}
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          secureTextEntry={hidden}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            flex: 1,
            fontFamily: theme.fontFamily.regular,
            fontSize: 14,
            color: theme.colors.text,
            // The app is RTL-only, so a Persian field is right-aligned explicitly
            // rather than relying on `auto`: with empty content (a placeholder or
            // a password's dots) `auto` resolves to LTR and the text drifts to the
            // wrong edge. Numeric fields are the exception — they are LTR by
            // contract so digits keep their order.
            textAlign: numeric ? "left" : "right",
            writingDirection: numeric ? "ltr" : "rtl",
            paddingVertical: isMultiline ? 0 : 0,
            minHeight: isMultiline ? 72 : undefined,
            textAlignVertical: isMultiline ? "top" : "center",
          }}
          {...rest}
        />
        {isPassword && secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "پنهان کردن رمز" : "نمایش رمز"}
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}
          >
            {revealed ? (
              <EyeOff size={18} color={theme.colors.textMuted} strokeWidth={2} />
            ) : (
              <Eye size={18} color={theme.colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" style={{ color: theme.colors.error }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Inline form error used under a group of fields. */
export function FieldError({ message }: { message?: string | null }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <View
      style={{
        padding: 10,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.errorSubtle,
        borderWidth: 1,
        borderColor: theme.colors.errorBorder,
      }}
    >
      <AppText variant="caption" style={{ color: theme.colors.error }}>
        {message}
      </AppText>
    </View>
  );
}

/** Two-chip password requirement display, matching the web's meter. */
export function PasswordMeter({
  hasLength,
  hasWordAndNumber,
  level,
  visible,
}: {
  hasLength: boolean;
  hasWordAndNumber: boolean;
  level: 0 | 1 | 2 | 3;
  visible: boolean;
}) {
  const theme = useTheme();
  if (!visible) return null;
  const colors = [theme.colors.error, theme.colors.warning, theme.colors.success];
  const filled = level === 0 ? 0 : level;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              backgroundColor:
                index < filled ? (level === 1 ? colors[1] : colors[2]) : theme.colors.surfaceSubtle,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <AppText variant="overline" tone={hasLength ? "success" : "muted"}>
          {hasLength ? "✓" : "•"} حداقل ۸ کاراکتر
        </AppText>
        <AppText variant="overline" tone={hasWordAndNumber ? "success" : "muted"}>
          {hasWordAndNumber ? "✓" : "•"} حرف و عدد
        </AppText>
      </View>
    </View>
  );
}

/** Label + control row used in settings screens. */
export function ToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onToggle(!value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: TOUCH_TARGET,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" weight="medium">
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          padding: 3,
          alignItems: value ? "flex-end" : "flex-start",
          backgroundColor: value ? theme.colors.primary : theme.colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: value ? theme.colors.primary : theme.colors.border,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: value ? theme.colors.onPrimary : theme.colors.surface,
          }}
        />
      </View>
    </Pressable>
  );
}
