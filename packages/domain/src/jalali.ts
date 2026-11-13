/**
 * Jalali (Shamsi / Solar Hijri) calendar utilities.
 *
 * Extracted verbatim from the web client (`frontend/src/lib/jalali.ts`) because
 * it is already pure: no DOM, no locale runtime, deterministic arithmetic. Both
 * clients must format a date the same way, and a second hand-written
 * implementation is exactly how a workout ends up on the wrong day.
 *
 * The web app keeps its copy for now — it is compiled by Next's bundler and was
 * deliberately left untouched in this phase. `dates.test.ts` pins the
 * conversion against known Gregorian/Jalali pairs so a future edit to either
 * copy fails loudly.
 */

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export const JALALI_MONTHS = [
  { id: 1, nameFa: "فروردین", nameEn: "Farvardin", days: 31 },
  { id: 2, nameFa: "اردیبهشت", nameEn: "Ordibehesht", days: 31 },
  { id: 3, nameFa: "خرداد", nameEn: "Khordad", days: 31 },
  { id: 4, nameFa: "تیر", nameEn: "Tir", days: 31 },
  { id: 5, nameFa: "مرداد", nameEn: "Mordad", days: 31 },
  { id: 6, nameFa: "شهریور", nameEn: "Shahrivar", days: 31 },
  { id: 7, nameFa: "مهر", nameEn: "Mehr", days: 30 },
  { id: 8, nameFa: "آبان", nameEn: "Aban", days: 30 },
  { id: 9, nameFa: "آذر", nameEn: "Azar", days: 30 },
  { id: 10, nameFa: "دی", nameEn: "Dey", days: 30 },
  { id: 11, nameFa: "بهمن", nameEn: "Bahman", days: 30 },
  { id: 12, nameFa: "اسفند", nameEn: "Esfand", days: 29 }, // 30 in a leap year
] as const;

export const JALALI_WEEK_DAYS = [
  { id: 1, nameFa: "شنبه", nameEn: "Saturday", shortFa: "ش" },
  { id: 2, nameFa: "یکشنبه", nameEn: "Sunday", shortFa: "ی" },
  { id: 3, nameFa: "دوشنبه", nameEn: "Monday", shortFa: "د" },
  { id: 4, nameFa: "سه‌شنبه", nameEn: "Tuesday", shortFa: "س" },
  { id: 5, nameFa: "چهارشنبه", nameEn: "Wednesday", shortFa: "چ" },
  { id: 6, nameFa: "پنج‌شنبه", nameEn: "Thursday", shortFa: "پ" },
  { id: 7, nameFa: "جمعه", nameEn: "Friday", shortFa: "ج" },
] as const;

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const bl = breaks.length;
  const jp = breaks[0]!;
  if (jy < jp || jy >= breaks[bl - 1]!) return false;

  let jm = breaks[0]!;
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i]!;
    if (jy < jm) break;
  }
  const n = jy - jp;
  let leap = ((n + 1) % 33) - 1;
  leap %= 4;
  if (leap === -1) leap = 4;
  return leap === 0;
}

export function getDaysInJalaliMonth(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) return 30;
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  jy = Number(jy);
  jm = Number(jm);
  jd = Number(jd);
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  // Same roll-over rule as the Gregorian→Jalali direction: only a remainder that
  // still holds whole years may advance the year, otherwise a date early in the
  // Jalali year comes back a full year earlier.
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const salA = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm += 1) {
    const v = salA[gm] ?? 0;
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
}

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  gy = Number(gy);
  gm = Number(gm);
  gd = Number(gd);
  const gDM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    (gDM[gm - 1] ?? 0);
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  // The year roll-over only applies when the remainder still contains whole
  // years. Applying it unconditionally (as the original web helper did) turns
  // Nowruz itself into the previous year — 2024-03-20 came back as 1402/01/01 —
  // because `floor((0 - 1) / 365)` is -1.
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(val: string | number): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function toAsciiDigits(val: string): string {
  if (!val) return "";
  return val
    .replace(/[۰٠]/g, "0")
    .replace(/[۱١]/g, "1")
    .replace(/[۲٢]/g, "2")
    .replace(/[۳٣]/g, "3")
    .replace(/[۴٤]/g, "4")
    .replace(/[۵٥]/g, "5")
    .replace(/[۶٦]/g, "6")
    .replace(/[۷٧]/g, "7")
    .replace(/[۸٨]/g, "8")
    .replace(/[۹٩]/g, "9");
}

export function getCurrentJalaliDate(): JalaliDate {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function jalaliFromIso(isoStr: string): JalaliDate | null {
  if (!isoStr) return null;
  const parts = isoStr.split("T")[0]?.split("-") ?? [];
  if (parts.length !== 3) return null;
  const gy = parseInt(parts[0] ?? "", 10);
  const gm = parseInt(parts[1] ?? "", 10);
  const gd = parseInt(parts[2] ?? "", 10);
  if (Number.isNaN(gy) || Number.isNaN(gm) || Number.isNaN(gd)) return null;
  return gregorianToJalali(gy, gm, gd);
}

export function isoFromJalali(jy: number, jm: number, jd: number): string {
  const g = jalaliToGregorian(jy, jm, jd);
  const mm = String(g.gm).padStart(2, "0");
  const dd = String(g.gd).padStart(2, "0");
  return `${g.gy}-${mm}-${dd}`;
}

export interface FormatJalaliOptions {
  format?: "numeric" | "short" | "medium" | "full";
  showTime?: boolean;
  persianDigits?: boolean;
  locale?: "fa" | "en";
}

/**
 * The only date formatter in the app.
 *
 * Accepts ISO strings, `Date`, epoch millis and already-Jalali strings
 * (`1405-08-15`), so a value that came from the API and a value a coach typed
 * both render the same way.
 */
export function formatJalaliDate(
  input: string | Date | number | null | undefined,
  options: FormatJalaliOptions = {},
): string {
  if (!input) return "—";

  const {
    format = "medium",
    showTime = false,
    persianDigits = true,
    locale = "fa",
  } = options;

  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else if (typeof input === "number") {
    d = new Date(input);
  } else {
    const cleaned = toAsciiDigits(input).trim();
    const separator = cleaned.includes("/") ? "/" : "-";
    const parts = cleaned.split("T")[0]?.split(separator) ?? [];
    if (parts.length === 3) {
      const p1 = parseInt(parts[0] ?? "", 10);
      const p2 = parseInt(parts[1] ?? "", 10);
      const p3 = parseInt(parts[2] ?? "", 10);
      // A year in the Jalali range means the string is already Jalali.
      if (p1 >= 1200 && p1 <= 1500) {
        const monthObj = JALALI_MONTHS[p2 - 1];
        const monthName = locale === "fa" ? monthObj?.nameFa ?? "" : monthObj?.nameEn ?? "";
        if (format === "numeric") {
          const res = `${p1}/${String(p2).padStart(2, "0")}/${String(p3).padStart(2, "0")}`;
          return persianDigits && locale === "fa" ? toPersianDigits(res) : res;
        }
        const res = `${p3} ${monthName} ${p1}`;
        return persianDigits && locale === "fa" ? toPersianDigits(res) : res;
      }
    }
    d = new Date(input);
  }

  if (Number.isNaN(d.getTime())) return String(input);

  const jDate = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const monthObj = JALALI_MONTHS[jDate.jm - 1];
  const monthName = locale === "fa" ? monthObj?.nameFa ?? "" : monthObj?.nameEn ?? "";

  let result = "";
  if (format === "numeric") {
    result = `${jDate.jy}/${String(jDate.jm).padStart(2, "0")}/${String(jDate.jd).padStart(2, "0")}`;
  } else if (format === "short" || format === "medium") {
    result = `${jDate.jd} ${monthName} ${jDate.jy}`;
  } else {
    const dayOfWeek = d.getDay();
    const faWeekDays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
    const enWeekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekDay = locale === "fa" ? faWeekDays[dayOfWeek] : enWeekDays[dayOfWeek];
    result = `${weekDay} ${jDate.jd} ${monthName} ${jDate.jy}`;
  }

  if (showTime) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    result += locale === "fa" ? `، ساعت ${hh}:${mm}` : `, ${hh}:${mm}`;
  }

  return persianDigits && locale === "fa" ? toPersianDigits(result) : result;
}

/** `1405/08/15` for a date-only API value — used in form fields and chips. */
export function formatJalaliNumeric(iso: string): string {
  return formatJalaliDate(iso, { format: "numeric" });
}

/** "شنبه" for a Saturday-first weekday index (`0..6`). */
export function weekdayNameFa(index: number): string {
  return JALALI_WEEK_DAYS[((index % 7) + 7) % 7]?.nameFa ?? "";
}

/** "۲ روز پیش" / "امروز" — relative day label for session history. */
export function relativeDayLabel(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "—";
  const startOf = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const diffDays = Math.round((startOf(now) - startOf(target)) / 86_400_000);
  if (diffDays === 0) return "امروز";
  if (diffDays === 1) return "دیروز";
  if (diffDays > 1 && diffDays < 7) return `${toPersianDigits(diffDays)} روز پیش`;
  return formatJalaliDate(iso, { format: "medium" });
}
