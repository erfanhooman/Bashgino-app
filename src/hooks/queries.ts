/**
 * Data hooks.
 *
 * Each hook takes the active workspace id explicitly instead of reading the
 * store inside, so a screen can pass a coach's own org id (the admin roster
 * does) and the cache key stays honest.
 */
import { useQuery } from "@tanstack/react-query";

import type {
  AppNotification,
  ClientDetail,
  ClientProfile,
  DashboardSummary,
  PlanTemplate,
  TodayWorkout,
  TrainingPlan,
  WorkoutDayDetail,
  WorkoutSchedule,
  WorkoutSessionSummary,
  NutritionTemplate,
  NutritionTemplateDetail,
  NutritionPlan,
  ExerciseListItem,
} from "@bashgino/types";


import * as api from "@/services/api/endpoints";
import { qk } from "@/services/query";

export function useDashboardSummary(orgId: string | null) {
  return useQuery<DashboardSummary>({
    queryKey: qk.dashboard(orgId),
    queryFn: () => api.getDashboardSummary(orgId as string),
    enabled: Boolean(orgId),
  });
}

export function useClients(orgId: string | null) {
  return useQuery<ClientProfile[]>({
    queryKey: qk.clients(orgId),
    queryFn: () => api.getClients(orgId as string),
    enabled: Boolean(orgId),
  });
}

export function useClientDetail(orgId: string | null, clientId: string | undefined) {
  return useQuery<ClientDetail>({
    queryKey: qk.client(orgId, clientId ?? ""),
    queryFn: () => api.getClientDetail(orgId as string, clientId as string),
    enabled: Boolean(orgId && clientId),
  });
}

export function usePlanTemplates(orgId: string | null) {
  return useQuery<PlanTemplate[]>({
    queryKey: qk.planTemplates(orgId),
    queryFn: () => api.getPlanTemplates(orgId as string),
    enabled: Boolean(orgId),
  });
}

export function usePlanTemplate(orgId: string | null, templateId: string | undefined) {
  return useQuery<PlanTemplate>({
    queryKey: qk.planTemplate(orgId, templateId ?? ""),
    queryFn: () => api.getPlanTemplateDetail(orgId as string, templateId as string),
    enabled: Boolean(orgId && templateId),
  });
}

export function useTrainingPlans(orgId: string | null) {
  return useQuery<TrainingPlan[]>({
    queryKey: qk.trainingPlans(orgId),
    queryFn: () => api.getTrainingPlans(orgId as string),
    enabled: Boolean(orgId),
  });
}

export function useTodayWorkout(orgId: string | null, date: string) {
  return useQuery<TodayWorkout>({
    queryKey: qk.today(orgId, date),
    queryFn: () => api.getTodayWorkout(orgId as string, date),
    enabled: Boolean(orgId),
  });
}

export function useWorkoutSchedule(orgId: string | null) {
  return useQuery<WorkoutSchedule>({
    queryKey: qk.schedule(orgId),
    queryFn: () => api.getWorkoutSchedule(orgId as string, { days: 14 }),
    enabled: Boolean(orgId),
  });
}

export function useWorkoutDay(orgId: string | null, dayId: string | undefined, date?: string) {
  return useQuery<WorkoutDayDetail>({
    queryKey: qk.workoutDay(orgId, dayId ?? "", date),
    queryFn: () => api.getWorkoutDay(orgId as string, dayId as string, date),
    enabled: Boolean(orgId && dayId),
  });
}

export function useWorkoutSessions(orgId: string | null, limit = 30) {
  return useQuery<WorkoutSessionSummary[]>({
    queryKey: qk.sessions(orgId),
    queryFn: () => api.getWorkoutSessions(orgId as string, { limit }),
    enabled: Boolean(orgId),
  });
}

export function useNotifications(orgId: string | null) {
  return useQuery<AppNotification[]>({
    queryKey: qk.notifications(orgId),
    queryFn: () => api.getNotifications(orgId),
    enabled: Boolean(orgId),
  });
}

export function useUnreadCount(orgId: string | null) {
  return useQuery<{ unread_count: number }>({
    queryKey: qk.unread(orgId),
    queryFn: () => api.getUnreadCount(orgId),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  });
}

export function useOrgCoaches(orgId: string | null) {
  return useQuery({
    queryKey: qk.coaches(orgId),
    queryFn: () => api.getOrgCoaches(orgId),
    enabled: Boolean(orgId),
  });
}

// ── Nutrition ───────────────────────────────────────────────────────────────

export function useNutritionTemplates(orgId: string | null, query = "") {
  return useQuery<NutritionTemplate[]>({
    queryKey: qk.nutritionTemplates(orgId, query),
    queryFn: () => api.getNutritionTemplates(orgId as string, query || undefined),
    enabled: Boolean(orgId),
  });
}

export function useNutritionTemplate(orgId: string | null, templateId: string | undefined) {
  return useQuery<NutritionTemplateDetail>({
    queryKey: qk.nutritionTemplate(orgId, templateId ?? ""),
    queryFn: () => api.getNutritionTemplateDetail(orgId as string, templateId as string),
    enabled: Boolean(orgId && templateId),
  });
}

export function useNutritionPlan(orgId: string | null, planId: string | undefined) {
  return useQuery<NutritionPlan>({
    queryKey: qk.nutritionPlan(orgId, planId ?? ""),
    queryFn: () => api.getNutritionPlanDetail(orgId as string, planId as string),
    enabled: Boolean(orgId && planId),
  });
}

export function useCustomExercises(orgId: string | null) {
  return useQuery<ExerciseListItem[]>({
    queryKey: qk.customExercises(orgId),
    queryFn: () => api.getCustomExercises(orgId),
    enabled: Boolean(orgId),
  });
}
