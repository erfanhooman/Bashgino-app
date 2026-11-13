import { useQuery } from "@tanstack/react-query";

import type { ExerciseListItem } from "@bashgino/types";

import * as api from "@/services/api/endpoints";
import { resolveMediaUrl } from "@/services/api/media";

export interface ExerciseCatalogueSlice {
  /** Exercise id → first artwork URL. */
  images: Record<string, string>;
  /** Exercise id → Persian display name. */
  names: Record<string, string>;
}

/**
 * Localised names and artwork for the exercises in one session or day.
 *
 * The plan payload only carries `exercise_name`, which the API fills from
 * `Exercise.canonical_name` (English) — localisation lives on `/exercises/` and
 * is chosen from `Accept-Language`. Rather than show "Incline Barbell Bench
 * Press" in a Persian workout, the client joins the prescription against the
 * catalogue it already needs for the illustrations: one request for the whole
 * set, cached for an hour.
 *
 * Failures are silent by design: a missing name or picture must never block a
 * workout.
 */
export function useExerciseCatalogueSlice(exerciseIds: string[]) {
  const ids = [...new Set(exerciseIds.filter(Boolean))].sort();

  return useQuery<ExerciseCatalogueSlice>({
    queryKey: ["exercise-catalogue", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const response = await api.getExercises({ ids });
      const rows: ExerciseListItem[] = Array.isArray(response) ? response : response.results ?? [];
      const images: Record<string, string> = {};
      const names: Record<string, string> = {};
      for (const row of rows) {
        const url = resolveMediaUrl(row.image_urls?.[0] ?? row.thumbnail_url ?? null);
        if (url) images[row.id] = url;
        if (row.localized_name) names[row.id] = row.localized_name;
      }
      return { images, names };
    },
  });
}

/** Kept for call sites that only need the pictures. */
export function useExerciseArtwork(exerciseIds: string[]) {
  return useExerciseCatalogueSlice(exerciseIds);
}
