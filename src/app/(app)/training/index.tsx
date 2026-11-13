import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarRange, Lock, Plus, Search, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Dialog, Sheet, useSnackbar } from "@/components/ui/overlay";
import { Badge, Card, EmptyState, MetaChip, SectionHeader } from "@/components/ui/surface";
import { SegmentedTabs } from "@/components/ui/tabs";
import { AppText } from "@/components/ui/text";
import { useRequireRole } from "@/hooks/useRequireRole";
import * as api from "@/services/api/endpoints";
import { qk } from "@/services/query";
import { useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import {
  CUSTOM_GOAL,
  TRAINING_GOALS,
  goalLabel,
  templateGoalValue,
  toPersianDigits,
  validateTemplateMeta,
  type PlanTemplateMetaDraft,
} from "@bashgino/domain";
import type { PlanTemplate } from "@bashgino/types";

type SortMode = "recent" | "name";

const stamp = (value: string | undefined) => (value ? new Date(value).getTime() || 0 : 0);

/**
 * Training library — the coach's reusable plans.
 *
 * Two sections, exactly like the web: plans this coach can edit, and plans other
 * coaches shared with the space (assign-only, read-only editor). Creating a plan
 * posts an empty document and jumps straight into the editor, because a template
 * with no days cannot be described in a modal.
 */
export default function TrainingLibraryScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [createOpen, setCreateOpen] = useState(false);
  const [meta, setMeta] = useState<PlanTemplateMetaDraft>({
    name: "",
    goal: "",
    customGoal: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanTemplate | null>(null);

  const query = useQuery({
    queryKey: qk.planTemplates(orgId),
    queryFn: () => api.getPlanTemplates(orgId as string),
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (!saved) return;
    show(`برنامه «${saved}» ذخیره شد.`, "success");
    void queryClient.invalidateQueries({ queryKey: qk.planTemplates(orgId) });
  }, [saved, show, queryClient, orgId]);

  const rows = query.data ?? [];

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? rows.filter(
          (row) =>
            row.name.toLowerCase().includes(needle) ||
            (row.description ?? "").toLowerCase().includes(needle) ||
            (row.goal ?? "").toLowerCase().includes(needle),
        )
      : [...rows];
    if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    else filtered.sort((a, b) => stamp(b.updated_at) - stamp(a.updated_at));
    return filtered;
  }, [rows, search, sort]);

  const mine = visible.filter((row) => row.can_manage !== false);
  const shared = visible.filter((row) => row.can_manage === false);

  const create = useMutation({
    mutationFn: async () => {
      const check = validateTemplateMeta(meta);
      if (!check.valid) throw new Error(check.name ?? check.goal ?? "اطلاعات برنامه معتبر نیست.");
      return api.createPlanTemplate(orgId as string, {
        name: meta.name.trim(),
        goal: templateGoalValue(meta),
        description: meta.description.trim(),
        days: [],
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: qk.planTemplates(orgId) });
      setCreateOpen(false);
      setMeta({ name: "", goal: "", customGoal: "", description: "" });
      router.push(`/training/builder/${created.id}?new=1` as never);
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "ساخت برنامه انجام نشد."),
  });

  const remove = useMutation({
    mutationFn: (templateId: string) => api.deletePlanTemplate(orgId as string, templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.planTemplates(orgId) });
      setDeleteTarget(null);
      show("برنامه از کتابخانه حذف شد؛ نسخه‌های ورزشکاران حفظ می‌شوند.", "success");
    },
    onError: (error) => show(error instanceof Error ? error.message : "حذف انجام نشد.", "error"),
  });

  const renderCard = (template: PlanTemplate, readOnly: boolean) => (
    <Card
      key={template.id}
      padded={false}
      onPress={() => router.push(`/training/builder/${template.id}` as never)}
      style={{ padding: theme.spacing.md, gap: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primarySubtle,
          }}
        >
          {readOnly ? (
            <Lock size={18} color={theme.colors.brandInk} strokeWidth={2} />
          ) : (
            <CalendarRange size={18} color={theme.colors.brandInk} strokeWidth={2} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {template.name}
            </AppText>
            {template.is_ready ? (
              <Badge label="آماده تخصیص" tone="success" />
            ) : (
              <Badge label="ناقص" tone="warning" />
            )}
            {readOnly ? <Badge label="مربی دیگر" tone="neutral" /> : null}
          </View>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {template.goal ? goalLabel(template.goal) : "بدون هدف ثبت‌شده"}
            {template.description ? ` · ${template.description}` : ""}
          </AppText>
        </View>
        {readOnly ? null : (
          <Button
            label="حذف"
            variant="ghost"
            size="sm"
            icon={Trash2}
            accessibilityLabel={`حذف برنامه ${template.name}`}
            onPress={() => setDeleteTarget(template)}
          />
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <MetaChip label={`${toPersianDigits(template.day_count)} روز`} />
        <MetaChip label={`${toPersianDigits(template.exercise_count)} حرکت`} />
        <MetaChip label={`${toPersianDigits(template.assigned_count)} ورزشکار`} />
      </View>
    </Card>
  );

  return (
    <AppScreen
      title="کتابخانه تمرین"
      subtitle="برنامه‌های تمرینی قابل تخصیص"
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
      headerRight={<Button label="برنامه جدید" size="sm" icon={Plus} onPress={() => setCreateOpen(true)} />}
    >
      <Input
        placeholder="جست‌وجوی برنامه تمرینی"
        value={search}
        onChangeText={setSearch}
        leading={<Search size={17} color={theme.colors.textMuted} strokeWidth={2} />}
        autoCorrect={false}
      />

      <SegmentedTabs
        options={[
          { key: "recent", label: "تازه‌ترین" },
          { key: "name", label: "الفبا" },
        ]}
        value={sort}
        onChange={(key) => setSort(key as SortMode)}
      />

      {query.isLoading ? (
        <SkeletonCard rows={4} />
      ) : query.isError ? (
        <ErrorState message="کتابخانه تمرین بارگذاری نشد." onRetry={() => void query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? "برنامه‌ای پیدا نشد" : "هنوز برنامه‌ای نساخته‌اید"}
          description={
            search
              ? "عبارت دیگری را جست‌وجو کنید."
              : "یک برنامه بسازید، روزها و حرکات را اضافه کنید و به ورزشکاران تخصیص دهید."
          }
          icon={<CalendarRange size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
          action={<Button label="ساخت برنامه" icon={Plus} onPress={() => setCreateOpen(true)} />}
        />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {mine.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="برنامه‌های من" hint={`${toPersianDigits(mine.length)} برنامه`} />
              {mine.map((template) => renderCard(template, false))}
            </View>
          ) : null}

          {shared.length > 0 ? (
            <View
              style={{
                gap: theme.spacing.sm,
                paddingTop: theme.spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <SectionHeader title="برنامه‌های مربیان دیگر" hint={`${toPersianDigits(shared.length)} برنامه`} />
              <AppText variant="caption" tone="muted">
                این برنامه‌ها را مربی دیگری ساخته است. می‌توانید ورزشکار تخصیص دهید، اما ویرایش و
                حذفشان فقط با مربی سازنده یا مدیر باشگاه است.
              </AppText>
              {shared.map((template) => renderCard(template, true))}
            </View>
          ) : null}
        </View>
      )}

      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="برنامه تمرینی جدید"
        description="عنوان و هدف را انتخاب کنید؛ روزها و حرکات را در ویرایشگر اضافه می‌کنید."
        footer={
          <Button
            label="ساخت و ادامه"
            fullWidth
            loading={create.isPending}
            onPress={() => {
              setFormError(null);
              create.mutate();
            }}
          />
        }
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Input
            label="عنوان برنامه"
            required
            value={meta.name}
            onChangeText={(name) => setMeta({ ...meta, name })}
            placeholder="مثلاً برنامه قدرتی ۴ روزه"
            error={formError ?? undefined}
          />

          <View style={{ gap: 6 }}>
            <AppText variant="caption" weight="semibold" tone="secondary">
              هدف تمرینی
            </AppText>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {TRAINING_GOALS.map((goal) => (
                <Button
                  key={goal}
                  label={goalLabel(goal)}
                  size="sm"
                  variant={meta.goal === goal ? "primary" : "secondary"}
                  onPress={() => setMeta({ ...meta, goal })}
                />
              ))}
              <Button
                label="هدف دلخواه"
                size="sm"
                variant={meta.goal === CUSTOM_GOAL ? "primary" : "secondary"}
                onPress={() => setMeta({ ...meta, goal: CUSTOM_GOAL })}
              />
            </View>
            {meta.goal === CUSTOM_GOAL ? (
              <Input
                label="متن هدف"
                value={meta.customGoal}
                onChangeText={(customGoal) => setMeta({ ...meta, customGoal })}
              />
            ) : null}
          </View>

          <Input
            label="توضیح"
            value={meta.description}
            onChangeText={(description) => setMeta({ ...meta, description })}
            placeholder="برای چه ورزشکاری مناسب است؟"
            multiline
          />
        </View>
      </Sheet>

      <Dialog
        visible={Boolean(deleteTarget)}
        title="حذف برنامه تمرینی"
        message={
          deleteTarget
            ? `«${deleteTarget.name}» از کتابخانه حذف می‌شود. نسخه‌های تخصیص‌یافته به ورزشکاران حذف نمی‌شوند.`
            : ""
        }
        confirmLabel="حذف"
        destructive
        busy={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </AppScreen>
  );
}
