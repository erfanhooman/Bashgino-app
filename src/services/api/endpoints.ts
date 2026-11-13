/**
 * Typed endpoint functions — one place that knows the URLs.
 *
 * Call sites (screens, hooks) never build a path. If the API grows a trailing
 * slash or renames a segment, exactly one line changes here.
 */
import type {
  AppNotification,
  BodyMeasurement,
  ClientDetail,
  ClientProfile,
  CompleteWorkoutPayload,
  DashboardSummary,
  Equipment,
  ExerciseDetail,
  ExerciseListItem,
  Invitation,
  LoginResponse,
  Membership,
  Muscle,
  NotificationPreferences,
  NutritionLog,
  NutritionPlan,
  NutritionTemplate,
  NutritionTemplateDetail,
  OrgCoach,
  Organization,
  PersonalRecord,
  PlanTemplate,
  ProgressPhoto,
  TodayWorkout,
  TrainingPlan,
  User,
  WorkoutDayDetail,
  WorkoutSchedule,
  WorkoutSessionSummary,
} from "@bashgino/types";

import { apiRequest, saveTokens } from "./client";

const V1 = "/api/v1";

// ── Session ─────────────────────────────────────────────────────────────────

/**
 * Signs in with phone + password.
 *
 * The app always asks for `remember: true`: on a phone the session is the device
 * session, and a token that dies when the OS reclaims the process would force a
 * password every launch. `X-Auth-Transport: bearer` is what makes the server
 * return tokens at all.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const body = await apiRequest<LoginResponse>(`${V1}/auth/login/`, {
    method: "POST",
    anonymous: true,
    body: { username, password, remember: true },
  });
  if (body.access_token) {
    await saveTokens(body.access_token, body.refresh_token ?? null);
  }
  return body;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest(`${V1}/auth/logout/`, { method: "POST" });
  } finally {
    await saveTokens(null, null);
  }
}

export function getMe(): Promise<User> {
  return apiRequest<User>(`${V1}/users/me/`);
}

export function updateMe(payload: Record<string, unknown>): Promise<User> {
  return apiRequest<User>(`${V1}/users/me/`, { method: "PATCH", body: payload });
}

export function getProfile(): Promise<Record<string, unknown>> {
  return apiRequest(`${V1}/users/me/profile/`);
}

export function updateProfile(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return apiRequest(`${V1}/users/me/profile/`, { method: "PATCH", body: payload });
}

export function requestPasswordReset(phoneNumber: string): Promise<{ detail?: string }> {
  return apiRequest(`${V1}/auth/password/reset/request/`, {
    method: "POST",
    anonymous: true,
    body: { phone_number: phoneNumber },
  });
}

export function confirmPasswordReset(payload: {
  phone_number: string;
  code: string;
  new_password: string;
  new_password_confirm?: string;
}): Promise<{ detail?: string }> {
  return apiRequest(`${V1}/auth/password/reset/confirm/`, {
    method: "POST",
    anonymous: true,
    body: payload,
  });
}

export function changePassword(payload: {
  current_password: string;
  new_password: string;
  new_password_confirm?: string;
}): Promise<LoginResponse> {
  return apiRequest(`${V1}/auth/password/change/`, { method: "POST", body: payload });
}

export function sendOtp(phoneNumber: string, purpose: "REGISTRATION" | "PHONE_CHANGE" = "REGISTRATION") {
  return apiRequest<{ detail?: string; dev_code?: string; verification_id?: string }>(
    `${V1}/auth/otp/send/`,
    { method: "POST", anonymous: true, body: { phone_number: phoneNumber, purpose } },
  );
}

export function verifyRegistration(phoneNumber: string, code: string) {
  return apiRequest<{ verification_id: string; existing_user?: boolean }>(
    `${V1}/auth/registration/verify/`,
    { method: "POST", anonymous: true, body: { phone_number: phoneNumber, code } },
  );
}

// ── Workspaces ──────────────────────────────────────────────────────────────

/** Memberships, possibly with the organization expanded. */
export function getMyOrganizations(): Promise<(Membership & { organization: Organization })[]> {
  return apiRequest(`${V1}/organizations/my-organizations/`);
}

export function getOrganization(orgId: string): Promise<Organization> {
  return apiRequest<Organization>(`${V1}/organizations/${orgId}/`);
}

export function updateOrganization(orgId: string, payload: Record<string, unknown>): Promise<Organization> {
  return apiRequest<Organization>(`${V1}/organizations/${orgId}/`, { method: "PATCH", body: payload });
}

export function getOrgCoaches(orgId?: string | null): Promise<OrgCoach[]> {
  // This endpoint wraps its list in `{"coaches": […]}` rather than returning a
  // bare array or DRF's `{count, results}`, so accept all three shapes here.
  return apiRequest<OrgCoach[] | { coaches?: OrgCoach[]; results?: OrgCoach[] }>(
    `${V1}/organizations/coaches/`,
    { orgId },
  ).then((payload) => {
    if (Array.isArray(payload)) return payload;
    return payload.coaches ?? payload.results ?? [];
  });
}

// ── Coach desk ──────────────────────────────────────────────────────────────

export function getDashboardSummary(orgId: string): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>(`${V1}/dashboard-summary/`, { orgId });
}

export function getClients(orgId: string): Promise<ClientProfile[]> {
  return apiRequest<ClientProfile[]>(`${V1}/clients/`, { orgId });
}

export function getClientDetail(orgId: string, clientId: string): Promise<ClientDetail> {
  return apiRequest<ClientDetail>(`${V1}/clients/${clientId}/`, { orgId });
}

export function updateClient(orgId: string, clientId: string, payload: Record<string, unknown>) {
  return apiRequest<ClientProfile>(`${V1}/clients/${clientId}/`, { method: "PATCH", orgId, body: payload });
}

export function assignCoach(orgId: string, clientId: string, coachMembershipId: string, isPrimary = true) {
  return apiRequest(`${V1}/clients/${clientId}/assign/`, {
    method: "POST",
    orgId,
    body: { coach_membership_id: coachMembershipId, is_primary: isPrimary },
  });
}

export function reassignCoach(orgId: string, clientId: string, coachMembershipId: string) {
  return apiRequest(`${V1}/clients/${clientId}/reassign/`, {
    method: "POST",
    orgId,
    body: { new_coach_membership_id: coachMembershipId },
  });
}

export function archiveClient(orgId: string, clientId: string) {
  return apiRequest(`${V1}/clients/${clientId}/archive/`, { method: "POST", orgId });
}

export function getInvitations(orgId: string, status?: string): Promise<Invitation[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<Invitation[]>(`${V1}/invitations/${query}`, { orgId });
}

export function inviteUser(orgId: string, payload: { phone_number: string; role: string; assigned_coach_id?: string }) {
  return apiRequest<Invitation>(`${V1}/invitations/`, { method: "POST", orgId, body: payload });
}

export function resendInvitation(orgId: string, token: string) {
  return apiRequest<{ sms_sent?: boolean }>(`${V1}/invitations/${token}/resend/`, { method: "POST", orgId });
}

// ── Exercise catalogue ──────────────────────────────────────────────────────

export function getExercises(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  muscle?: string;
  equipment?: string;
  category?: string;
  ids?: string[];
} = {}): Promise<ExerciseListItem[] | { count: number; next: string | null; results: ExerciseListItem[] }> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.muscle) query.set("muscle", params.muscle);
  if (params.equipment) query.set("equipment", params.equipment);
  if (params.category) query.set("category", params.category);
  if (params.ids?.length) query.set("ids", params.ids.join(","));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(`${V1}/exercises/${suffix}`);
}

export function getExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
  return apiRequest<ExerciseDetail>(`${V1}/exercises/${exerciseId}/`);
}

export function getMuscles(): Promise<Muscle[]> {
  return apiRequest<Muscle[]>(`${V1}/muscles/`);
}

export function getEquipmentList(): Promise<Equipment[]> {
  return apiRequest<Equipment[]>(`${V1}/equipment/`);
}

// ── Training plans ──────────────────────────────────────────────────────────

export function getTrainingPlans(orgId: string, clientId?: string): Promise<TrainingPlan[]> {
  const query = clientId ? `?client=${encodeURIComponent(clientId)}` : "";
  return apiRequest<TrainingPlan[]>(`${V1}/training-plans/${query}`, { orgId });
}

export function getTrainingPlanDetail(orgId: string, planId: string): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>(`${V1}/training-plans/${planId}/`, { orgId });
}

export function updateTrainingPlan(orgId: string, planId: string, payload: unknown): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>(`${V1}/training-plans/${planId}/`, {
    method: "PATCH",
    orgId,
    body: payload,
  });
}

export function getPlanTemplates(orgId: string, q?: string): Promise<PlanTemplate[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiRequest<PlanTemplate[]>(`${V1}/plan-templates/${query}`, { orgId });
}

export function getPlanTemplateDetail(orgId: string, templateId: string): Promise<PlanTemplate> {
  return apiRequest<PlanTemplate>(`${V1}/plan-templates/${templateId}/`, { orgId });
}

export function createPlanTemplate(orgId: string, payload: unknown): Promise<PlanTemplate> {
  return apiRequest<PlanTemplate>(`${V1}/plan-templates/`, { method: "POST", orgId, body: payload });
}

export function updatePlanTemplate(orgId: string, templateId: string, payload: unknown): Promise<PlanTemplate> {
  return apiRequest<PlanTemplate>(`${V1}/plan-templates/${templateId}/`, {
    method: "PATCH",
    orgId,
    body: payload,
  });
}

export function deletePlanTemplate(orgId: string, templateId: string): Promise<void> {
  return apiRequest(`${V1}/plan-templates/${templateId}/`, { method: "DELETE", orgId });
}

export function setPlanTemplateAssignments(
  orgId: string,
  templateId: string,
  payload: { client_profile_ids: string[]; sync_content?: boolean },
) {
  return apiRequest(`${V1}/plan-templates/${templateId}/assignments/`, {
    method: "PUT",
    orgId,
    body: payload,
  });
}

// ── Trainee workout ─────────────────────────────────────────────────────────

export function getTodayWorkout(orgId: string, date?: string): Promise<TodayWorkout> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiRequest<TodayWorkout>(`${V1}/training-plans/today/${query}`, { orgId });
}

export function getWorkoutSchedule(orgId: string, params: { from?: string; days?: number } = {}): Promise<WorkoutSchedule> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.days) query.set("days", String(params.days));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<WorkoutSchedule>(`${V1}/training-plans/schedule/${suffix}`, { orgId });
}

export function getWorkoutDay(orgId: string, dayId: string, date?: string): Promise<WorkoutDayDetail> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiRequest<WorkoutDayDetail>(`${V1}/training-plans/days/${dayId}/${query}`, { orgId });
}

/**
 * Some list endpoints answer `{count, results}` (the session history does, the
 * roster does not). Normalising here means no screen has to know which.
 */
function unwrapList<T>(payload: T[] | { results?: T[] } | null): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

export function getWorkoutSessions(
  orgId: string,
  params: { limit?: number; clientId?: string } = {},
): Promise<WorkoutSessionSummary[]> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.clientId) query.set("client", params.clientId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<WorkoutSessionSummary[] | { results: WorkoutSessionSummary[] }>(
    `${V1}/workout-sessions/${suffix}`,
    { orgId },
  ).then(unwrapList);
}

export function completeWorkout(orgId: string, payload: CompleteWorkoutPayload): Promise<WorkoutSessionSummary> {
  return apiRequest<WorkoutSessionSummary>(`${V1}/workout-sessions/complete/`, {
    method: "POST",
    orgId,
    body: payload,
  });
}

export function getPersonalRecords(orgId: string, clientId?: string): Promise<PersonalRecord[]> {
  const query = clientId ? `?client=${encodeURIComponent(clientId)}` : "";
  return apiRequest<PersonalRecord[]>(`${V1}/personal-records/${query}`, { orgId });
}

// ── Nutrition ───────────────────────────────────────────────────────────────

export function getNutritionTemplates(orgId: string, q?: string): Promise<NutritionTemplate[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiRequest<NutritionTemplate[]>(`${V1}/nutrition-templates/${query}`, { orgId });
}

export function getNutritionTemplateDetail(
  orgId: string,
  templateId: string,
): Promise<NutritionTemplateDetail> {
  return apiRequest<NutritionTemplateDetail>(`${V1}/nutrition-templates/${templateId}/`, { orgId });
}

export function getNutritionPlans(orgId: string, clientId?: string): Promise<NutritionPlan[]> {
  const query = clientId ? `?client=${encodeURIComponent(clientId)}` : "";
  return apiRequest<NutritionPlan[]>(`${V1}/nutrition-plans/${query}`, { orgId });
}

export function submitNutritionLog(
  orgId: string,
  payload: { log_date: string; meals_followed: string[]; notes?: string },
): Promise<NutritionLog> {
  return apiRequest<NutritionLog>(`${V1}/nutrition-logs/submit/`, { method: "POST", orgId, body: payload });
}

export function getNutritionLogs(orgId: string, clientId?: string): Promise<NutritionLog[]> {
  const query = clientId ? `?client=${encodeURIComponent(clientId)}` : "";
  return apiRequest<NutritionLog[]>(`${V1}/nutrition-logs/${query}`, { orgId });
}

// ── Progress ────────────────────────────────────────────────────────────────

export function getMeasurements(orgId: string, clientId?: string): Promise<BodyMeasurement[]> {
  const query = clientId ? `?client=${encodeURIComponent(clientId)}` : "";
  return apiRequest<BodyMeasurement[]>(`${V1}/measurements/${query}`, { orgId });
}

export function recordMeasurement(orgId: string, payload: Record<string, unknown>): Promise<BodyMeasurement> {
  return apiRequest<BodyMeasurement>(`${V1}/measurements/`, { method: "POST", orgId, body: payload });
}

export function getProgressPhotos(orgId: string, clientId?: string): Promise<ProgressPhoto[]> {
  const query = clientId ? `?client=${encodeURIComponent(clientId)}` : "";
  return apiRequest<ProgressPhoto[]>(`${V1}/progress-photos/${query}`, { orgId });
}

// ── Notifications ───────────────────────────────────────────────────────────

export function getNotifications(orgId?: string | null): Promise<AppNotification[]> {
  return apiRequest<AppNotification[]>(`${V1}/notifications/`, { orgId });
}

export function getUnreadCount(orgId?: string | null): Promise<{ unread_count: number }> {
  return apiRequest<{ unread_count: number }>(`${V1}/notifications/unread-count/`, { orgId });
}

export function markNotificationRead(orgId: string | null, id: string) {
  return apiRequest(`${V1}/notifications/${id}/read/`, { method: "PATCH", orgId });
}

export function markAllNotificationsRead(orgId: string | null) {
  return apiRequest(`${V1}/notifications/mark-all-read/`, { method: "POST", orgId });
}

export function getNotificationPreferences(orgId?: string | null): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>(`${V1}/notifications/preferences/`, { orgId });
}

export function updateNotificationPreferences(orgId: string | null, payload: NotificationPreferences) {
  return apiRequest(`${V1}/notifications/preferences/`, { method: "PATCH", orgId, body: payload });
}

// ── Training authoring ──────────────────────────────────────────────────────
//
// The authoring endpoints take the plan as one document (`days[]` → `exercises[]`,
// each with its own prescription), which is also the shape `packages/domain`
// validates. Screens build the draft, the domain layer checks it, this layer
// ships it.

export function createTrainingPlan(orgId: string, payload: unknown): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>(`${V1}/training-plans/`, { method: "POST", orgId, body: payload });
}

export function deleteTrainingPlan(orgId: string, planId: string) {
  return apiRequest(`${V1}/training-plans/${planId}/`, { method: "DELETE", orgId });
}

export function instantiateTemplate(
  orgId: string,
  templateId: string,
  clientProfileId: string,
  name?: string,
): Promise<TrainingPlan> {
  return apiRequest<TrainingPlan>(`${V1}/plan-templates/${templateId}/instantiate/`, {
    method: "POST",
    orgId,
    body: { client_profile: clientProfileId, ...(name ? { name } : {}) },
  });
}

// ── Nutrition authoring ─────────────────────────────────────────────────────

export function createNutritionTemplate(orgId: string, payload: unknown): Promise<NutritionTemplate> {
  return apiRequest<NutritionTemplate>(`${V1}/nutrition-templates/`, {
    method: "POST",
    orgId,
    body: payload,
  });
}

export function updateNutritionTemplate(
  orgId: string,
  templateId: string,
  payload: unknown,
): Promise<NutritionTemplate> {
  return apiRequest<NutritionTemplate>(`${V1}/nutrition-templates/${templateId}/`, {
    method: "PATCH",
    orgId,
    body: payload,
  });
}

export function deleteNutritionTemplate(orgId: string, templateId: string) {
  return apiRequest(`${V1}/nutrition-templates/${templateId}/`, { method: "DELETE", orgId });
}

export function setNutritionTemplateAssignments(orgId: string, templateId: string, body: unknown) {
  return apiRequest(`${V1}/nutrition-templates/${templateId}/assignments/`, {
    method: "PUT",
    orgId,
    body,
  });
}

export function getNutritionPlanDetail(orgId: string, planId: string): Promise<NutritionPlan> {
  return apiRequest<NutritionPlan>(`${V1}/nutrition-plans/${planId}/`, { orgId });
}

export function createNutritionPlan(orgId: string, payload: unknown): Promise<NutritionPlan> {
  return apiRequest<NutritionPlan>(`${V1}/nutrition-plans/`, { method: "POST", orgId, body: payload });
}

export function updateNutritionPlan(
  orgId: string,
  planId: string,
  payload: unknown,
): Promise<NutritionPlan> {
  return apiRequest<NutritionPlan>(`${V1}/nutrition-plans/${planId}/`, {
    method: "PATCH",
    orgId,
    body: payload,
  });
}

// ── Custom exercises ────────────────────────────────────────────────────────

export function getCustomExercises(orgId?: string | null): Promise<ExerciseListItem[]> {
  return apiRequest<{ results?: ExerciseListItem[] } | ExerciseListItem[]>(
    `${V1}/custom-exercises/`,
    { orgId },
  ).then((payload) => (Array.isArray(payload) ? payload : payload.results ?? []));
}

export function createCustomExercise(
  orgId: string,
  payload: { name: string; category?: string; instructions?: string },
): Promise<ExerciseListItem> {
  return apiRequest<ExerciseListItem>(`${V1}/custom-exercises/`, {
    method: "POST",
    orgId,
    body: payload,
  });
}

// ── Onboarding / invitations ────────────────────────────────────────────────
//
// These run before a session exists, so they opt out of the Authorization header
// (`anonymous`) and must not carry a tenant id.

export function register(payload: {
  full_name: string;
  phone_number?: string;
  email?: string;
  password: string;
  password_confirm?: string;
  account_type?: "ORGANIZATION" | "COACH";
  organization_name?: string;
  otp_code?: string;
  verification_id?: string;
  /** The API refuses an account without consent; keep it required here too. */
  terms_accepted: true;
  terms_version?: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(`${V1}/auth/register/`, {
    method: "POST",
    anonymous: true,
    body: {
      ...payload,
      password_confirm: payload.password_confirm ?? payload.password,
    },
  });
}

export function getSpaceDetailsSchema(language: "fa" | "en" = "fa") {
  return apiRequest<unknown>(`${V1}/organizations/space-details-schema/?lang=${language}`);
}

export function createSpace(payload: {
  name: string;
  organization_type?: "GYM" | "SOLO_STUDIO";
  details?: Record<string, unknown>;
  contact_email?: string;
  contact_phone?: string;
  verification_id?: string;
}): Promise<Organization> {
  return apiRequest<Organization>(`${V1}/organizations/`, {
    method: "POST",
    body: {
      name: payload.name,
      organization_type: payload.organization_type ?? "GYM",
      details: payload.details ?? {},
      contact_email: payload.contact_email,
      contact_phone: payload.contact_phone,
      ...(payload.verification_id ? { verification_id: payload.verification_id } : {}),
    },
  });
}

export function getInvitation(token: string): Promise<Invitation> {
  return apiRequest<Invitation>(`${V1}/invitations/${token}/`, { anonymous: true });
}

export function sendInviteOtp(token: string) {
  return apiRequest<{ sent?: boolean }>(`${V1}/invitations/${token}/otp/send/`, {
    method: "POST",
    anonymous: true,
    body: {},
  });
}

export function verifyInviteOtp(token: string, code: string) {
  return apiRequest<{ verification_id: string }>(`${V1}/invitations/${token}/otp/verify/`, {
    method: "POST",
    anonymous: true,
    body: { code },
  });
}

export function claimInvitation(
  token: string,
  payload: {
    verification_id: string;
    full_name: string;
    password: string;
    password_confirm?: string;
    birth_date?: string | null;
  },
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(`${V1}/invitations/${token}/claim/`, {
    method: "POST",
    anonymous: true,
    body: {
      ...payload,
      password_confirm: payload.password_confirm ?? payload.password,
      birth_date: payload.birth_date ?? null,
    },
  });
}

export function acceptInvitation(token: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(`${V1}/invitations/${token}/claim/`, {
    method: "POST",
    body: {},
  });
}

// ── Uploads ─────────────────────────────────────────────────────────────────

export function getUploadIntent(orgId: string, payload: { kind: string; content_type?: string }) {
  return apiRequest<{ upload_url: string; photo_id?: string; fields?: Record<string, string> }>(
    `${V1}/progress-photos/upload-intent/`,
    { method: "POST", orgId, body: payload },
  );
}

export function confirmPhotoUpload(orgId: string, photoId: string, payload: unknown = {}) {
  return apiRequest(`${V1}/progress-photos/${photoId}/confirm/`, {
    method: "POST",
    orgId,
    body: payload,
  });
}

export function submitPhotoFeedback(orgId: string, photoId: string, payload: unknown) {
  return apiRequest(`${V1}/progress-photos/${photoId}/`, {
    method: "PATCH",
    orgId,
    body: payload,
  });
}

/**
 * Upload a local image as the current user's avatar.
 *
 * React Native has no `File`/`Blob` for a picked asset, so the multipart body is
 * assembled from `{uri, name, type}` — `apiRequest` passes FormData through
 * untouched so the runtime can set the boundary.
 */
export function uploadAvatar(uri: string, mimeType = "image/jpeg") {
  const extension = mimeType.split("/")[1] ?? "jpg";
  const form = new FormData();
  form.append("file", {
    uri,
    name: `avatar.${extension}`,
    type: mimeType,
  } as unknown as Blob);
  return apiRequest<{ avatar_url?: string }>(`${V1}/users/me/avatar/`, {
    method: "POST",
    body: form,
  });
}
