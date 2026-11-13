/**
 * Training-plan rules: the write contract for a workout program.
 *
 * Extracted from the web builder (`frontend/src/lib/trainingBuilder.ts`), where
 * these functions are the only thing standing between a coach's form and the
 * API: the server validates the same ranges (`TrainingPlanWriteSerializer`) and
 * rejects unknown exercise ids, so the client check is a courtesy and the
 * payload shape is the contract.
 *
 * Deliberately free of React and of any HTTP client so the Android editor and
 * the web workspace serialize identically.
 */
import { formatJalaliDate, toAsciiDigits, toPersianDigits } from "./jalali";

export const MAX_TRAINING_DAYS = 7;

export type ScheduleMode = "WEEKLY" | "EXACT";
export type SaveMode = "DRAFT" | "ACTIVE";

export const SCHEDULE_MODES: { value: ScheduleMode; label: string; hint: string }[] = [
  {
    value: "WEEKLY",
    label: "برنامه هفتگی",
    hint: "هر روز تمرینی روی یک روز هفته تکرار می‌شود.",
  },
  {
    value: "EXACT",
    label: "برنامه با تاریخ مشخص",
    hint: "هر جلسه یک تاریخ دقیق دارد و تکرار نمی‌شود.",
  },
];

/** Saturday-first, mirroring `TrainingPlanDay.weekday`. */
export const WEEK_DAY_LABELS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
] as const;

export const PROGRAM_GOALS: { value: string; label: string }[] = [
  { value: "HYPERTROPHY", label: "افزایش حجم عضلانی" },
  { value: "STRENGTH", label: "افزایش قدرت" },
  { value: "FAT_LOSS", label: "کاهش چربی" },
  { value: "ENDURANCE", label: "افزایش استقامت" },
  { value: "MOBILITY", label: "انعطاف‌پذیری و تحرک" },
  { value: "RECOVERY", label: "بازتوانی" },
  { value: "GENERAL", label: "آمادگی جسمانی عمومی" },
];

export const CUSTOM_GOAL = "__custom__";

export const EXERCISE_LIMITS = {
  sets: { min: 1, max: 50 },
  restSeconds: { min: 0, max: 3600 },
  durationSeconds: { min: 1, max: 3600 },
  weightKg: { min: 0, max: 9999 },
  rpe: { min: 1, max: 10 },
  tempoMaxLength: 16,
  repsMaxLength: 32,
} as const;

/** Mirrors the model defaults (target_sets=3, target_reps="10-12", rest=90). */
export const EXERCISE_DEFAULTS = {
  sets: 3,
  reps: "10-12",
  restSeconds: 90,
} as const;

export interface MuscleInfo {
  id: string;
  canonical_name: string;
  localized_name_fa?: string | null;
  body_part?: string | null;
}

export interface EquipmentInfo {
  id: string;
  canonical_name: string;
  localized_name_fa?: string | null;
}

export interface ExerciseLibraryItem {
  id: string;
  canonical_name: string;
  localized_name?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  movement_pattern?: string | null;
  exercise_type?: string | null;
  difficulty?: string | null;
  primary_muscles?: MuscleInfo[];
  equipment?: EquipmentInfo[];
  is_custom?: boolean;
  is_deprecated?: boolean;
}

export interface PlanExerciseDraft {
  key: string;
  exerciseId: string;
  name: string;
  canonicalName: string;
  muscleLabels: string[];
  equipmentLabels: string[];
  sets: number;
  reps: string;
  /** Timed work (plank, jumping jacks…) counts down instead of counting reps. */
  durationSeconds: number | null;
  weightKg: number | null;
  rpe: number | null;
  restSeconds: number;
  tempo: string;
  instructions: string;
}

export interface PlanDayDraft {
  key: string;
  name: string;
  collapsed: boolean;
  /** `0 = شنبه … 6 = جمعه`. */
  weekday: number;
  /** Gregorian ISO date for exact-date plans; null in weekly plans. */
  scheduledDate: string | null;
  exercises: PlanExerciseDraft[];
}

export interface PlanDraft {
  clientId: string;
  name: string;
  goal: string;
  customGoal: string;
  startDate: string;
  durationWeeks: number;
  scheduleMode: ScheduleMode;
  days: PlanDayDraft[];
}

export interface DayValidation {
  name?: string;
  scheduledDate?: string;
}

export interface ExerciseValidation {
  sets?: string;
  reps?: string;
  durationSeconds?: string;
  weightKg?: string;
  rpe?: string;
  restSeconds?: string;
  tempo?: string;
}

export interface WorkoutValidation {
  form: { days?: string; schedule?: string };
  days: Record<string, DayValidation>;
  exercises: Record<string, ExerciseValidation>;
  issueCount: number;
  valid: boolean;
}

export interface DraftValidation extends WorkoutValidation {
  form: WorkoutValidation["form"] & {
    clientId?: string;
    name?: string;
    goal?: string;
    startDate?: string;
    durationWeeks?: string;
  };
}

let keyCounter = 0;

/** Stable local key for a draft row — never sent to the server. */
export function draftKey(prefix: string): string {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

export function exerciseDisplayName(item: ExerciseLibraryItem): string {
  return item.localized_name || item.canonical_name;
}

export function muscleLabels(item: ExerciseLibraryItem): string[] {
  return (item.primary_muscles ?? [])
    .map((muscle) => muscle.localized_name_fa || muscle.canonical_name)
    .filter(Boolean);
}

export function equipmentLabels(item: ExerciseLibraryItem): string[] {
  return (item.equipment ?? [])
    .map((equipment) => equipment.localized_name_fa || equipment.canonical_name)
    .filter(Boolean);
}

export function createExerciseDraft(item: ExerciseLibraryItem): PlanExerciseDraft {
  return {
    key: draftKey("ex"),
    exerciseId: item.id,
    name: exerciseDisplayName(item),
    canonicalName: item.canonical_name,
    muscleLabels: muscleLabels(item),
    equipmentLabels: equipmentLabels(item),
    sets: EXERCISE_DEFAULTS.sets,
    reps: EXERCISE_DEFAULTS.reps,
    durationSeconds: null,
    weightKg: null,
    rpe: null,
    restSeconds: EXERCISE_DEFAULTS.restSeconds,
    tempo: "",
    instructions: "",
  };
}

/** First weekday nobody uses, so two sessions never share a day. */
export function nextFreeWeekday(days: PlanDayDraft[]): number {
  const used = new Set(days.map((day) => day.weekday % 7));
  for (let index = 0; index < 7; index += 1) {
    if (!used.has(index)) return index;
  }
  return days.length % 7;
}

export function weekdayLabel(weekday: number | null | undefined): string {
  if (weekday === null || weekday === undefined) return "—";
  return WEEK_DAY_LABELS[((weekday % 7) + 7) % 7] ?? "—";
}

export function createDay(days: PlanDayDraft[]): PlanDayDraft {
  const weekday = nextFreeWeekday(days);
  return {
    key: draftKey("day"),
    name: WEEK_DAY_LABELS[weekday] ?? "روز تمرینی",
    collapsed: false,
    weekday,
    scheduledDate: null,
    exercises: [],
  };
}

export function duplicateDay(day: PlanDayDraft, weekday: number = day.weekday): PlanDayDraft {
  return {
    key: draftKey("day"),
    name: `${day.name} (کپی)`.slice(0, 128),
    collapsed: false,
    weekday,
    // A copied date would collide with the original in exact mode; the caller re-picks it.
    scheduledDate: null,
    exercises: day.exercises.map((exercise) => ({
      ...exercise,
      key: draftKey("ex"),
      muscleLabels: [...exercise.muscleLabels],
      equipmentLabels: [...exercise.equipmentLabels],
    })),
  };
}

export function duplicateExercise(exercise: PlanExerciseDraft): PlanExerciseDraft {
  return {
    ...exercise,
    key: draftKey("ex"),
    muscleLabels: [...exercise.muscleLabels],
    equipmentLabels: [...exercise.equipmentLabels],
  };
}

export function daysExerciseCount(days: PlanDayDraft[]): number {
  return days.reduce((total, day) => total + day.exercises.length, 0);
}

/** "8-10" → 9, "12" → 12, unparsable → 10 (the model default). */
export function averageReps(reps: string): number {
  const ascii = toAsciiDigits(String(reps || "")).replace(/[–—]/g, "-");
  const matches = ascii.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return 10;
  const numbers = matches.map(Number).filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return 10;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

/**
 * Rough session length: work at ~3.5s per rep (or the prescribed duration for
 * timed work) + prescribed rest between sets + 45s change-over per exercise.
 * Derived, never stored — the UI labels it as an estimate.
 */
export function estimateDaySeconds(day: PlanDayDraft): number {
  if (day.exercises.length === 0) return 0;
  let seconds = 0;
  for (const exercise of day.exercises) {
    const sets = Number.isFinite(exercise.sets) && exercise.sets > 0 ? exercise.sets : 0;
    if (sets === 0) continue;
    const workPerSet = exercise.durationSeconds
      ? exercise.durationSeconds
      : averageReps(exercise.reps) * 3.5;
    const work = sets * workPerSet;
    const rest = Math.max(sets - 1, 0) * Math.max(exercise.restSeconds || 0, 0);
    seconds += work + rest + 45;
  }
  return Math.round(seconds);
}

export function estimateDayMinutes(day: PlanDayDraft): number {
  const seconds = estimateDaySeconds(day);
  if (seconds === 0) return 0;
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

export function formatMinutes(minutes: number): string {
  if (!minutes) return "—";
  return `${toPersianDigits(minutes)} دقیقه`;
}

export function formatRest(seconds: number): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${toPersianDigits(seconds)} ثانیه`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder
    ? `${toPersianDigits(minutes)}:${toPersianDigits(String(remainder).padStart(2, "0"))} دقیقه`
    : `${toPersianDigits(minutes)} دقیقه`;
}

export function formatStartDate(iso: string, locale: "fa" | "en" = "fa"): string {
  if (!iso) return "—";
  return formatJalaliDate(iso, { locale, format: "medium" });
}

export function computeEndDate(startIso: string, weeks: number): string | null {
  if (!startIso || !weeks || weeks < 1) return null;
  const [year, month, day] = startIso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + weeks * 7 - 1);
  return date.toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function normalizeRepsInput(value: string): string {
  return toAsciiDigits(value)
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .slice(0, EXERCISE_LIMITS.repsMaxLength);
}

export function isRepsValueValid(value: string): boolean {
  const normalized = normalizeRepsInput(value);
  return /^\d{1,3}(-\d{1,3})?$/.test(normalized);
}

export function validateExerciseDraft(exercise: PlanExerciseDraft): ExerciseValidation {
  const errors: ExerciseValidation = {};
  if (!exercise.exerciseId) {
    errors.reps = "حرکت انتخاب نشده است.";
    return errors;
  }

  if (
    !Number.isInteger(exercise.sets) ||
    exercise.sets < EXERCISE_LIMITS.sets.min ||
    exercise.sets > EXERCISE_LIMITS.sets.max
  ) {
    errors.sets = `تعداد ست باید بین ${toPersianDigits(EXERCISE_LIMITS.sets.min)} تا ${toPersianDigits(EXERCISE_LIMITS.sets.max)} باشد.`;
  }

  if (exercise.durationSeconds !== null) {
    if (
      !Number.isFinite(exercise.durationSeconds) ||
      exercise.durationSeconds < EXERCISE_LIMITS.durationSeconds.min ||
      exercise.durationSeconds > EXERCISE_LIMITS.durationSeconds.max
    ) {
      errors.durationSeconds = `زمان حرکت باید بین ${toPersianDigits(
        EXERCISE_LIMITS.durationSeconds.min,
      )} تا ${toPersianDigits(EXERCISE_LIMITS.durationSeconds.max)} ثانیه باشد.`;
    }
  } else if (!isRepsValueValid(exercise.reps)) {
    errors.reps = "تکرارها را به صورت عدد یا بازه وارد کنید؛ مثلاً ۱۰ یا ۸-۱۲.";
  }

  if (exercise.weightKg !== null) {
    if (
      !Number.isFinite(exercise.weightKg) ||
      exercise.weightKg < EXERCISE_LIMITS.weightKg.min ||
      exercise.weightKg > EXERCISE_LIMITS.weightKg.max
    ) {
      errors.weightKg = `وزنه باید بین ۰ تا ${toPersianDigits(EXERCISE_LIMITS.weightKg.max)} کیلوگرم باشد.`;
    }
  }

  if (exercise.rpe !== null) {
    if (
      !Number.isFinite(exercise.rpe) ||
      exercise.rpe < EXERCISE_LIMITS.rpe.min ||
      exercise.rpe > EXERCISE_LIMITS.rpe.max
    ) {
      errors.rpe = "RPE باید عددی بین ۱ تا ۱۰ باشد.";
    }
  }

  if (
    !Number.isInteger(exercise.restSeconds) ||
    exercise.restSeconds < EXERCISE_LIMITS.restSeconds.min ||
    exercise.restSeconds > EXERCISE_LIMITS.restSeconds.max
  ) {
    errors.restSeconds = "استراحت باید بین ۰ تا ۳۶۰۰ ثانیه باشد.";
  }

  if (exercise.tempo.length > EXERCISE_LIMITS.tempoMaxLength) {
    errors.tempo = `تِمپو حداکثر ${toPersianDigits(EXERCISE_LIMITS.tempoMaxLength)} کاراکتر است.`;
  }

  return errors;
}

/**
 * Validate the workout workspace.
 *
 * `requireContent` separates "save" from "assign": a reusable plan may be stored
 * while it is still being built, but it can never be assigned until it has at
 * least one day and one exercise.
 */
export function validateWorkoutDays(
  days: PlanDayDraft[],
  options: { requireContent?: boolean; scheduleMode?: ScheduleMode } = {},
): WorkoutValidation {
  const scheduleMode = options.scheduleMode || "WEEKLY";
  const form: WorkoutValidation["form"] = {};
  const dayErrors: Record<string, DayValidation> = {};
  const exerciseErrors: Record<string, ExerciseValidation> = {};
  let issueCount = 0;

  if (days.length > MAX_TRAINING_DAYS) {
    form.days = `یک برنامه هفتگی حداکثر ${toPersianDigits(MAX_TRAINING_DAYS)} روز تمرینی دارد.`;
    issueCount += 1;
  }

  if (options.requireContent) {
    if (days.length === 0) {
      form.days = "برای ذخیره و تخصیص، حداقل یک روز تمرینی اضافه کنید.";
      issueCount += 1;
    } else if (daysExerciseCount(days) === 0) {
      form.days = "برای ذخیره و تخصیص، حداقل یک حرکت به روزهای تمرینی اضافه کنید.";
      issueCount += 1;
    }
  }

  const seenWeekdays = new Map<number, string>();
  const seenDates = new Map<string, string>();
  for (const day of days) {
    const label = day.name.trim() || "روز تمرینی";
    if (scheduleMode === "WEEKLY") {
      const clash = seenWeekdays.get(day.weekday);
      if (clash) {
        form.schedule = `«${label}» و «${clash}» هر دو روی ${weekdayLabel(day.weekday)} تنظیم شده‌اند؛ هر روز هفته فقط یک جلسه دارد.`;
        issueCount += 1;
        break;
      }
      seenWeekdays.set(day.weekday, label);
    } else if (day.scheduledDate) {
      const clash = seenDates.get(day.scheduledDate);
      if (clash) {
        form.schedule = `«${label}» و «${clash}» هر دو تاریخ ${formatStartDate(day.scheduledDate)} را دارند.`;
        issueCount += 1;
        break;
      }
      seenDates.set(day.scheduledDate, label);
    }
  }

  for (const day of days) {
    const errors: DayValidation = {};
    const dayName = day.name.trim();
    if (!dayName) {
      errors.name = "نام روز تمرینی را وارد کنید.";
    } else if (dayName.length > 128) {
      errors.name = "نام روز تمرینی حداکثر ۱۲۸ کاراکتر است.";
    }
    if (scheduleMode === "EXACT" && !day.scheduledDate) {
      errors.scheduledDate = "تاریخ این جلسه را انتخاب کنید.";
    }
    if (Object.keys(errors).length > 0) {
      dayErrors[day.key] = errors;
      issueCount += Object.keys(errors).length;
    }

    for (const exercise of day.exercises) {
      const rowErrors = validateExerciseDraft(exercise);
      if (Object.keys(rowErrors).length > 0) {
        exerciseErrors[exercise.key] = rowErrors;
        issueCount += Object.keys(rowErrors).length;
      }
    }
  }

  return { form, days: dayErrors, exercises: exerciseErrors, issueCount, valid: issueCount === 0 };
}

export function validateDraft(draft: PlanDraft, mode: SaveMode = "ACTIVE"): DraftValidation {
  const workout = validateWorkoutDays(draft.days, {
    requireContent: mode === "ACTIVE",
    scheduleMode: draft.scheduleMode,
  });
  const form: DraftValidation["form"] = { ...workout.form };
  let issueCount = workout.issueCount;

  if (!draft.clientId) {
    form.clientId = "ورزشکار هدف را انتخاب کنید.";
    issueCount += 1;
  }

  const trimmedName = draft.name.trim();
  if (!trimmedName) {
    if (mode === "ACTIVE") {
      form.name = "عنوان برنامه را وارد کنید.";
      issueCount += 1;
    }
  } else if (trimmedName.length > 255) {
    form.name = "عنوان برنامه حداکثر ۲۵۵ کاراکتر است.";
    issueCount += 1;
  }

  if (draft.goal === CUSTOM_GOAL) {
    const custom = draft.customGoal.trim();
    if (!custom && mode === "ACTIVE") {
      form.goal = "هدف تمرینی دوره را بنویسید یا یکی از گزینه‌های آماده را انتخاب کنید.";
      issueCount += 1;
    } else if (custom.length > 128) {
      form.goal = "هدف تمرینی حداکثر ۱۲۸ کاراکتر است.";
      issueCount += 1;
    }
  } else if (draft.goal.length > 128) {
    form.goal = "هدف تمرینی حداکثر ۱۲۸ کاراکتر است.";
    issueCount += 1;
  }

  if (draft.startDate && !isValidIsoDate(draft.startDate)) {
    form.startDate = "تاریخ شروع معتبر نیست.";
    issueCount += 1;
  }

  if (
    !Number.isInteger(draft.durationWeeks) ||
    draft.durationWeeks < 1 ||
    draft.durationWeeks > 52
  ) {
    form.durationWeeks = "مدت برنامه باید بین ۱ تا ۵۲ هفته باشد.";
    issueCount += 1;
  }

  return { ...workout, form, issueCount, valid: issueCount === 0 };
}

// ── API contract ────────────────────────────────────────────────────────────

export interface WorkoutExercisePayload {
  exercise: string;
  order_index: number;
  target_sets: number;
  target_reps: string;
  target_duration_seconds: number | null;
  target_weight_kg: number | null;
  target_rpe: number | null;
  rest_interval_seconds: number;
  tempo: string;
  coach_instructions: string;
}

export interface WorkoutDayPayload {
  day_number: number;
  name: string;
  order_index: number;
  /** `0 = شنبه … 6 = جمعه`; the server derives it from the date in EXACT mode. */
  weekday: number;
  scheduled_date: string | null;
  exercises: WorkoutExercisePayload[];
}

export interface PlanPayload {
  client_profile: string;
  name: string;
  goal: string;
  start_date?: string;
  end_date: string | null;
  schedule_mode: ScheduleMode;
  status: SaveMode;
  days: WorkoutDayPayload[];
}

/**
 * Serialize the workspace into the API write contract.
 *
 * `day_number`/`order_index` are derived from array position so the cycle stays
 * contiguous (1..7) and unique after any reorder, duplicate or delete. Days are
 * positional: روز ۱ lands on شنبه, روز ۲ on یکشنبه — no coach pins weekdays.
 */
export function serializeWorkoutDays(days: PlanDayDraft[]): WorkoutDayPayload[] {
  return days.map((day, dayIndex) => ({
    day_number: dayIndex + 1,
    name: day.name.trim() || `روز ${dayIndex + 1}`,
    order_index: dayIndex + 1,
    weekday: dayIndex % 7,
    scheduled_date: null,
    exercises: day.exercises.map((exercise, exerciseIndex) => ({
      exercise: exercise.exerciseId,
      order_index: exerciseIndex + 1,
      target_sets: exercise.sets,
      target_reps: isRepsValueValid(exercise.reps)
        ? normalizeRepsInput(exercise.reps)
        : EXERCISE_DEFAULTS.reps,
      target_duration_seconds: exercise.durationSeconds,
      target_weight_kg: exercise.weightKg,
      target_rpe: exercise.rpe,
      rest_interval_seconds: exercise.restSeconds,
      tempo: exercise.tempo.trim(),
      coach_instructions: exercise.instructions.trim(),
    })),
  }));
}

export function scheduledDates(days: PlanDayDraft[]): string[] {
  return days
    .map((day) => day.scheduledDate)
    .filter((value): value is string => Boolean(value))
    .sort();
}

export function serializePlanDraft(draft: PlanDraft, mode: SaveMode): PlanPayload {
  const dates = draft.scheduleMode === "EXACT" ? scheduledDates(draft.days) : [];
  const startDate = dates.length ? (dates[0] as string) : draft.startDate;
  const endDate = dates.length
    ? (dates[dates.length - 1] as string)
    : computeEndDate(draft.startDate, draft.durationWeeks);
  const goal = draft.goal === CUSTOM_GOAL ? draft.customGoal.trim() : draft.goal;

  return {
    client_profile: draft.clientId,
    name: draft.name.trim(),
    goal,
    start_date: startDate || undefined,
    end_date: endDate,
    schedule_mode: draft.scheduleMode,
    status: mode,
    days: serializeWorkoutDays(draft.days),
  };
}

export interface ApiWorkoutExercise {
  id?: string;
  exercise: string | { id: string; canonical_name?: string; localized_name?: string };
  exercise_name?: string;
  order_index: number;
  target_sets: number;
  target_reps: string;
  target_duration_seconds?: number | null;
  target_weight_kg?: number | null;
  target_rpe?: number | null;
  rest_interval_seconds: number;
  tempo?: string;
  coach_instructions?: string;
}

export interface ApiWorkoutDay {
  id?: string;
  day_number: number;
  name: string;
  order_index: number;
  weekday?: number | null;
  scheduled_date?: string | null;
  exercises: ApiWorkoutExercise[];
}

/**
 * Read a stored day back into an editable draft.
 *
 * Tolerates the payload differences the API has carried over time: `exercise`
 * may be an id or an expanded object, and instructions may be newline-joined.
 */
export function hydrateWorkoutDays(apiDays: ApiWorkoutDay[]): PlanDayDraft[] {
  return [...(apiDays ?? [])]
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((day, dayIndex) => ({
      key: draftKey("day"),
      name: day.name || `روز ${dayIndex + 1}`,
      collapsed: true,
      weekday: typeof day.weekday === "number" ? day.weekday % 7 : dayIndex % 7,
      scheduledDate: day.scheduled_date ?? null,
      exercises: [...(day.exercises ?? [])]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((row) => {
          const expanded = typeof row.exercise === "object" ? row.exercise : null;
          const id = expanded?.id ?? String(row.exercise ?? "");
          const canonical = expanded?.canonical_name ?? row.exercise_name ?? "حرکت";
          return {
            key: draftKey("ex"),
            exerciseId: id,
            name: expanded?.localized_name || canonical,
            canonicalName: canonical,
            muscleLabels: [],
            equipmentLabels: [],
            sets: row.target_sets ?? EXERCISE_DEFAULTS.sets,
            reps: row.target_reps ?? EXERCISE_DEFAULTS.reps,
            durationSeconds: row.target_duration_seconds ?? null,
            weightKg: row.target_weight_kg ?? null,
            rpe: row.target_rpe ?? null,
            restSeconds: row.rest_interval_seconds ?? EXERCISE_DEFAULTS.restSeconds,
            tempo: row.tempo ?? "",
            instructions: row.coach_instructions ?? "",
          } satisfies PlanExerciseDraft;
        }),
    }));
}

export function goalLabel(goal: string, customGoal = ""): string {
  if (!goal) return "—";
  if (goal === CUSTOM_GOAL) return customGoal || "هدف اختصاصی";
  return PROGRAM_GOALS.find((entry) => entry.value === goal)?.label ?? goal;
}

/** First field error inside a DRF error body, for an inline banner. */
export function firstApiFieldError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const body = err as Record<string, unknown>;
  const fieldErrors = body.field_errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const value of Object.values(fieldErrors as Record<string, unknown>)) {
      if (typeof value === "string" && value) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (value && typeof value === "object") {
        const fa = (value as { fa?: string }).fa;
        if (fa) return fa;
      }
    }
  }
  return null;
}
