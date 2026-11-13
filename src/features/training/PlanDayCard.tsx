import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ChevronDown, ChevronUp, Copy, Dumbbell, Plus, Search, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import {
  WEEK_DAY_LABELS,
  type ExerciseLibraryItem,
  type PlanDayDraft,
  type PlanExerciseDraft,
  toPersianDigits,
} from "@bashgino/domain";
import type { ExerciseListItem } from "@bashgino/types";

import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Sheet } from "@/components/ui/overlay";
import { Badge, Card, MetaChip } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { resolveMediaUrl } from "@/services/api/media";
import * as api from "@/services/api/endpoints";
import { useTheme } from "@/theme";

/**
 * One training day inside the plan editor.
 *
 * Collapsed by default; the header is a summary a coach can scan (day name,
 * weekday, exercise count, estimated minutes). Expanding reveals the day name,
 * weekday picker and the exercise rows with their full prescription.
 */
export function PlanDayCard({
  day,
  index,
  readOnly,
  canMoveUp,
  canMoveDown,
  onPatch,
  onRemove,
  onDuplicate,
  onMove,
  onAddExercise,
  onPatchExercise,
  onRemoveExercise,
  onDuplicateExercise,
  exerciseImages,
  exerciseNames,
}: {
  day: PlanDayDraft;
  index: number;
  readOnly?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPatch: (patch: Partial<PlanDayDraft>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onAddExercise: () => void;
  onPatchExercise: (exerciseKey: string, patch: Partial<PlanExerciseDraft>) => void;
  onRemoveExercise: (exerciseKey: string) => void;
  onDuplicateExercise: (exerciseKey: string) => void;
  /** exerciseId → artwork URL, from the shared catalogue query. */
  exerciseImages?: Record<string, string>;
  /** exerciseId → localized name; plan payloads only carry the UUID. */
  exerciseNames?: Record<string, string>;
}) {
  const theme = useTheme();

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !day.collapsed }}
        accessibilityLabel={`${day.name.trim() || `روز ${toPersianDigits(index + 1)}`} — ${
          day.collapsed ? "باز کردن" : "بستن"
        }`}
        onPress={readOnly ? undefined : () => onPatch({ collapsed: !day.collapsed })}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {day.name.trim() || `روز ${toPersianDigits(index + 1)}`}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {[
              WEEK_DAY_LABELS[day.weekday] ?? null,
              `${toPersianDigits(day.exercises.length)} حرکت`,
              day.scheduledDate ? "تاریخ مشخص" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
        </View>
        {readOnly ? null : (
          <IconButton
            icon={day.collapsed ? ChevronDown : ChevronUp}
            label={day.collapsed ? "باز کردن روز" : "بستن روز"}
            onPress={() => onPatch({ collapsed: !day.collapsed })}
          />
        )}
      </Pressable>

      {day.collapsed ? null : (
        <View style={{ gap: theme.spacing.sm }}>
          <Input label="نام روز" value={day.name} onChangeText={(name) => onPatch({ name })} editable={!readOnly} />

          <View style={{ gap: 6 }}>
            <AppText variant="caption" weight="semibold" tone="secondary">
              روز هفته
            </AppText>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {WEEK_DAY_LABELS.map((label, weekday) => {
                const active = day.weekday === weekday;
                return (
                  <Button
                    key={label}
                    label={label}
                    size="sm"
                    variant={active ? "primary" : "secondary"}
                    disabled={readOnly}
                    onPress={() => onPatch({ weekday })}
                  />
                );
              })}
            </View>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            {day.exercises.length === 0 ? (
              <AppText variant="caption" tone="muted">
                برای این روز حرکتی اضافه نشده است.
              </AppText>
            ) : (
              day.exercises.map((exercise, exerciseIndex) => (
                <ExerciseRow
                  key={exercise.key}
                  exercise={exercise}
                  index={exerciseIndex}
                  readOnly={readOnly}
                  onPatch={(patch) => onPatchExercise(exercise.key, patch)}
                  onRemove={() => onRemoveExercise(exercise.key)}
                  onDuplicate={() => onDuplicateExercise(exercise.key)}
                  thumbnailUrl={exerciseImages?.[exercise.exerciseId]}
                  displayName={exerciseNames?.[exercise.exerciseId]}
                />
              ))
            )}

            {readOnly ? null : (
              <Button
                label="افزودن حرکت"
                variant="secondary"
                size="sm"
                icon={Plus}
                onPress={onAddExercise}
              />
            )}
          </View>

          {readOnly ? null : (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
              <Button label="بالا" variant="ghost" size="sm" disabled={!canMoveUp} onPress={() => onMove(-1)} />
              <Button label="پایین" variant="ghost" size="sm" disabled={!canMoveDown} onPress={() => onMove(1)} />
              <Button label="تکرار روز" variant="ghost" size="sm" icon={Copy} onPress={onDuplicate} />
              <Button label="حذف روز" variant="ghost" size="sm" icon={Trash2} onPress={onRemove} />
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

function ExerciseRow({
  exercise,
  index,
  readOnly,
  onPatch,
  onRemove,
  onDuplicate,
  thumbnailUrl,
  displayName,
}: {
  exercise: PlanExerciseDraft;
  index: number;
  readOnly?: boolean;
  onPatch: (patch: Partial<PlanExerciseDraft>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  thumbnailUrl?: string;
  displayName?: string;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surfaceSubtle,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ExerciseThumb url={thumbnailUrl} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body" weight="medium" numberOfLines={1}>
            {displayName || exercise.name || exercise.canonicalName}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {`${toPersianDigits(exercise.sets)} ست · ${toPersianDigits(exercise.reps)} تکرار · استراحت ${toPersianDigits(
              Math.round(exercise.restSeconds / 60) || 0,
            )} دقیقه`}
          </AppText>
        </View>
        <IconButton
          icon={expanded ? ChevronUp : ChevronDown}
          label={expanded ? "بستن حرکت" : "جزئیات حرکت"}
          onPress={() => setExpanded((current) => !current)}
        />
      </View>

      {expanded ? (
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="ست"
                value={String(exercise.sets)}
                onChangeText={(value) => onPatch({ sets: Number(value.replace(/\D/g, "")) || 0 })}
                keyboardType="number-pad"
                numeric
                editable={!readOnly}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="تکرار"
                value={exercise.reps}
                onChangeText={(reps) => onPatch({ reps })}
                placeholder="۸-۱۲"
                numeric
                editable={!readOnly}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="استراحت (ثانیه)"
                value={String(exercise.restSeconds)}
                onChangeText={(value) => onPatch({ restSeconds: Number(value.replace(/\D/g, "")) || 0 })}
                keyboardType="number-pad"
                numeric
                editable={!readOnly}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="زمان اجرا (ثانیه)"
                value={exercise.durationSeconds === null ? "" : String(exercise.durationSeconds)}
                onChangeText={(value) => {
                  const cleaned = value.replace(/\D/g, "");
                  onPatch({ durationSeconds: cleaned ? Number(cleaned) : null });
                }}
                keyboardType="number-pad"
                numeric
                placeholder="برای حرکات زمان‌دار"
                editable={!readOnly}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="وزن پیشنهادی (کیلو)"
                value={exercise.weightKg === null ? "" : String(exercise.weightKg)}
                onChangeText={(value) => {
                  const cleaned = value.replace(/[^\d.]/g, "");
                  onPatch({ weightKg: cleaned ? Number(cleaned) : null });
                }}
                keyboardType="decimal-pad"
                numeric
                editable={!readOnly}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="RPE"
                value={exercise.rpe === null ? "" : String(exercise.rpe)}
                onChangeText={(value) => {
                  const cleaned = value.replace(/[^\d.]/g, "");
                  onPatch({ rpe: cleaned ? Number(cleaned) : null });
                }}
                keyboardType="decimal-pad"
                numeric
                placeholder="۶ تا ۱۰"
                editable={!readOnly}
              />
            </View>
          </View>

          <Input
            label="تمپو"
            value={exercise.tempo}
            onChangeText={(tempo) => onPatch({ tempo })}
            placeholder="مثلاً ۳-۱-۲"
            numeric
            editable={!readOnly}
          />
          <Input
            label="یادداشت برای ورزشکار"
            value={exercise.instructions}
            onChangeText={(instructions) => onPatch({ instructions })}
            multiline
            editable={!readOnly}
          />
        </View>
      ) : null}

      {readOnly ? null : (
        <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
          <MetaChip label={`حرکت ${toPersianDigits(index + 1)}`} />
          <Button label="تکرار حرکت" variant="ghost" size="sm" icon={Copy} onPress={onDuplicate} />
          <Button label="حذف حرکت" variant="ghost" size="sm" icon={Trash2} onPress={onRemove} />
        </View>
      )}
    </View>
  );
}

/**
 * Exercise picker.
 *
 * One debounced catalogue query; tapping a row hands the caller the full library
 * item so the draft keeps its canonical name and muscle labels without a second
 * request.
 */
export function ExercisePickerSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: ExerciseLibraryItem) => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["exercise-picker", search],
    queryFn: () => api.getExercises({ q: search || undefined, pageSize: 30 }),
    enabled: visible,
    staleTime: 5 * 60_000,
  });

  const rows = useMemo<ExerciseListItem[]>(() => {
    const payload = query.data;
    if (!payload) return [];
    return Array.isArray(payload) ? payload : payload.results;
  }, [query.data]);

  return (
    <Sheet visible={visible} onClose={onClose} title="افزودن حرکت" description="جست‌وجو در کتابخانه حرکات">
      <View style={{ gap: theme.spacing.sm }}>
        <Input
          placeholder="نام حرکت"
          value={search}
          onChangeText={setSearch}
          leading={<Search size={17} color={theme.colors.textMuted} strokeWidth={2} />}
          autoCorrect={false}
        />

        {query.isLoading ? (
          <AppText variant="caption" tone="muted">
            در حال جست‌وجو…
          </AppText>
        ) : rows.length === 0 ? (
          <AppText variant="caption" tone="muted">
            حرکتی با این نام پیدا نشد.
          </AppText>
        ) : (
          rows.slice(0, 30).map((item) => (
            <Card
              key={item.id}
              padded={false}
              onPress={() => {
                onSelect(toLibraryItem(item));
                setSearch("");
                onClose();
              }}
              style={{ padding: theme.spacing.sm, gap: 8, flexDirection: "row", alignItems: "center" }}
            >
              <ExerciseThumb url={resolveMediaUrl(item.thumbnail_url)} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body" weight="medium" numberOfLines={1}>
                  {item.localized_name || item.canonical_name}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {[
                    item.primary_muscles?.[0]?.localized_name_fa ??
                      item.primary_muscles?.[0]?.canonical_name ??
                      null,
                    item.equipment?.[0]?.localized_name_fa ?? item.equipment?.[0]?.canonical_name ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ") ||
                    item.category ||
                    "—"}
                </AppText>
              </View>
            </Card>
          ))
        )}
      </View>
    </Sheet>
  );
}

/** The catalogue row and the plan draft row describe the same exercise. */
function toLibraryItem(item: ExerciseListItem): ExerciseLibraryItem {
  return {
    id: item.id,
    canonical_name: item.canonical_name,
    localized_name: item.localized_name,
    thumbnail_url: item.thumbnail_url,
    category: item.category,
    movement_pattern: item.movement_pattern,
    exercise_type: item.exercise_type,
    difficulty: item.difficulty,
    primary_muscles: item.primary_muscles ?? [],
    equipment: item.equipment ?? [],
    is_deprecated: item.is_deprecated,
  };
}

/**
 * Small exercise illustration with a graceful fallback.
 *
 * The dataset ships a start-frame WebP per exercise; when a movement has none (or
 * the object store is unreachable) the row keeps its shape with a dumbbell glyph
 * rather than collapsing or showing a broken-image box.
 */
function ExerciseThumb({ url, size }: { url?: string | null; size: number }) {
  const theme = useTheme();
  if (!url) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceSubtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Dumbbell size={size * 0.45} color={theme.colors.textMuted} strokeWidth={1.8} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceSubtle,
      }}
      contentFit="cover"
      transition={120}
      cachePolicy="memory-disk"
    />
  );
}
