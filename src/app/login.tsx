import { router, useLocalSearchParams } from "expo-router";
import { Phone, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/surface";
import { AppText, PageTitle } from "@/components/ui/text";
import { ApiError } from "@/services/api/client";
import { useSession } from "@/store/session";
import { useTheme } from "@/theme";
import { toAsciiDigits } from "@bashgino/domain";

/**
 * Sign-in.
 *
 * Password-only, like the web: no OTP step and no verification gate. The
 * `identifier` param pre-fills the phone (the invite flow sends people here) and
 * is never trusted for authentication — the server decides who the password
 * belongs to.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ identifier?: string; phone?: string; expired?: string }>();
  const login = useSession((state) => state.login);
  const bootstrapError = useSession((state) => state.bootstrapError);

  const [phone, setPhone] = useState(() => {
    const prefill = params.identifier ?? params.phone ?? "";
    return toAsciiDigits(String(prefill)).replace(/[^\d+]/g, "").slice(0, 13);
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    bootstrapError ?? (params.expired ? "نشست شما منقضی شد. دوباره وارد شوید." : null),
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    const identifier = toAsciiDigits(phone).trim();
    if (!identifier) {
      setError("شماره موبایل را وارد کنید.");
      return;
    }
    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }

    setBusy(true);
    try {
      await login(identifier, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ورود انجام نشد. اتصال اینترنت را بررسی کنید.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + theme.spacing["3xl"],
          paddingBottom: insets.bottom + theme.spacing["3xl"],
          paddingHorizontal: theme.spacing.xl,
          gap: theme.spacing["2xl"],
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 18 }}>
          <Brand size={52} tagline="سامانه هوشمند مدیریت و تمرین ورزشی" />
          <View style={{ gap: 6 }}>
            <PageTitle>ورود به حساب</PageTitle>
            <AppText variant="caption" tone="secondary">
              با شماره موبایل و رمز عبور وارد شوید. اگر دعوت‌نامه دریافت کرده‌اید، از همان
              لینک پیامک‌شده وارد شوید.
            </AppText>
          </View>
        </View>

        <Card style={{ gap: theme.spacing.lg }}>
          <Input
            label="شماره موبایل"
            placeholder="09123456789"
            value={phone}
            onChangeText={(value) =>
              setPhone(toAsciiDigits(value).replace(/[^\d+]/g, "").slice(0, 13))
            }
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            numeric
            leading={<Phone size={17} color={theme.colors.textMuted} strokeWidth={2} />}
            required
          />

          <Input
            label="رمز عبور"
            placeholder="رمز عبور خود را وارد کنید"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            secureToggle
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
            required
          />

          <FieldError message={error} />

          <Button label="ورود به حساب" onPress={submit} loading={busy} fullWidth size="lg" />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="فراموشی رمز عبور"
            onPress={() => router.push({ pathname: "/forgot-password", params: { phone } })}
            style={{ alignSelf: "flex-start", paddingVertical: 6 }}
          >
            <AppText variant="caption" weight="medium" tone="brand">
              رمز عبور را فراموش کرده‌اید؟
            </AppText>
          </Pressable>
        </Card>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceSubtle,
          }}
        >
          <ShieldCheck size={16} color={theme.colors.textMuted} strokeWidth={2} />
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
            نشست شما روی همین دستگاه و به‌صورت امن نگهداری می‌شود. برای استفاده مشترک، از
            حساب شخصی خود خارج شوید.
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
