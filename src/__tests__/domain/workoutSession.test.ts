import {
  buildSessionLog,
  completedCountOf,
  createSession,
  currentExerciseOf,
  currentRepsOf,
  firstStepIndexOf,
  progressOf,
  repsFromTarget,
  sessionReducer,
  stepKey,
  type FlowExercise,
  type SessionAction,
  type SessionState,
} from "@bashgino/domain";

function exercise(overrides: Partial<FlowExercise> = {}): FlowExercise {
  return {
    exerciseId: "ex-1",
    name: "پرس سینه",
    canonicalName: "Bench Press",
    frames: [],
    targetSets: 2,
    reps: "10-12",
    durationSeconds: null,
    restSeconds: 60,
    instructions: "",
    weightKg: null,
    ...overrides,
  };
}

const run = (state: SessionState, actions: SessionAction[], exercises: FlowExercise[]) =>
  actions.reduce((current, action) => sessionReducer(current, action, exercises), state);

describe("workout session machine", () => {
  it("builds one step per set", () => {
    const exercises = [exercise({ targetSets: 3 }), exercise({ exerciseId: "ex-2", targetSets: 2 })];
    const state = createSession(exercises);
    expect(state.steps).toHaveLength(5);
    expect(state.steps[0]).toEqual({ exerciseIndex: 0, setNumber: 1 });
    expect(state.steps[4]).toEqual({ exerciseIndex: 1, setNumber: 2 });
  });

  it("starts in work with the first exercise", () => {
    const exercises = [exercise()];
    const state = createSession(exercises);
    expect(state.phase).toBe("work");
    expect(currentExerciseOf(state, exercises)?.name).toBe("پرس سینه");
    expect(currentRepsOf(state)).toBe(10);
  });

  it("moves to rest after confirming a set and then to the next set", () => {
    const exercises = [exercise({ restSeconds: 3 })];
    let state = createSession(exercises);

    state = run(state, [{ type: "confirm" }], exercises);
    expect(state.phase).toBe("rest");
    expect(state.restRemaining).toBe(3);
    expect(completedCountOf(state)).toBe(1);

    state = run(state, [{ type: "tick" }, { type: "tick" }], exercises);
    expect(state.phase).toBe("rest");
    expect(state.restRemaining).toBe(1);

    state = run(state, [{ type: "tick" }], exercises);
    expect(state.phase).toBe("work");
    expect(state.stepIndex).toBe(1);
  });

  it("skips rest on demand", () => {
    const exercises = [exercise()];
    let state = createSession(exercises);
    state = run(state, [{ type: "confirm" }, { type: "skipRest" }], exercises);
    expect(state.phase).toBe("work");
    expect(state.stepIndex).toBe(1);
  });

  it("adds rest time without shrinking the ring", () => {
    const exercises = [exercise({ restSeconds: 30 })];
    let state = createSession(exercises);
    state = run(state, [{ type: "confirm" }], exercises);
    state = run(state, [{ type: "addRest", seconds: 20 }], exercises);
    expect(state.restRemaining).toBe(50);
    expect(state.restTotal).toBe(50);
  });

  it("auto-confirms timed work at zero", () => {
    const exercises = [exercise({ targetSets: 1, durationSeconds: 3 })];
    let state = createSession(exercises);
    expect(state.phase).toBe("work");
    expect(state.running).toBe(true);
    expect(state.workRemaining).toBe(3);

    state = run(state, [{ type: "tick" }, { type: "tick" }, { type: "tick" }], exercises);
    expect(completedCountOf(state)).toBe(1);
    // No rest after the last set: the session is done.
    expect(state.phase).toBe("finish");
  });

  it("skips a set without recording it", () => {
    const exercises = [exercise({ targetSets: 2, restSeconds: 0 })];
    let state = createSession(exercises);
    state = run(state, [{ type: "skipSet" }], exercises);
    expect(state.stepIndex).toBe(1);
    expect(completedCountOf(state)).toBe(0);
    expect(buildSessionLog(state, exercises)).toHaveLength(0);
  });

  it("never lets the rep counter go below zero or above 99", () => {
    const exercises = [exercise()];
    let state = createSession(exercises);
    state = run(state, [{ type: "adjustReps", delta: -50 }], exercises);
    expect(currentRepsOf(state)).toBe(0);
    state = run(state, [{ type: "adjustReps", delta: 500 }], exercises);
    expect(currentRepsOf(state)).toBe(99);
  });

  it("finishes after the last set of the last exercise", () => {
    const exercises = [exercise({ targetSets: 1, restSeconds: 0 })];
    let state = createSession(exercises);
    state = run(state, [{ type: "confirm" }], exercises);
    expect(state.phase).toBe("finish");
    expect(progressOf(state)).toBe(100);
  });

  it("logs only the sets that were actually done", () => {
    const exercises = [exercise({ targetSets: 2, restSeconds: 0 })];
    let state = createSession(exercises);
    state = run(state, [{ type: "confirm" }], exercises);
    state = run(state, [{ type: "skipSet" }], exercises);
    const log = buildSessionLog(state, exercises);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ exercise_id: "ex-1", set_number: 1, is_completed: true });
  });

  it("maps an exercise index onto its first step", () => {
    const exercises = [exercise({ targetSets: 2 }), exercise({ exerciseId: "ex-2", targetSets: 2 })];
    const state = createSession(exercises);
    expect(firstStepIndexOf(state.steps, 0)).toBe(0);
    expect(firstStepIndexOf(state.steps, 1)).toBe(2);
  });

  it("reads the rep target's lower bound, defaulting to ten", () => {
    expect(repsFromTarget("8-12")).toBe(8);
    expect(repsFromTarget("15")).toBe(15);
    expect(repsFromTarget(null)).toBe(10);
    expect(repsFromTarget("")).toBe(10);
  });

  it("uses a stable key per step", () => {
    expect(stepKey({ exerciseIndex: 1, setNumber: 3 })).toBe("1:3");
  });
});
