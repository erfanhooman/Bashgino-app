import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, KeyRound, Phone } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { FieldError, Input, PasswordMeter } from "@/components/ui/form";
import { Screen } from "@/components/ui/layout";
import { useSnackbar } from "@/components/ui/overlay";
import { Card } from "@/components/ui/surface";
import { AppText, PageTitle } from "@/components/ui/text";
import { ApiError } from "@/services/api/client";
import * as api from "@/services/api/endpoints";
import { useTheme } from "@/theme";
import { assessPassword, toAsciiDigits, toPersianDigits } from "@bashgino/domain";

/**
 * Password recovery, in two steps: prove the number with a code, then set a new
 * password. The server issues the recovery OTP under its own purpose, so a
 * registration code can never be replayed here.
 */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ phone?: string }>();
  const { show } = useSnackbar();

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [phone, setPhone] = useState(() => toAsciiDigits(String(params.phone ?? "")).replace(/[^\d+]/g, ""));
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const assessment = assessPassword(password);

  const requestCode = async () => {
    setError(null);
    const identifier = toAsciiDigits(phone).trim();
    if (identifier.length < 10) {
      setError("شماره موبایل معتبر وارد کنید.");
      return;
    }
    setBusy(true);
    try {
      await api.requestPasswordReset(identifier);
      setStep("confirm");
      show("کد بازیابی ارسال شد.", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ارسال کد انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    setError(null);
    if (code.trim().length < 4) {
      setError("کد تأیید را وارد کنید.");
      return;
    }
    if (!assessment.ok) {
      setError(assessment.hint ?? "رمز عبور شرایط لازم را ندارد.");
      return;
    }
    if (password !== confirm) {
      setError("تکرار رمز عبور مطابقت ندارد.");
      return;
    }
    setBusy(true);
    try {
      await api.confirmPasswordReset({
        phone_number: toAsciiDigits(phone).trim(),
        code: code.trim(),
        new_password: password,
        new_password_confirm: confirm,
      });
      show("رمز عبور تغییر کرد. وارد شوید.", "success");
      router.replace({ pathname: "/login", params: { identifier: toAsciiDigits(phone).trim() } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تغییر رمز انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll padded={false}>
      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="بازگشت"
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, alignSelf: "flex-start" }}
        >
          <ArrowRight size={18} color={theme.colors.textSecondary} strokeWidth={2} />
          <AppText variant="caption" tone="secondary">
            بازگشت به ورود
          </AppText>
        </Pressable>

        <Brand size={40} showWordmark={false} />
        <View style={{ gap: 6 }}>
          <PageTitle>بازیابی رمز عبور</PageTitle>
          <AppText variant="caption" tone="secondary">
            {step === "request"
              ? "شماره موبایل حساب خود را وارد کنید تا کد تأیید برایتان پیامک شود."
              : `کد ارسال‌شده به ${toPersianDigits(toAsciiDigits(phone))} را وارد کنید و رمز جدید بسازید.`}
          </AppText>
        </View>

        <Card style={{ gap: theme.spacing.lg }}>
          <Input
            label="شماره موبایل"
            placeholder="09123456789"
            value={phone}
            onChangeText={(value) => setPhone(toAsciiDigits(value).replace(/[^\d+]/g, ""))}
            keyboardType="phone-pad"
            numeric
            editable={step === "request"}
            leading={<Phone size={17} color={theme.colors.textMuted} strokeWidth={2} />}
            required
          />

          {step === "confirm" ? (
            <>
              <Input
                label="کد تأیید"
                placeholder="۱۲۳۴۵۶"
                value={code}
                onChangeText={(value) => setCode(toPersianDigits(toAsciiDigits(value)).slice(0, 8))}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                leading={<KeyRound size={17} color={theme.colors.textMuted} strokeWidth={2} />}
                required
              />
              <View style={{ gap: 8 }}>
                <Input
                  label="رمز عبور جدید"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  secureToggle
                  autoCapitalize="none"
                  required
                />
                <PasswordMeter
                  hasLength={assessment.hasLength}
                  hasWordAndNumber={assessment.hasWordAndNumber}
                  level={assessment.level}
                  visible={password.length > 0}
                />
              </View>
              <Input
                label="تکرار رمز عبور جدید"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                secureToggle
                autoCapitalize="none"
                error={confirm.length > 0 && confirm !== password ? "تکرار رمز مطابقت ندارد." : null}
                required
              />
            </>
          ) : null}

          <FieldError message={error} />

          <Button
            label={step === "request" ? "دریافت کد تأیید" : "تغییر رمز عبور"}
            onPress={step === "request" ? requestCode : confirmReset}
            loading={busy}
            fullWidth
            size="lg"
          />

          {step === "confirm" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep("request")}
              style={{ alignSelf: "flex-start" }}
            >
              <AppText variant="caption" weight="medium" tone="brand">
                تغییر شماره موبایل
              </AppText>
            </Pressable>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
