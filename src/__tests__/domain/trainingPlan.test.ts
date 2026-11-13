import {
  EXERCISE_DEFAULTS,
  createDay,
  createExerciseDraft,
  hydrateWorkoutDays,
  isRepsValueValid,
  normalizeRepsInput,
  serializeWorkoutDays,
  validateDraft,
  validateWorkoutDays,
  type ExerciseLibraryItem,
  type PlanDayDraft,
  type PlanExerciseDraft,
} from "@bashgino/domain";

const item: ExerciseLibraryItem = {
  id: "ex-1",
  canonical_name: "Barbell Bench Press",
  localized_name: "پرس سینه هالتر",
  primary_muscles: [{ id: "m1", canonical_name: "Chest", localized_name_fa: "سینه" }],
  equipment: [{ id: "e1", canonical_name: "Barbell", localized_name_fa: "هالتر" }],
};

function exercise(overrides: Partial<PlanExerciseDraft> = {}): PlanExerciseDraft {
  return { ...createExerciseDraft(item), ...overrides };
}

function day(overrides: Partial<PlanDayDraft> = {}): PlanDayDraft {
  return {
    key: "day-1",
    name: "سینه و پشت بازو",
    collapsed: false,
    weekday: 0,
    scheduledDate: null,
    exercises: [exercise()],
    ...overrides,
  };
}

describe("training plan contract", () => {
  it("derives day_number and order_index from array position", () => {
    const days = [day({ name: "اول" }), day({ key: "day-2", name: "دوم", weekday: 1 })];
    const payload = serializeWorkoutDays(days);

    expect(payload.map((row) => row.day_number)).toEqual([1, 2]);
    expect(payload.map((row) => row.order_index)).toEqual([1, 2]);
    // Days are positional: the first day trains on Saturday whatever it is called.
    expect(payload.map((row) => row.weekday)).toEqual([0, 1]);
    expect(payload[0]?.name).toBe("اول");
  });

  it("keeps the serialized exercise shape the API validates", () => {
    const payload = serializeWorkoutDays([day()]);
    expect(payload[0]?.exercises[0]).toMatchObject({
      exercise: "ex-1",
      order_index: 1,
      target_sets: EXERCISE_DEFAULTS.sets,
      target_reps: EXERCISE_DEFAULTS.reps,
      rest_interval_seconds: EXERCISE_DEFAULTS.restSeconds,
    });
  });

  it("falls back to the default rep range instead of sending an invalid one", () => {
    const payload = serializeWorkoutDays([day({ exercises: [exercise({ reps: "خیلی زیاد" })] })]);
    expect(payload[0]?.exercises[0]?.target_reps).toBe(EXERCISE_DEFAULTS.reps);
  });

  it("rejects out-of-range prescriptions", () => {
    const validation = validateWorkoutDays([
      day({ exercises: [exercise({ sets: 0, restSeconds: 9999, rpe: 12 })] }),
    ]);
    expect(validation.valid).toBe(false);
    expect(Object.keys(validation.exercises)).toHaveLength(1);
    const [errors] = Object.values(validation.exercises);
    expect(errors).toMatchObject({
      sets: expect.any(String),
      restSeconds: expect.any(String),
      rpe: expect.any(String),
    });
  });

  it("requires content only when the plan is being assigned", () => {
    const empty = [day({ exercises: [] })];
    expect(validateWorkoutDays(empty).valid).toBe(true);
    expect(validateWorkoutDays(empty, { requireContent: true }).valid).toBe(false);
  });

  it("refuses two days on the same weekday in weekly mode", () => {
    const validation = validateWorkoutDays([
      day({ key: "a", name: "روز الف", weekday: 2 }),
      day({ key: "b", name: "روز ب", weekday: 2 }),
    ]);
    expect(validation.form.schedule).toContain("دوشنبه");
  });

  it("requires a date for every day in exact mode", () => {
    const validation = validateWorkoutDays([day({ scheduledDate: null })], { scheduleMode: "EXACT" });
    expect(validation.days["day-1"]?.scheduledDate).toBeTruthy();
  });

  it("normalises Persian digits and dashes in reps", () => {
    expect(normalizeRepsInput("۱۰–۱۲")).toBe("10-12");
    expect(isRepsValueValid("۸-۱۲")).toBe(true);
    expect(isRepsValueValid("8 تا 12")).toBe(false);
  });

  it("assigns a free weekday to a new day", () => {
    const first = createDay([]);
    const second = createDay([first]);
    expect(first.weekday).toBe(0);
    expect(second.weekday).toBe(1);
    expect(second.name).toBe("یکشنبه");
  });

  it("validates the whole draft for assignment", () => {
    const draft = {
      clientId: "",
      name: "",
      goal: "",
      customGoal: "",
      startDate: "",
      durationWeeks: 0,
      scheduleMode: "WEEKLY" as const,
      days: [],
    };
    const validation = validateDraft(draft, "ACTIVE");
    expect(validation.valid).toBe(false);
    expect(validation.form.clientId).toBeTruthy();
    expect(validation.form.name).toBeTruthy();
    expect(validation.form.durationWeeks).toBeTruthy();
  });

  it("hydrates stored days with expanded or bare exercise references", () => {
    const hydrated = hydrateWorkoutDays([
      {
        id: "d1",
        day_number: 1,
        name: "روز اول",
        order_index: 1,
        weekday: 0,
        scheduled_date: null,
        exercises: [
          {
            exercise: { id: "ex-9", canonical_name: "Squat", localized_name: "اسکوات" },
            order_index: 1,
            target_sets: 4,
            target_reps: "6-8",
            rest_interval_seconds: 120,
          },
          {
            exercise: "ex-10",
            exercise_name: "Deadlift",
            order_index: 2,
            target_sets: 3,
            target_reps: "5",
            rest_interval_seconds: 150,
          },
        ],
      },
    ]);

    expect(hydrated[0]?.exercises.map((row) => row.name)).toEqual(["اسکوات", "Deadlift"]);
    expect(hydrated[0]?.exercises[1]?.exerciseId).toBe("ex-10");
    expect(hydrated[0]?.exercises[0]?.sets).toBe(4);
  });
});
