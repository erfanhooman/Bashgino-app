/**
 * Reusable training-plan templates — the coach's library contract.
 *
 * Mirrors `frontend/src/lib/planTemplates.ts` so a plan saved on the phone and a
 * plan saved on the web are byte-identical documents, and an error message the
 * coach sees does not depend on which client they used.
 */
import { toAsciiDigits } from "./jalali";
import {
  CUSTOM_GOAL,
  type ApiWorkoutDay,
  type PlanDayDraft,
  type ScheduleMode,
  type WorkoutDayPayload,
  hydrateWorkoutDays,
  serializeWorkoutDays,
} from "./trainingPlan";

export { CUSTOM_GOAL };
export const TEMPLATE_DESCRIPTION_MAX = 2000;
export const TEMPLATE_GOAL_MAX = 128;

/** The goals the product offers as chips before "custom" is needed. */
export const TRAINING_GOALS: string[] = [
  "STRENGTH",
  "HYPERTROPHY",
  "WEIGHT_LOSS",
  "ENDURANCE",
  "MOBILITY",
  "GENERAL_FITNESS",
];

export interface PlanTemplateMetaDraft {
  name: string;
  goal: string;
  customGoal: string;
  description: string;
}

export function emptyTemplateMeta(): PlanTemplateMetaDraft {
  return { name: "", goal: "", customGoal: "", description: "" };
}

/** A stored goal that is not one of the presets becomes the custom value. */
export function hydrateTemplateMeta(source: {
  name?: string;
  goal?: string | null;
  description?: string | null;
}): PlanTemplateMetaDraft {
  const stored = (source.goal ?? "").trim();
  if (stored && !TRAINING_GOALS.includes(stored)) {
    return { name: source.name ?? "", goal: CUSTOM_GOAL, customGoal: stored, description: source.description ?? "" };
  }
  return {
    name: source.name ?? "",
    goal: stored,
    customGoal: "",
    description: source.description ?? "",
  };
}

export function templateGoalValue(meta: PlanTemplateMetaDraft): string {
  return meta.goal === CUSTOM_GOAL ? meta.customGoal.trim() : meta.goal.trim();
}

export interface TemplateMetaValidation {
  name?: string;
  goal?: string;
  description?: string;
  valid: boolean;
}

export function validateTemplateMeta(draft: PlanTemplateMetaDraft): TemplateMetaValidation {
  const errors: { name?: string; goal?: string; description?: string } = {};

  const name = draft.name.trim();
  if (!name) errors.name = "عنوان برنامه را وارد کنید.";
  else if (name.length > 255) errors.name = "عنوان برنامه حداکثر ۲۵۵ کاراکتر است.";

  if (draft.goal === CUSTOM_GOAL) {
    const custom = draft.customGoal.trim();
    if (!custom) {
      errors.goal = "متن هدف دلخواه را بنویسید یا یکی از گزینه‌های آماده را انتخاب کنید.";
    } else if (custom.length > TEMPLATE_GOAL_MAX) {
      errors.goal = "هدف تمرینی حداکثر ۱۲۸ کاراکتر است.";
    }
  } else if (draft.goal.length > TEMPLATE_GOAL_MAX) {
    errors.goal = "هدف تمرینی حداکثر ۱۲۸ کاراکتر است.";
  }

  if (draft.description.trim().length > TEMPLATE_DESCRIPTION_MAX) {
    errors.description = `توضیح برنامه حداکثر ${toAsciiDigits(String(TEMPLATE_DESCRIPTION_MAX))} کاراکتر است.`;
  }

  return { ...errors, valid: Object.keys(errors).length === 0 };
}

export interface PlanTemplatePayload {
  name: string;
  goal: string;
  description: string;
  schedule_mode: ScheduleMode;
  days: WorkoutDayPayload[];
}

/** Draft → API document for a reusable template. */
export function buildTemplatePayload(
  meta: PlanTemplateMetaDraft,
  days: PlanDayDraft[],
  scheduleMode: ScheduleMode = "WEEKLY",
): PlanTemplatePayload {
  return {
    name: meta.name.trim(),
    goal: templateGoalValue(meta),
    description: meta.description.trim(),
    schedule_mode: scheduleMode,
    days: serializeWorkoutDays(days),
  };
}

export function templateScheduleMode(template?: { schedule_mode?: string | null } | null): ScheduleMode {
  return template?.schedule_mode === "EXACT" ? "EXACT" : "WEEKLY";
}

export function hydrateTemplateDays(template: { days?: unknown[] | null }): PlanDayDraft[] {
  return hydrateWorkoutDays((template.days ?? []) as ApiWorkoutDay[]);
}

export function templateExerciseIds(template: { days?: unknown[] | null }): string[] {
  const days = (template.days ?? []) as ApiWorkoutDay[];
  const ids: string[] = [];
  for (const day of days) {
    for (const row of day.exercises ?? []) {
      const value = typeof row.exercise === "object" ? row.exercise?.id : row.exercise;
      if (typeof value === "string" && value) ids.push(value);
    }
  }
  return Array.from(new Set(ids));
}

/** Which trainees a save would add / remove, for the change summary. */
export function assignmentDiff(
  current: string[],
  next: string[],
): { added: string[]; removed: string[] } {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return {
    added: next.filter((id) => !currentSet.has(id)),
    removed: current.filter((id) => !nextSet.has(id)),
  };
}
