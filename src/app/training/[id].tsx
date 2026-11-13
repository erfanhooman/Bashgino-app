import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, Dumbbell, Info, UserPlus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Sheet, useSnackbar } from "@/components/ui/overlay";
import { Avatar, Badge, Card, Divider, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import { useClients } from "@/hooks/queries";
import * as api from "@/services/api/endpoints";
import { qk, queryClient } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatRest, goalLabel, toPersianDigits } from "@bashgino/domain";

interface TemplateExercise {
  exercise: string;
  exercise_name?: string;
  name?: string;
  target_sets?: number;
  sets?: number;
  target_reps?: string;
  reps?: string;
  target_duration_seconds?: number | null;
  rest_interval_seconds?: number;
  rest_seconds?: number;
  coach_instructions?: string;
  instructions?: string;
}

interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

interface TemplateDetail {
  id: string;
  name: string;
  goal: string;
  description: string | null;
  can_manage: boolean;
  is_ready: boolean;
  day_count: number;
  exercise_count: number;
  days: TemplateDay[];
  assignments: { client_profile: string; client_name: string; plan_id: string; status: string }[];
}

/**
 * Reusable plan, read-only, plus the assignment surface.
 *
 * Authoring a program is a desktop job: seven days × exercises × parameters is a
 * keyboard-and-mouse task. On the phone a coach reviews the content and assigns
 * it, which is what they actually do between sessions. The web editor remains
 * the authoring surface and this screen says so rather than offering a form that
 * cannot reach parity.
 */
export default function TrainingTemplateScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const { show } = useSnackbar();
  const params = useLocalSearchParams<{ id: string }>();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const query = useQuery<TemplateDetail>({
    queryKey: qk.planTemplate(orgId, params.id),
    queryFn: () =>
      api.getPlanTemplateDetail(orgId as string, params.id) as unknown as Promise<TemplateDetail>,
  });
  const clients = useClients(orgId);

  const assignedIds = useMemo(
    () => (query.data?.assignments ?? []).map((assignment) => assignment.client_profile),
    [query.data],
  );

  const assign = useMutation({
    mutationFn: () =>
      api.setPlanTemplateAssignments(orgId as string, params.id, {
        client_profile_ids: selected,
        sync_content: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.planTemplate(orgId, params.id) });
      void queryClient.invalidateQueries({ queryKey: qk.planTemplates(orgId) });
      setAssignOpen(false);
      show("تخصیص ذخیره شد.", "success");
    },
    onError: (error) => show(error instanceof Error ? error.message : "تخصیص انجام نشد.", "error"),
  });

  if (query.isLoading) {
    return (
      <AppScreen showHeader={false}>
        <SkeletonCard rows={5} />
      </AppScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <AppScreen showHeader={false}>
        <ErrorState message="برنامه بارگذاری نشد." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="secondary" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  const template = query.data;
  const days = template.days ?? [];

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />

      <View style={{ gap: 6 }}>
        <AppText variant="display" weight="extrabold">
          {template.name}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {template.goal ? goalLabel(template.goal) : "بدون هدف ثبت‌شده"}
          {template.description ? ` · ${template.description}` : ""}
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {template.is_ready ? <Badge label="آماده تخصیص" tone="success" /> : <Badge label="ناقص" tone="warning" />}
          <MetaChip label={`${toPersianDigits(template.day_count)} روز`} />
          <MetaChip label={`${toPersianDigits(template.exercise_count)} حرکت`} />
          <MetaChip label={`${toPersianDigits(assignedIds.length)} ورزشکار`} />
        </View>
      </View>

      <Card padded={false} style={{ padding: theme.spacing.md, flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: theme.colors.infoSubtle, borderColor: theme.colors.infoBorder }}>
        <Info size={16} color={theme.colors.info} strokeWidth={2} />
        <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
          ویرایش محتوای برنامه در نسخه وب انجام می‌شود. در اینجا می‌توانید برنامه را ببینید و به
          ورزشکاران تخصیص دهید.
        </AppText>
      </Card>

      <Button
        label={template.is_ready ? "تخصیص به ورزشکاران" : "برای تخصیص، ابتدا برنامه را کامل کنید"}
        icon={UserPlus}
        disabled={!template.is_ready || !template.can_manage}
        onPress={() => {
          setSelected(assignedIds);
          setAssignOpen(true);
        }}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="روزهای تمرینی" />
        {days.length === 0 ? (
          <EmptyState
            title="این برنامه هنوز روز تمرینی ندارد"
            description="برای افزودن روز و حرکت، از ویرایشگر نسخه وب استفاده کنید."
            icon={<Dumbbell size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
          />
        ) : (
          days.map((day, dayIndex) => (
            <Card key={`${day.name}-${dayIndex}`} style={{ gap: 8 }}>
              <SectionHeader
                title={day.name}
                hint={`${toPersianDigits(day.exercises.length)} حرکت`}
                icon={<ChevronDown size={16} color={theme.colors.textMuted} strokeWidth={2} />}
              />
              <Divider />
              {day.exercises.length === 0 ? (
                <AppText variant="caption" tone="muted">
                  حرکتی برای این روز ثبت نشده است.
                </AppText>
              ) : (
                day.exercises.map((exercise, index) => {
                  const sets = exercise.target_sets ?? exercise.sets ?? 0;
                  const reps = exercise.target_reps ?? exercise.reps ?? "";
                  const duration = exercise.target_duration_seconds;
                  const rest = exercise.rest_interval_seconds ?? exercise.rest_seconds ?? 0;
                  return (
                    <View key={`${exercise.exercise}-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                      <AppText variant="overline" tone="muted" numeric style={{ width: 18 }}>
                        {toPersianDigits(index + 1)}
                      </AppText>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" weight="medium">
                          {exercise.exercise_name ?? exercise.name ?? "حرکت"}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {toPersianDigits(sets)} ست ·{" "}
                          {duration
                            ? `${toPersianDigits(duration)} ثانیه`
                            : `${toPersianDigits(reps)} تکرار`}
                          {rest ? ` · استراحت ${formatRest(rest)}` : ""}
                        </AppText>
                        {exercise.coach_instructions ? (
                          <AppText variant="caption" tone="secondary">
                            {exercise.coach_instructions}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          ))
        )}
      </View>

      <Sheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="تخصیص برنامه"
        description="با ذخیره، برای هر ورزشکار یک نسخه جداگانه ساخته می‌شود که تاریخچه و وضعیت خودش را دارد."
        footer={
          <Button
            label="ذخیره تخصیص"
            onPress={() => assign.mutate()}
            loading={assign.isPending}
            fullWidth
          />
        }
      >
        {clients.isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (clients.data ?? []).length === 0 ? (
          <AppText variant="caption" tone="muted">
            ورزشکاری در این فضا نیست.
          </AppText>
        ) : (
          <View style={{ gap: 6 }}>
            {(clients.data ?? [])
              .filter((client) => client.status !== "ARCHIVED")
              .map((client) => {
                const checked = selected.includes(client.id);
                return (
                  <Card
                    key={client.id}
                    padded={false}
                    onPress={() =>
                      setSelected((current) =>
                        current.includes(client.id)
                          ? current.filter((id) => id !== client.id)
                          : [...current, client.id],
                      )
                    }
                    style={{
                      padding: theme.spacing.md,
                      borderColor: checked ? theme.colors.selected : theme.colors.border,
                      backgroundColor: checked ? theme.colors.primarySubtle : theme.colors.surface,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Avatar name={client.user?.full_name ?? "؟"} size={34} />
                      <AppText variant="body" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                        {client.user?.full_name ?? "بدون نام"}
                      </AppText>
                      {checked ? <Check size={18} color={theme.colors.brandInk} strokeWidth={2.5} /> : null}
                    </View>
                  </Card>
                );
              })}
          </View>
        )}
      </Sheet>
    </AppScreen>
  );
}
