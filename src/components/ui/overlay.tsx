import { X } from "lucide-react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

import { Button } from "./button";
import { Card, Divider } from "./surface";
import { useAnimatedValue } from "./animated";
import { AppText } from "./text";

const BACKDROP_DURATION = 200;
const PANEL_DURATION = 260;

/**
 * Bottom sheet.
 *
 * Android's back button closes it (`onRequestClose`), the backdrop is a real
 * dismiss target with an accessible label, and the panel clears the gesture bar
 * through the safe-area inset. Content scrolls inside the panel so a long form
 * never pushes the actions off-screen.
 */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  height?: ViewStyle["height"];
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useAnimatedValue(0);
  // Android's Modal is its own window, so `adjustResize` never shrinks this
  // sheet and the footer ends up behind the IME. Tracking the keyboard height and
  // padding the sheet by it keeps the primary action reachable while typing.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: visible ? 1 : 0,
        duration: visible ? PANEL_DURATION : BACKDROP_DURATION,
        easing: Easing.bezier(...theme.motion.bezier.out),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, progress, theme.motion.bezier.out]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          style={{
            ...StyleSheetAbsoluteFill,
            backgroundColor: theme.colors.overlay,
            opacity: progress,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel="بستن"
            onPress={onClose}
          />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Animated.View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius["2xl"],
              borderTopRightRadius: theme.radius["2xl"],
              maxHeight: "88%",
              height,
              paddingBottom: insets.bottom + theme.spacing.lg + keyboardHeight,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.borderStrong,
                }}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.md,
                paddingBottom: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                {title ? <AppText variant="title">{title}</AppText> : null}
                {description ? (
                  <AppText variant="caption" tone="secondary">
                    {description}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="بستن"
                hitSlop={10}
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.surfaceSubtle,
                }}
              >
                <X size={18} color={theme.colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <Divider />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: theme.spacing.lg,
                gap: theme.spacing.lg,
                paddingBottom: theme.spacing["2xl"],
              }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing.lg,
                  paddingTop: theme.spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const StyleSheetAbsoluteFill: ViewStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

/** Centred confirm dialog for irreversible actions. */
export function Dialog({
  visible,
  title,
  message,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.overlay,
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.xl,
        }}
      >
        <Card style={{ width: "100%", maxWidth: 400, gap: 10 }}>
          <AppText variant="subtitle">{title}</AppText>
          {message ? (
            <AppText variant="caption" tone="secondary">
              {message}
            </AppText>
          ) : null}
          {children}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? "destructive" : "primary"}
              onPress={onConfirm}
              loading={busy}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

/** Overflow menu — one sheet for every kebab in the app. */
export function ActionMenu({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: MenuAction[];
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: 6 }}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 48,
              paddingHorizontal: 12,
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? theme.colors.surfaceSubtle : "transparent",
            })}
          >
            {action.icon}
            <AppText
              variant="body"
              weight="medium"
              style={{ color: action.destructive ? theme.colors.error : theme.colors.text }}
            >
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

// ── Snackbar ────────────────────────────────────────────────────────────────

type SnackTone = "default" | "success" | "error";
interface SnackMessage {
  id: number;
  message: string;
  tone: SnackTone;
}

const SnackbarContext = createContext<{
  show: (message: string, tone?: SnackTone) => void;
} | null>(null);

/**
 * Toast host.
 *
 * Rendered above the tab bar (the bottom inset is added here) so a save
 * confirmation is never hidden behind navigation. One message at a time: a
 * queued stack of toasts is noise, and the newest one is the relevant one.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<SnackMessage | null>(null);
  const opacity = useAnimatedValue(0);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: SnackTone = "default") => {
      counter.current += 1;
      setCurrent({ id: counter.current, message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!current) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.bezier(...theme.motion.bezier.out),
      useNativeDriver: true,
    }).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setCurrent(null);
      });
    }, 3200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [current, opacity, theme.motion.bezier.out]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {current ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            bottom: insets.bottom + 72,
            opacity,
          }}
        >
          <View
            style={{
              backgroundColor:
                current.tone === "error"
                  ? theme.colors.errorStrong
                  : current.tone === "success"
                    ? theme.colors.inverseSurface
                    : theme.colors.inverseSurface,
              borderRadius: theme.radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              ...theme.shadows.raised,
            }}
          >
            <AppText variant="caption" style={{ color: theme.colors.inverseText }}>
              {current.message}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used inside <SnackbarProvider>");
  return ctx;
}
