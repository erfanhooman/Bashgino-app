/**
 * Guided-workout state machine.
 *
 * Lifted from the web session player (`frontend/src/hooks/useWorkoutSession.ts`)
 * and made pure so the same transitions run on both platforms and can be tested
 * without a renderer or a timer.
 *
 * The flow is a flat list of sets, and every transition goes through the
 * reducer — that is what keeps the countdown and the visible step from
 * disagreeing:
 *
 *   work ──confirm──▶ rest ──0s / skip──▶ next work ──…──▶ finish
 *
 * A timed set arms its countdown on entry and confirms itself at zero; a rep set
 * waits for the trainee. Rest auto-starts after each completed set.
 */

export interface FlowExercise {
  exerciseId: string;
  name: string;
  canonicalName: string;
  /** Ordered illustrations: [start, peak, …]. */
  frames: string[];
  targetSets: number;
  reps: string;
  durationSeconds: number | null;
  restSeconds: number;
  instructions: string;
  weightKg: number | null;
}

export interface FlowStep {
  exerciseIndex: number;
  setNumber: number;
}

export type SessionPhase = "work" | "rest" | "finish";

export interface SessionState {
  steps: FlowStep[];
  stepIndex: number;
  phase: SessionPhase;
  completed: Record<string, true>;
  reps: Record<string, number>;
  restRemaining: number;
  restTotal: number;
  workRemaining: number;
  running: boolean;
  startedAt: string;
}

export type SessionAction =
  | { type: "tick" }
  | { type: "confirm" }
  | { type: "skipSet" }
  | { type: "previous" }
  | { type: "skipRest" }
  | { type: "addRest"; seconds: number }
  | { type: "adjustReps"; delta: number }
  | { type: "toggleTimer" }
  | { type: "resetTimer" }
  | { type: "jumpTo"; index: number }
  | { type: "finish" };

export function stepKey(step: FlowStep): string {
  return `${step.exerciseIndex}:${step.setNumber}`;
}

/** Lower bound of a rep target ("8-12" → 8); 10 when the coach left it blank. */
export function repsFromTarget(target: string | null | undefined): number {
  const match = String(target ?? "").match(/\d+/);
  const value = match ? Number(match[0]) : 10;
  return Math.min(99, Math.max(1, value));
}

/** Sets are clamped to the API's 1..50 so a bad payload cannot hang the flow. */
export function buildSteps(exercises: FlowExercise[]): FlowStep[] {
  const steps: FlowStep[] = [];
  exercises.forEach((exercise, exerciseIndex) => {
    const sets = Math.max(1, Math.min(exercise.targetSets || 1, 50));
    for (let setNumber = 1; setNumber <= sets; setNumber += 1) {
      steps.push({ exerciseIndex, setNumber });
    }
  });
  return steps;
}

/** The session-list sheet takes an *exercise* index; the machine takes a *step* index. */
export function firstStepIndexOf(steps: FlowStep[], exerciseIndex: number): number {
  const index = steps.findIndex((step) => step.exerciseIndex === exerciseIndex);
  return index < 0 ? 0 : index;
}

export function createSession(exercises: FlowExercise[], startedAt?: string): SessionState {
  const steps = buildSteps(exercises);
  const reps: Record<string, number> = {};
  for (const step of steps) {
    reps[stepKey(step)] = repsFromTarget(exercises[step.exerciseIndex]?.reps);
  }
  const first = exercises[0];
  const firstDuration = first?.durationSeconds ?? null;
  return {
    steps,
    stepIndex: 0,
    phase: steps.length ? "work" : "finish",
    completed: {},
    reps,
    restRemaining: 0,
    restTotal: 0,
    workRemaining: firstDuration ?? 0,
    // A timed first set arms itself on entry, exactly like one reached mid-flow.
    running: Boolean(firstDuration),
    startedAt: startedAt ?? new Date().toISOString(),
  };
}

function armStep(state: SessionState, index: number, exercises: FlowExercise[]): SessionState {
  const target = state.steps[index];
  if (!target) {
    return { ...state, phase: "finish", running: false, workRemaining: 0, restRemaining: 0 };
  }
  const duration = exercises[target.exerciseIndex]?.durationSeconds ?? null;
  return {
    ...state,
    stepIndex: index,
    phase: "work",
    workRemaining: duration ?? 0,
    running: Boolean(duration),
    restRemaining: 0,
  };
}

function restAfter(state: SessionState, nextIndex: number, restSeconds: number, exercises: FlowExercise[]): SessionState {
  if (restSeconds <= 0) return armStep(state, nextIndex, exercises);
  return {
    ...state,
    phase: "rest",
    restRemaining: restSeconds,
    restTotal: restSeconds,
    running: false,
  };
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
  exercises: FlowExercise[],
): SessionState {
  const current = state.steps[state.stepIndex] ?? null;
  const currentExercise = current ? exercises[current.exerciseIndex] : undefined;
  const isTimed = Boolean(currentExercise?.durationSeconds);

  switch (action.type) {
    case "tick": {
      if (state.phase === "rest" && state.restRemaining > 0) {
        if (state.restRemaining <= 1) return armStep(state, state.stepIndex + 1, exercises);
        return { ...state, restRemaining: state.restRemaining - 1 };
      }
      if (state.phase === "work" && state.running && state.workRemaining > 0) {
        if (state.workRemaining <= 1) {
          // Timed work confirms itself at zero.
          return sessionReducer(state, { type: "confirm" }, exercises);
        }
        return { ...state, workRemaining: state.workRemaining - 1 };
      }
      return state;
    }

    case "confirm": {
      if (!current) return state;
      const key = stepKey(current);
      const completed = state.completed[key] ? state.completed : { ...state.completed, [key]: true as const };
      const next: SessionState = { ...state, completed, running: false };
      if (state.stepIndex + 1 >= state.steps.length) {
        return { ...next, phase: "finish", workRemaining: 0, restRemaining: 0 };
      }
      return restAfter(next, state.stepIndex + 1, Math.max(0, currentExercise?.restSeconds ?? 0), exercises);
    }

    case "skipSet":
      return armStep({ ...state, running: false }, state.stepIndex + 1, exercises);

    case "previous":
      if (state.stepIndex === 0) return state;
      return armStep(state, state.stepIndex - 1, exercises);

    case "skipRest":
      return armStep(state, state.stepIndex + 1, exercises);

    case "addRest": {
      const restRemaining = Math.max(0, state.restRemaining + action.seconds);
      return {
        ...state,
        restRemaining,
        restTotal: Math.max(state.restTotal, restRemaining),
      };
    }

    case "adjustReps": {
      if (!current) return state;
      const key = stepKey(current);
      const value = Math.min(99, Math.max(0, (state.reps[key] ?? 10) + action.delta));
      return { ...state, reps: { ...state.reps, [key]: value } };
    }

    case "toggleTimer": {
      if (!isTimed) return state;
      if (state.workRemaining <= 0) {
        return { ...state, workRemaining: currentExercise?.durationSeconds ?? 0, running: true };
      }
      return { ...state, running: !state.running };
    }

    case "resetTimer":
      if (!isTimed) return state;
      return { ...state, workRemaining: currentExercise?.durationSeconds ?? 0, running: true };

    case "jumpTo": {
      const clamped = Math.min(Math.max(0, action.index), Math.max(0, state.steps.length - 1));
      return armStep(state, clamped, exercises);
    }

    case "finish":
      return { ...state, phase: "finish", running: false, workRemaining: 0, restRemaining: 0 };

    default:
      return state;
  }
}

// ── Selectors ───────────────────────────────────────────────────────────────

export function currentStepOf(state: SessionState): FlowStep | null {
  return state.steps[state.stepIndex] ?? null;
}

export function currentExerciseOf(state: SessionState, exercises: FlowExercise[]): FlowExercise | null {
  const step = currentStepOf(state);
  return step ? exercises[step.exerciseIndex] ?? null : null;
}

export function nextStepOf(state: SessionState): FlowStep | null {
  return state.steps[state.stepIndex + 1] ?? null;
}

export function completedCountOf(state: SessionState): number {
  return Object.keys(state.completed).length;
}

export function progressOf(state: SessionState): number {
  if (!state.steps.length) return 0;
  return Math.round((completedCountOf(state) / state.steps.length) * 100);
}

export function currentRepsOf(state: SessionState): number {
  const step = currentStepOf(state);
  return step ? state.reps[stepKey(step)] ?? 10 : 10;
}

/** Seconds since the session started — the header clock. */
export function elapsedSecondsOf(state: SessionState, now: number = Date.now()): number {
  const started = new Date(state.startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

export interface LoggedSet {
  exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight_kg: number | null;
  actual_duration_seconds: number | null;
  is_completed: true;
}

/**
 * Turn the finished session into the API payload.
 *
 * Only confirmed sets are logged: a skipped set is a set the trainee did not do,
 * and inventing a row for it would corrupt their history and volume totals.
 */
export function buildSessionLog(state: SessionState, exercises: FlowExercise[]): LoggedSet[] {
  return state.steps
    .filter((step) => state.completed[stepKey(step)])
    .map((step) => {
      const exercise = exercises[step.exerciseIndex];
      const timed = Boolean(exercise?.durationSeconds);
      return {
        exercise_id: exercise?.exerciseId ?? "",
        set_number: step.setNumber,
        actual_reps: timed ? null : state.reps[stepKey(step)] ?? null,
        actual_weight_kg: exercise?.weightKg ?? null,
        actual_duration_seconds: timed ? exercise?.durationSeconds ?? null : null,
        is_completed: true as const,
      };
    });
}
