import { useMutation, useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { ChevronLeft, Copy, Search, Send, UserPlus, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/form";
import { ErrorState, SkeletonCard } from "@/components/ui/layout";
import { Sheet, useSnackbar } from "@/components/ui/overlay";
import { Avatar, Badge, Card, EmptyState, MetaChip } from "@/components/ui/surface";
import { SegmentedTabs } from "@/components/ui/tabs";
import { AppText, ltrIsolate } from "@/components/ui/text";
import { useClients } from "@/hooks/queries";
import * as api from "@/services/api/endpoints";
import { qk, queryClient } from "@/services/query";
import { useOrgId, useSession } from "@/store/session";
import { useTheme } from "@/theme";
import { toAsciiDigits, toPersianDigits } from "@bashgino/domain";
import type { ClientProfile, Invitation } from "@bashgino/types";
import { useRequireRole } from "@/hooks/useRequireRole";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "فعال",
  INVITED: "در انتظار ثبت‌نام",
  ONBOARDING_PENDING: "در انتظار تکمیل",
  ARCHIVED: "بایگانی",
};

/**
 * Athlete roster.
 *
 * A card list, not a table: at 390dp a five-column table is unreadable. Search
 * and the status tabs are filters over one payload, and the tab counts are
 * always unfiltered totals — a count that moves while you type is a count you
 * cannot trust.
 */
export default function ClientsScreen() {
  useRequireRole(["COACH", "ORG_ADMIN"]);

  const theme = useTheme();
  const orgId = useOrgId();
  const role = useSession((state) => state.activeOrg?.role ?? null);
  const orgType = useSession((state) => state.activeOrg?.organization_type ?? null);
  const { show } = useSnackbar();

  const clients = useClients(orgId);
  const invitations = useQuery<Invitation[]>({
    queryKey: ["invitations", orgId],
    queryFn: () => api.getInvitations(orgId as string, "PENDING"),
    enabled: Boolean(orgId),
  });

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  // A coach inside a gym cannot invite: the gym's admin owns the roster.
  const canInvite = !(orgType === "GYM" && role === "COACH");

  const rows = useMemo(() => clients.data ?? [], [clients.data]);
  const counts = {
    all: rows.length,
    active: rows.filter((client) => client.status === "ACTIVE").length,
    pending: rows.filter((client) => client.status !== "ACTIVE" && client.status !== "ARCHIVED").length,
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((client) => {
      if (tab === "active" && client.status !== "ACTIVE") return false;
      if (tab === "pending" && (client.status === "ACTIVE" || client.status === "ARCHIVED")) return false;
      if (!query) return true;
      const name = client.user?.full_name?.toLowerCase() ?? "";
      const phoneNumber = client.user?.phone_number ?? "";
      return name.includes(query) || phoneNumber.includes(query);
    });
  }, [rows, tab, search]);

  const invite = useMutation({
    mutationFn: () =>
      api.inviteUser(orgId as string, {
        phone_number: toAsciiDigits(phone).trim(),
        role: "CLIENT",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clients(orgId) });
      void queryClient.invalidateQueries({ queryKey: ["invitations", orgId] });
      setInviteOpen(false);
      setPhone("");
      show("دعوت‌نامه پیامک شد.", "success");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "ارسال دعوت انجام نشد."),
  });

  const submitInvite = () => {
    setError(null);
    const digits = toAsciiDigits(phone).trim();
    if (!/^\+?989\d{9}$|^09\d{9}$/.test(digits)) {
      setError("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
      return;
    }
    invite.mutate();
  };

  return (
    <AppScreen
      title="ورزشکاران"
      subtitle="مدیریت شاگردان و دعوت‌های در انتظار"
      refreshing={clients.isRefetching || invitations.isRefetching}
      onRefresh={() => {
        void clients.refetch();
        void invitations.refetch();
      }}
      contentContainerStyle={{ gap: theme.spacing.md }}
    >
      {canInvite ? (
        <Button label="دعوت ورزشکار جدید" icon={UserPlus} onPress={() => setInviteOpen(true)} />
      ) : (
        <Card padded={false} style={{ padding: 10, backgroundColor: theme.colors.surfaceSubtle }}>
          <AppText variant="caption" tone="secondary">
            دعوت ورزشکاران در این باشگاه توسط مدیر انجام می‌شود.
          </AppText>
        </Card>
      )}

      <Input
        placeholder="جست‌وجوی نام یا شماره موبایل"
        value={search}
        onChangeText={setSearch}
        leading={<Search size={17} color={theme.colors.textMuted} strokeWidth={2} />}
        autoCorrect={false}
      />

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { key: "all", label: "همه", count: counts.all },
          { key: "active", label: "فعال", count: counts.active },
          { key: "pending", label: "در انتظار", count: counts.pending },
        ]}
      />

      {invitations.data && invitations.data.length > 0 && tab !== "active" ? (
        <View style={{ gap: 8 }}>
          <AppText variant="overline" tone="muted">
            دعوت‌های در انتظار ({toPersianDigits(invitations.data.length)})
          </AppText>
          {invitations.data.map((invitation) => (
            <Card key={invitation.token} style={{ gap: 8, backgroundColor: theme.colors.warningSubtle, borderColor: theme.colors.warningBorder }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="caption" weight="semibold" numeric>
                    {invitation.recipient_phone_masked ?? invitation.recipient_phone}
                  </AppText>
                  <AppText variant="overline" tone="secondary">
                    {invitation.sms_sent ? "لینک دعوت پیامک شده است" : "پیامک ارسال نشد"}
                  </AppText>
                </View>
                <Button
                  label="کپی لینک"
                  size="sm"
                  variant="secondary"
                  icon={Copy}
                  onPress={async () => {
                    if (!invitation.claim_url) {
                      show("لینک دعوت در دسترس نیست.", "error");
                      return;
                    }
                    await Clipboard.setStringAsync(invitation.claim_url);
                    show("لینک دعوت کپی شد.", "success");
                  }}
                />
                <Button
                  label="ارسال دوباره"
                  size="sm"
                  variant="outline"
                  icon={Send}
                  loading={false}
                  onPress={async () => {
                    try {
                      await api.resendInvitation(orgId as string, invitation.token);
                      show("دعوت‌نامه دوباره ارسال شد.", "success");
                    } catch (err) {
                      show(err instanceof Error ? err.message : "ارسال انجام نشد.", "error");
                    }
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {clients.isLoading ? (
        <SkeletonCard rows={4} />
      ) : clients.isError ? (
        <ErrorState message="فهرست ورزشکاران بارگذاری نشد." onRetry={() => void clients.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={search ? "نتیجه‌ای پیدا نشد" : "هنوز ورزشکاری ندارید"}
          description={
            search
              ? "عبارت دیگری را جست‌وجو کنید."
              : "با دعوت ورزشکار، برنامه تمرینی و تغذیه او را مدیریت کنید."
          }
          icon={<Users size={24} color={theme.colors.brandInk} strokeWidth={1.8} />}
          action={
            canInvite && !search ? (
              <Button label="دعوت ورزشکار" onPress={() => setInviteOpen(true)} />
            ) : undefined
          }
        />
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {visible.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </View>
      )}

      <Sheet
        visible={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setError(null);
        }}
        title="دعوت ورزشکار"
        description="لینک دعوت به شماره موبایل ورزشکار پیامک می‌شود؛ او با همان لینک حساب خود را می‌سازد."
        footer={
          <Button label="ارسال دعوت‌نامه" onPress={submitInvite} loading={invite.isPending} fullWidth />
        }
      >
        <Input
          label="شماره موبایل ورزشکار"
          placeholder="09123456789"
          value={phone}
          onChangeText={(value) => setPhone(toAsciiDigits(value).replace(/[^\d+]/g, "").slice(0, 13))}
          keyboardType="phone-pad"
          numeric
          required
        />
        <FieldError message={error} />
      </Sheet>
    </AppScreen>
  );
}

function ClientRow({ client }: { client: ClientProfile }) {
  const theme = useTheme();
  const trainee = client.user;
  const status = client.status;
  const tone = status === "ACTIVE" ? "success" : status === "ARCHIVED" ? "neutral" : "warning";

  return (
    <Card
      padded={false}
      onPress={() => router.push(`/clients/${client.id}` as never)}
      style={{ padding: theme.spacing.md }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={trainee?.full_name ?? "؟"} />
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {trainee?.full_name ?? "بدون نام"}
          </AppText>
          <AppText variant="caption" tone="muted" numeric>
            {ltrIsolate(trainee?.phone_number ?? "—")}
          </AppText>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            <Badge label={STATUS_LABEL[status] ?? status} tone={tone} />
            {client.primary_coach ? (
              <MetaChip label={`مربی: ${client.primary_coach.full_name}`} />
            ) : (
              <Badge label="بدون مربی" tone="warning" />
            )}
          </View>
        </View>
        <ChevronLeft size={18} color={theme.colors.textMuted} strokeWidth={2} />
      </View>
    </Card>
  );
}
