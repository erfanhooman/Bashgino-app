import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarRange, ChevronLeft, MessageSquare, Phone, UserCog } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Sheet, useSnackbar } from "@/components/ui/overlay";
import { Avatar, Badge, Card, Divider, MetaChip, SectionHeader } from "@/components/ui/surface";
import { AppText, ltrIsolate } from "@/components/ui/text";
import { useClientDetail, useOrgCoaches, useTrainingPlans } from "@/hooks/queries";
import * as api from "@/services/api/endpoints";
import { qk, queryClient } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits } from "@bashgino/domain";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  INVITED: "در انتظار ثبت‌نام",
  ONBOARDING_PENDING: "در انتظار تکمیل",
  ARCHIVED: "بایگانی",
};

/**
 * Athlete file.
 *
 * What a coach needs before a session: who they are, who owns them, and what
 * was agreed. Assignment is the action this page exists for — the server revives
 * a historical assignment rather than duplicating it, so re-assigning an old
 * coach is safe.
 */
export default function ClientDetailScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const { show } = useSnackbar();
  const params = useLocalSearchParams<{ id: string }>();
  const query = useClientDetail(orgId, params.id);
  // The trainee's own copies of their plans — each one is editable independently
  // of the library template it came from.
  const plans = useTrainingPlans(orgId);
  const clientPlans = (plans.data ?? []).filter(
    (plan) => plan.client_profile === params.id && plan.status !== "ARCHIVED",
  );
  const coaches = useOrgCoaches(orgId);

  // Draft-over-server: the textarea shows the local edit when there is one and
  // the saved note otherwise. Deriving it instead of copying the server value
  // into state in an effect avoids a cascading render (and the flash of stale
  // text when the query refetches).
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const savedNotes = query.data?.notes ?? "";
  const notes = notesDraft ?? savedNotes;
  const dirty = notesDraft !== null && notesDraft !== savedNotes;

  const saveNotes = useMutation({
    mutationFn: () => api.updateClient(orgId as string, params.id, { notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.client(orgId, params.id) });
      setNotesDraft(null);
      show("یادداشت ذخیره شد.", "success");
    },
    onError: (error) => show(error instanceof Error ? error.message : "ذخیره نشد.", "error"),
  });

  const assign = useMutation({
    mutationFn: (membershipId: string) =>
      api.assignCoach(orgId as string, params.id, membershipId, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.client(orgId, params.id) });
      void queryClient.invalidateQueries({ queryKey: qk.clients(orgId) });
      setAssignOpen(false);
      show("مربی مسئول تعیین شد.", "success");
    },
    onError: (error) => show(error instanceof Error ? error.message : "تخصیص انجام نشد.", "error"),
  });

  if (query.isLoading) {
    return (
      <AppScreen showHeader={false}>
        <SkeletonCard rows={4} />
      </AppScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <AppScreen showHeader={false}>
        <ErrorState message="پرونده ورزشکار بارگذاری نشد." onRetry={() => void query.refetch()} />
        <Button label="بازگشت" variant="secondary" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  const client = query.data;
  const trainee = client.user;

  return (
    <AppScreen
      showHeader={false}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Button label="بازگشت" variant="ghost" size="sm" onPress={() => router.back()} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={trainee?.full_name ?? "؟"} size={56} />
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="title" numberOfLines={1}>
            {trainee?.full_name ?? "بدون نام"}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Phone size={13} color={theme.colors.textMuted} strokeWidth={2} />
            <AppText variant="caption" tone="secondary" numeric>
              {ltrIsolate(trainee?.phone_number ?? "—")}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            <Badge
              label={STATUS_LABEL[client.status] ?? client.status}
              tone={client.status === "ACTIVE" ? "success" : "warning"}
            />
            <MetaChip label={`عضویت: ${formatJalaliDate(client.created_at, { format: "medium" })}`} />
          </View>
        </View>
      </View>

      <Card style={{ gap: 10 }}>
        <SectionHeader
          title="مربی مسئول"
          icon={<UserCog size={18} color={theme.colors.brandInk} strokeWidth={2} />}
          action={
            <Button label="تغییر" size="sm" variant="outline" onPress={() => setAssignOpen(true)} />
          }
        />
        <Divider />
        {client.primary_coach ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar name={client.primary_coach.full_name} size={34} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="medium">
                {client.primary_coach.full_name}
              </AppText>
              {client.primary_coach.email ? (
                <AppText variant="caption" tone="muted">
                  {client.primary_coach.email}
                </AppText>
              ) : null}
            </View>
          </View>
        ) : (
          <AppText variant="caption" tone="warning">
            این ورزشکار هنوز مربی مسئول ندارد؛ برای شروع برنامه‌ریزی، مربی تعیین کنید.
          </AppText>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionHeader
          title="یادداشت مربی"
          icon={<MessageSquare size={18} color={theme.colors.brandInk} strokeWidth={2} />}
        />
        <Input
          placeholder="سابقه پزشکی، محدودیت‌ها، توافق‌ها…"
          value={notes}
          onChangeText={(value) => setNotesDraft(value)}
          multiline
          numberOfLines={4}
        />
        <Button
          label="ذخیره یادداشت"
          size="sm"
          variant={dirty ? "primary" : "secondary"}
          disabled={!dirty}
          loading={saveNotes.isPending}
          onPress={() => saveNotes.mutate()}
        />
      </Card>

      {clientPlans.length > 0 ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="caption" weight="semibold" tone="secondary">
            برنامه‌های تمرینی این ورزشکار
          </AppText>
          {clientPlans.map((plan) => (
            <Card
              key={plan.id}
              padded={false}
              onPress={() => router.push(`/training/plans/${plan.id}` as never)}
              style={{ padding: theme.spacing.md, gap: 4 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {plan.name}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {plan.status === "ACTIVE" ? "فعال" : plan.status === "DRAFT" ? "پیش‌نویس" : plan.status}
                    {plan.start_date ? ` · شروع ${formatJalaliDate(plan.start_date, { format: "medium" })}` : ""}
                  </AppText>
                </View>
                <ChevronLeft size={18} color={theme.colors.textMuted} strokeWidth={2} />
              </View>
            </Card>
          ))}
        </Card>
      ) : null}

      <Card padded={false} onPress={() => router.push("/training")} style={{ padding: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <CalendarRange size={18} color={theme.colors.brandInk} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="medium">
              کتابخانه برنامه‌های تمرینی
            </AppText>
            <AppText variant="caption" tone="muted">
              برنامه بسازید و به این ورزشکار تخصیص دهید
            </AppText>
          </View>
          <ChevronLeft size={18} color={theme.colors.textMuted} strokeWidth={2} />
        </View>
      </Card>

      <Sheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="انتخاب مربی مسئول"
        description="تغییر مربی، تاریخچه تمرین‌ها را حفظ می‌کند."
      >
        <View style={{ gap: 6 }}>
          {(coaches.data ?? []).map((coach) => {
            const active = client.primary_coach?.coach_membership_id === coach.membership_id;
            return (
              <Card
                key={coach.membership_id}
                padded={false}
                onPress={() => assign.mutate(coach.membership_id)}
                style={{
                  padding: theme.spacing.md,
                  borderColor: active ? theme.colors.selected : theme.colors.border,
                  backgroundColor: active ? theme.colors.primarySubtle : theme.colors.surface,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar name={coach.full_name} size={34} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight="medium" numberOfLines={1}>
                      {coach.full_name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {coach.role === "ORG_ADMIN" ? "مدیر" : "مربی"} ·{" "}
                      {toPersianDigits(coach.client_count)} ورزشکار
                    </AppText>
                  </View>
                  {active ? <Badge label="مسئول" tone="primary" /> : null}
                </View>
              </Card>
            );
          })}
          {(coaches.data ?? []).length === 0 ? (
            <AppText variant="caption" tone="muted">
              مربی فعالی در این فضا وجود ندارد.
            </AppText>
          ) : null}
        </View>
      </Sheet>
    </AppScreen>
  );
}
