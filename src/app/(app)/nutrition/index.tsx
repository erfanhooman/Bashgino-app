import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Apple, Plus, Search, Trash2, Utensils } from "lucide-react-native";
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
  hasMetaErrors,
  nutritionTargetsFromMeta,
  toPersianDigits,
  validateNutritionMeta,
  type NutritionMetaDraft,
} from "@bashgino/domain";
import type { NutritionTemplate } from "@bashgino/types";

type SortMode = "recent" | "name";

const stamp = (value: string | undefined) => (value ? new Date(value).getTime() || 0 : 0);

/**
 * Nutrition library — the same two-library split as the training library: what
 * this coach wrote (editable) and what other coaches shared with the space
 * (assign-only, read-only editor).
 */
export default function NutritionLibraryScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NutritionTemplate | null>(null);

  const query = useQuery({
    queryKey: qk.nutritionTemplates(orgId, search),
    queryFn: () => api.getNutritionTemplates(orgId as string, search || undefined),
    enabled: Boolean(orgId),
  });

  const rows = query.data ?? [];

  // The editor returns here with the saved name so the coach gets the same
  // confirmation the web shows after a create.
  useEffect(() => {
    if (!saved) return;
    show(`برنامه «${saved}» ذخیره شد.`, "success");
    router.setParams({ saved: undefined });
    void queryClient.invalidateQueries({ queryKey: ["nutrition-templates", orgId] });
  }, [saved, show, router, queryClient, orgId]);

  const visible = useMemo(() => {
    const sorted = [...rows];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    else sorted.sort((a, b) => stamp(b.updated_at) - stamp(a.updated_at));
    return sorted;
  }, [rows, sort]);

  const mine = visible.filter((row) => row.can_manage !== false);
  const shared = visible.filter((row) => row.can_manage === false);

  const create = useMutation({
    mutationFn: async () => {
      const meta: NutritionMetaDraft = {
        name,
        description,
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      };
      const errors = validateNutritionMeta(meta);
      if (hasMetaErrors(errors)) throw new Error(errors.name ?? "عنوان برنامه را وارد کنید.");
      // The server wants the targets on create; they come from the same draft model
      // the editor will edit a moment later.
      return api.createNutritionTemplate(orgId as string, {
        name: meta.name.trim(),
        description: meta.description.trim(),
        meals: [],
        ...nutritionTargetsFromMeta(meta),
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["nutrition-templates", orgId] });
      setCreateOpen(false);
      setName("");
      setDescription("");
      router.push(`/nutrition/builder/${created.id}?new=1` as never);
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "ساخت برنامه انجام نشد."),
  });

  const remove = useMutation({
    mutationFn: (templateId: string) => api.deleteNutritionTemplate(orgId as string, templateId),
    onSuccess: (_result, templateId) => {
      void queryClient.invalidateQueries({ queryKey: ["nutrition-templates", orgId] });
      setDeleteTarget(null);
      show("برنامه از کتابخانه حذف شد؛ نسخه‌های شاگردان حفظ می‌شوند.", "success");
      void templateId;
    },
    onError: (error) => show(error instanceof Error ? error.message : "حذف انجام نشد.", "error"),
  });

  const renderCard = (template: NutritionTemplate) => (
    <Card
      key={template.id}
      padded={false}
      onPress={() => router.push(`/nutrition/builder/${template.id}` as never)}
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
          <Utensils size={18} color={theme.colors.brandInk} strokeWidth={2} />
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
            {template.is_public_to_org === false ? <Badge label="خصوصی" tone="neutral" /> : null}
          </View>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {template.description || "بدون توضیح"}
          </AppText>
        </View>
        {template.can_manage !== false ? (
          <Button
            label="حذف"
            variant="ghost"
            size="sm"
            icon={Trash2}
            accessibilityLabel={`حذف برنامه ${template.name}`}
            onPress={() => setDeleteTarget(template)}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <MetaChip label={`${toPersianDigits(template.meal_count)} وعده`} />
        <MetaChip label={`${toPersianDigits(template.food_count)} ماده غذایی`} />
        {template.daily_calories_target ? (
          <MetaChip label={`${toPersianDigits(template.daily_calories_target)} کالری`} />
        ) : null}
        <MetaChip label={`${toPersianDigits(template.assigned_count)} ورزشکار`} />
      </View>
    </Card>
  );

  return (
    <AppScreen
      title="کتابخانه تغذیه"
      subtitle="برنامه‌های غذایی قابل تخصیص"
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      contentContainerStyle={{ gap: theme.spacing.md }}
      headerRight={
        <Button label="برنامه جدید" size="sm" icon={Plus} onPress={() => setCreateOpen(true)} />
      }
    >
      <Input
        placeholder="جست‌وجوی برنامه غذایی"
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
        <ErrorState message="کتابخانه تغذیه بارگذاری نشد." onRetry={() => void query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="برنامه غذایی‌ای یافت نشد"
          description="یک برنامه بسازید تا بتوانید آن را به ورزشکاران تخصیص دهید."
          icon={<Apple size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
          action={<Button label="ساخت برنامه" icon={Plus} onPress={() => setCreateOpen(true)} />}
        />
      ) : (
        <>
          {mine.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="برنامه‌های من" hint={`${toPersianDigits(mine.length)} برنامه`} />
              {mine.map(renderCard)}
            </View>
          ) : null}
          {shared.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader
                title="برنامه‌های سایر مربیان"
                hint="فقط نمایش و تخصیص"
              />
              {shared.map(renderCard)}
            </View>
          ) : null}
        </>
      )}

      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="برنامه غذایی جدید"
        description="عنوان و توضیح را وارد کنید؛ سپس وعده‌ها را در ویرایشگر اضافه می‌کنید."
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
            value={name}
            onChangeText={setName}
            placeholder="مثلاً برنامه حجم — مرحله ۱"
            error={formError ?? undefined}
          />
          <Input
            label="توضیح"
            value={description}
            onChangeText={setDescription}
            placeholder="برای چه ورزشکاری مناسب است؟"
            multiline
          />
        </View>
      </Sheet>

      <Dialog
        visible={Boolean(deleteTarget)}
        title="حذف برنامه تغذیه"
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
