import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import {
  JALALI_MONTHS,
  formatJalaliDate,
  getDaysInJalaliMonth,
  isoFromJalali,
  jalaliFromIso,
  toPersianDigits,
} from "@bashgino/domain";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { AppText } from "@/components/ui/text";
import { useTheme } from "@/theme";

/**
 * Jalali date entry.
 *
 * The app is Persian-first, so a Gregorian picker would make the coach translate
 * in their head. This is a stepper sheet (year → month → day) built on the shared
 * calendar module: no extra native dependency, and the value handed back is the
 * same ISO string the API stores.
 */
export function JalaliDateField({
  label,
  value,
  onChange,
  required,
  allowClear = true,
  placeholder = "انتخاب تاریخ",
  disabled,
}: {
  label: string;
  /** ISO `YYYY-MM-DD`. */
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  required?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const current = jalaliFromIso(value ?? "") ?? { jy: 1404, jm: 1, jd: 1 };
  const [year, setYear] = useState<number>(current.jy);
  const [month, setMonth] = useState<number>(current.jm);
  const [day, setDay] = useState<number>(current.jd);

  const openSheet = () => {
    const seed = jalaliFromIso(value ?? "");
    if (seed) {
      setYear(seed.jy);
      setMonth(seed.jm);
      setDay(seed.jd);
    }
    setOpen(true);
  };

  const daysInMonth = getDaysInJalaliMonth(year, month);
  const safeDay = Math.min(day, daysInMonth);
  const monthName = JALALI_MONTHS[month - 1]?.nameFa ?? "";
  const preview = isoFromJalali(year, month, safeDay);

  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" weight="semibold" tone="secondary">
        {label}
        {required ? <AppText style={{ color: theme.colors.error }}> *</AppText> : null}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatJalaliDate(value) : placeholder}`}
        disabled={disabled}
        onPress={openSheet}
        style={{
          minHeight: 48,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: disabled ? theme.colors.surfaceSubtle : theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <CalendarDays size={16} color={theme.colors.textMuted} strokeWidth={2} />
        <AppText variant="body" tone={value ? "primary" : "muted"} style={{ flex: 1 }} numeric={Boolean(value)}>
          {value ? formatJalaliDate(value, { format: "full" }) : placeholder}
        </AppText>
        {value && allowClear && !disabled ? (
          <Button
            label="حذف"
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(null);
            }}
          />
        ) : null}
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <Button
            label="تأیید تاریخ"
            fullWidth
            onPress={() => {
              onChange(preview);
              setOpen(false);
            }}
          />
        }
      >
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title" weight="bold" center>
            {toPersianDigits(safeDay)} {monthName} {toPersianDigits(year)}
          </AppText>

          <Stepper
            label="سال"
            value={toPersianDigits(year)}
            onPrevious={() => setYear((currentValue) => currentValue - 1)}
            onNext={() => setYear((currentValue) => currentValue + 1)}
          />
          <Stepper
            label="ماه"
            value={monthName}
            onPrevious={() => setMonth((currentValue) => (currentValue === 1 ? 12 : currentValue - 1))}
            onNext={() => setMonth((currentValue) => (currentValue === 12 ? 1 : currentValue + 1))}
          />
          <Stepper
            label="روز"
            value={toPersianDigits(safeDay)}
            onPrevious={() => setDay((currentValue) => Math.max(1, Math.min(currentValue, daysInMonth) - 1))}
            onNext={() => setDay((currentValue) => Math.min(daysInMonth, Math.min(currentValue, daysInMonth) + 1))}
          />
        </View>
      </Sheet>
    </View>
  );
}

function Stepper({
  label,
  value,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.sm,
        minHeight: 52,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} بعدی`}
        onPress={onNext}
        hitSlop={8}
        style={{ padding: 8 }}
      >
        <ChevronRight size={20} color={theme.colors.brandInk} strokeWidth={2.2} />
      </Pressable>

      <View style={{ alignItems: "center" }}>
        <AppText variant="overline" tone="muted">
          {label}
        </AppText>
        <AppText variant="body" weight="semibold" numeric>
          {value}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} قبلی`}
        onPress={onPrevious}
        hitSlop={8}
        style={{ padding: 8 }}
      >
        <ChevronLeft size={20} color={theme.colors.brandInk} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
