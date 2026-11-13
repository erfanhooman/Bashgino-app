/**
 * Server state.
 *
 * TanStack Query owns everything that comes from the API: caching, retries,
 * background refreshes and the "one screen, four requests" pattern the
 * dashboards need. Client state (session, draft edits) stays in Zustand or local
 * component state — never duplicated here.
 */
import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/services/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Pull-to-refresh and focus refetch cover staleness; 30s keeps a tab switch
      // from re-hitting an endpoint the user just looked at.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Client errors are decisions, not flakes: a 403 will not become a 200.
        if (error instanceof ApiError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) return false;
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 2;
      },
    },
  },
});

/** Query key namespace. One place, so invalidation can never miss a surface. */
export const qk = {
  me: ["me"] as const,
  dashboard: (orgId: string | null) => ["dashboard", orgId] as const,
  clients: (orgId: string | null) => ["clients", orgId] as const,
  client: (orgId: string | null, id: string) => ["client", orgId, id] as const,
  planTemplates: (orgId: string | null) => ["plan-templates", orgId] as const,
  planTemplate: (orgId: string | null, id: string) => ["plan-template", orgId, id] as const,
  trainingPlans: (orgId: string | null) => ["training-plans", orgId] as const,
  today: (orgId: string | null, date: string) => ["today", orgId, date] as const,
  schedule: (orgId: string | null) => ["schedule", orgId] as const,
  workoutDay: (orgId: string | null, id: string, date?: string) => ["workout-day", orgId, id, date ?? null] as const,
  sessions: (orgId: string | null) => ["sessions", orgId] as const,
  exercises: (orgId: string | null, q: string) => ["exercises", orgId, q] as const,
  notifications: (orgId: string | null) => ["notifications", orgId] as const,
  unread: (orgId: string | null) => ["unread", orgId] as const,
  coaches: (orgId: string | null) => ["coaches", orgId] as const,
  nutritionTemplates: (orgId: string | null, q: string) => ["nutrition-templates", orgId, q] as const,
  nutritionTemplate: (orgId: string | null, id: string) => ["nutrition-template", orgId, id] as const,
  nutritionPlan: (orgId: string | null, id: string) => ["nutrition-plan", orgId, id] as const,
  customExercises: (orgId: string | null) => ["custom-exercises", orgId] as const,
} as const;
