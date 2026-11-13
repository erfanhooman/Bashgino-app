import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Camera, Ruler, TrendingUp, Users } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonCard, StatTile } from "@/components/ui/layout";
import { Card, EmptyState, SectionHeader } from "@/components/ui/surface";
import { AppText } from "@/components/ui/text";
import * as api from "@/services/api/endpoints";
import { useRole, useOrgId } from "@/store/session";
import { useTheme } from "@/theme";
import { formatJalaliDate, toPersianDigits } from "@bashgino/domain";
import type { BodyMeasurement, ProgressPhoto } from "@bashgino/types";

/**
 * Progress.
 *
 * Measurements and progress photos as two lists — the numbers first, because a
 * trainee checks the scale before the mirror. A coach's cross-athlete review is a
 * separate surface (roster → athlete) rather than a half-built picker here.
 */
export default function ProgressScreen() {
  const theme = useTheme();
  const orgId = useOrgId();
  const role = useRole();
  const isCoach = role === "COACH" || role === "ORG_ADMIN";

  const measurements = useQuery<BodyMeasurement[]>({
    queryKey: ["measurements", orgId],
    queryFn: () => api.getMeasurements(orgId as string),
    enabled: Boolean(orgId) && !isCoach,
  });
  const photos = useQuery<ProgressPhoto[]>({
    queryKey: ["progress-photos", orgId],
    queryFn: () => api.getProgressPhotos(orgId as string),
    enabled: Boolean(orgId),
  });

  const latest = (measurements.data ?? [])[0] ?? null;

  return (
    <AppScreen
      title="پیشرفت"
      subtitle={isCoach ? "پایش پیشرفت ورزشکاران" : "سنجش‌ها و تصاویر پیشرفت شما"}
      refreshing={measurements.isRefetching || photos.isRefetching}
      onRefresh={() => {
        void measurements.refetch();
        void photos.refetch();
      }}
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {isCoach ? (
        <Card style={{ gap: 10 }}>
          <SectionHeader
            title="پایش پیشرفت ورزشکار"
            icon={<Users size={18} color={theme.colors.brandInk} strokeWidth={2} />}
          />
          <AppText variant="caption" tone="secondary">
            سنجش‌ها و تصاویر هر ورزشکار در پرونده او ثبت می‌شود. برای مشاهده، از فهرست ورزشکاران
            پرونده مورد نظر را باز کنید.
          </AppText>
          <Button label="رفتن به ورزشکاران" variant="outline" onPress={() => router.push("/clients")} />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <StatTile
              label="وزن اخیر"
              value={latest?.weight_kg ? `${toPersianDigits(latest.weight_kg)} کیلو` : "—"}
              icon={<TrendingUp size={16} color={theme.colors.brandInk} strokeWidth={2} />}
              tone="brand"
            />
            <StatTile
              label="سنجش‌های ثبت‌شده"
              value={toPersianDigits((measurements.data ?? []).length)}
              icon={<Ruler size={16} color={theme.colors.textSecondary} strokeWidth={2} />}
            />
          </View>

          {measurements.isLoading ? (
            <SkeletonCard rows={4} />
          ) : measurements.isError ? (
            <ErrorState message="سنجش‌ها بارگذاری نشد." onRetry={() => void measurements.refetch()} />
          ) : (measurements.data ?? []).length === 0 ? (
            <EmptyState
              title="هنوز سنجشی ثبت نشده"
              description="سنجش‌های بدن توسط مربی در پرونده شما ثبت می‌شود."
              icon={<Ruler size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
            />
          ) : (
            <View style={{ gap: 6 }}>
              <SectionHeader title="سنجش‌های بدن" />
              {(measurements.data ?? []).map((measurement) => (
                <Card key={measurement.id} padded={false} style={{ padding: theme.spacing.md }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <AppText variant="caption" weight="medium">
                      {formatJalaliDate(measurement.measured_at, { format: "medium" })}
                    </AppText>
                    <AppText variant="caption" tone="muted" numeric>
                      {[
                        measurement.weight_kg ? `${toPersianDigits(measurement.weight_kg)} کیلو` : null,
                        measurement.body_fat_percent
                          ? `${toPersianDigits(measurement.body_fat_percent)}٪ چربی`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </AppText>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ gap: 6 }}>
        <SectionHeader
          title="تصاویر پیشرفت"
          hint={`${toPersianDigits((photos.data ?? []).length)} تصویر`}
          icon={<Camera size={18} color={theme.colors.brandInk} strokeWidth={2} />}
        />
        {photos.isLoading ? (
          <SkeletonCard rows={2} />
        ) : photos.isError ? (
          <ErrorState message="تصاویر بارگذاری نشد." onRetry={() => void photos.refetch()} />
        ) : (photos.data ?? []).length === 0 ? (
          <Card>
            <AppText variant="caption" tone="secondary">
              تصویری ثبت نشده است. بارگذاری تصویر از نسخه وب انجام می‌شود.
            </AppText>
          </Card>
        ) : (
          (photos.data ?? []).slice(0, 12).map((photo) => (
            <Card key={photo.id} padded={false} style={{ padding: theme.spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <AppText variant="caption" weight="medium">
                  {photo.pose} · {formatJalaliDate(photo.taken_at, { format: "medium" })}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {photo.status === "CONFIRMED" ? "تأییدشده" : "در انتظار"}
                </AppText>
              </View>
              {photo.coach_feedback ? (
                <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                  بازخورد مربی: {photo.coach_feedback}
                </AppText>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </AppScreen>
  );
}
