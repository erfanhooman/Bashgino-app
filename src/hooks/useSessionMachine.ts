import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import {
  buildSessionLog,
  completedCountOf,
  createSession,
  currentExerciseOf,
  currentRepsOf,
  currentStepOf,
  elapsedSecondsOf,
  firstStepIndexOf,
  nextStepOf,
  progressOf,
  sessionReducer,
  stepKey,
  type FlowExercise,
  type SessionAction,
  type SessionState,
} from "@bashgino/domain";

/**
 * React binding for the pure session machine.
 *
 * The reducer owns every transition; this hook only supplies the once-a-second
 * tick and the derived values the screen renders. Keeping the timer here (and
 * not in the screen) means a re-render cannot reset the countdown.
 */
export function useSessionMachine(exercises: FlowExercise[]) {
  const initial = useMemo(() => createSession(exercises), [exercises]);
  const [state, dispatch] = useReducer(
    (current: SessionState, action: SessionAction) => sessionReducer(current, action, exercises),
    initial,
  );
  const [now, setNow] = useState(() => Date.now());

  // One interval for the whole session: rest counts down, timed work counts down,
  // and the elapsed clock follows the same beat.
  useEffect(() => {
    if (state.phase === "finish") return;
    const active = state.phase === "rest" || state.running;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (active) dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.phase, state.running]);

  const confirm = useCallback(() => dispatch({ type: "confirm" }), []);
  const skipSet = useCallback(() => dispatch({ type: "skipSet" }), []);
  const previous = useCallback(() => dispatch({ type: "previous" }), []);
  const skipRest = useCallback(() => dispatch({ type: "skipRest" }), []);
  const addRest = useCallback((seconds: number) => dispatch({ type: "addRest", seconds }), []);
  const adjustReps = useCallback((delta: number) => dispatch({ type: "adjustReps", delta }), []);
  const toggleTimer = useCallback(() => dispatch({ type: "toggleTimer" }), []);
  const resetTimer = useCallback(() => dispatch({ type: "resetTimer" }), []);
  const finish = useCallback(() => dispatch({ type: "finish" }), []);

  const currentExercise = currentExerciseOf(state, exercises);
  const currentStep = currentStepOf(state);
  const next = nextStepOf(state);
  const nextExercise = next ? exercises[next.exerciseIndex] ?? null : null;

  const jumpToStep = useCallback((stepIndex: number) => dispatch({ type: "jumpTo", index: stepIndex }), []);
  const jumpToExercise = useCallback(
    (exerciseIndex: number) => dispatch({ type: "jumpTo", index: firstStepIndexOf(state.steps, exerciseIndex) }),
    [state.steps],
  );

  return {
    state,
    exercises,
    currentStep,
    currentExercise,
    nextStep: next,
    nextExercise,
    isTimed: Boolean(currentExercise?.durationSeconds),
    currentReps: currentRepsOf(state),
    completedCount: completedCountOf(state),
    progress: progressOf(state),
    elapsedSeconds: elapsedSecondsOf(state, now),
    isCurrentCompleted: currentStep ? Boolean(state.completed[stepKey(currentStep)]) : false,
    log: buildSessionLog(state, exercises),
    confirm,
    skipSet,
    previous,
    skipRest,
    addRest,
    adjustReps,
    toggleTimer,
    resetTimer,
    finish,
    jumpToStep,
    jumpToExercise,
  };
}
