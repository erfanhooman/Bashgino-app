/**
 * API contracts.
 *
 * These mirror the DRF serializers exactly — field names, nullability and the
 * snake_case keys the API actually sends. They were derived by introspecting the
 * running backend (`Serializer().fields`), not from the OpenAPI document, which
 * carries no component schemas for this project.
 *
 * When a serializer changes, change the matching interface here: the Android
 * client is written against these types, so a stale shape is a compile error at
 * the call site instead of a blank row on a screen.
 */

// ── Identity and tenancy ────────────────────────────────────────────────────

export type MembershipRole = "ORG_ADMIN" | "COACH" | "CLIENT";
export type OrganizationType = "GYM" | "SOLO_STUDIO";
export type OnboardingStatus = "INVITED" | "ONBOARDING_PENDING" | "ACTIVE" | "ARCHIVED";

export interface UserProfile {
  id?: string;
  birth_date?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  bio?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

export interface User {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
  is_platform_admin: boolean;
  onboarding_status: OnboardingStatus;
  onboarding_step: number;
  phone_verified: boolean;
  role: MembershipRole | null;
  account_type: string | null;
  last_login_at: string | null;
  created_at: string;
  profile: UserProfile | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  activities: string[] | null;
  city: string | null;
  address: string | null;
  coach_count: number | null;
  branch_count: number | null;
  website: string | null;
  social_handles: string[] | null;
  description: string | null;
  details: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  user: User | string;
  organization: Organization | string;
  role: MembershipRole;
  is_active: boolean;
  joined_at: string;
}

/** The workspace block every successful auth response carries. */
export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
}

export interface LoginResponse {
  expires_in: number;
  session_id: string;
  remembered: boolean;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  active_organization: ActiveOrganization | null;
  user: User;
}

// ── Organization staff ──────────────────────────────────────────────────────

export interface OrgCoach {
  membership_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: MembershipRole;
  is_active: boolean;
  joined_at: string;
  client_count: number;
  active_plans: number;
}

// ── Roster ──────────────────────────────────────────────────────────────────

export type ClientStatus = "INVITED" | "ONBOARDING_PENDING" | "ACTIVE" | "ARCHIVED";

export interface PrimaryCoach {
  full_name: string;
  coach_membership_id: string;
  coach_id: string;
  email?: string | null;
}

/**
 * The roster row. There is deliberately no `membership` key: the trainee is
 * `user` and the responsible coach is `primary_coach`. Reading
 * `client.membership.user` silently renders an unnamed row for everyone.
 */
export interface ClientProfile {
  id: string;
  organization: string;
  status: ClientStatus;
  notes: string | null;
  user: User | null;
  primary_coach: PrimaryCoach | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDetail extends ClientProfile {
  training_plans?: TrainingPlan[];
  nutrition_plans?: NutritionPlan[];
  measurements?: BodyMeasurement[];
  personal_records?: PersonalRecord[];
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSummary {
  week: { from: string; to: string };
  workouts_logged: number;
  active_plans: number;
  active_clients: number;
  total_clients: number;
  pending_clients: number;
}

// ── Exercise catalogue ──────────────────────────────────────────────────────

export interface Muscle {
  id: string;
  canonical_name: string;
  localized_name_fa?: string | null;
  body_part?: string | null;
  heatmap_id?: string | null;
  view?: string | null;
}

export interface Equipment {
  id: string;
  canonical_name: string;
  localized_name_fa?: string | null;
}

export interface ExerciseMedia {
  id: string;
  url: string;
  media_type?: string | null;
  order_index?: number | null;
  pose?: string | null;
}

export interface ExerciseTranslation {
  language?: string;
  name?: string;
  description?: string | null;
  instructions?: string | null;
  coach_tips?: string | null;
}

export interface ExerciseListItem {
  id: string;
  canonical_name: string;
  localized_name: string | null;
  thumbnail_url: string | null;
  image_urls?: string[];
  category: string | null;
  movement_pattern: string | null;
  exercise_type: string | null;
  difficulty: string | null;
  primary_muscles: Muscle[];
  equipment: Equipment[];
  is_deprecated: boolean;
}

export interface ExerciseDetail extends ExerciseListItem {
  translations?: ExerciseTranslation[];
  secondary_muscles?: Muscle[];
  media?: ExerciseMedia[];
  instructions?: string | null;
  description?: string | null;
}

// ── Training plans ──────────────────────────────────────────────────────────

export type PlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ScheduleMode = "WEEKLY" | "EXACT";

export interface TrainingPlanExercise {
  id: string;
  exercise: string;
  exercise_name: string;
  alternative_exercise: string | null;
  order_index: number;
  target_sets: number;
  target_reps: string;
  target_duration_seconds: number | null;
  target_weight_kg: number | null;
  target_rpe: number | null;
  rest_interval_seconds: number;
  tempo: string | null;
  coach_instructions: string | null;
}

export interface TrainingPlanDay {
  id: string;
  day_number: number;
  name: string;
  description: string | null;
  order_index: number;
  weekday: number | null;
  scheduled_date: string | null;
  exercises: TrainingPlanExercise[];
}

export interface PlanSummaryDay {
  id: string;
  day_number: number;
  name: string;
  weekday: number | null;
  scheduled_date: string | null;
  exercise_count: number;
}

export interface PlanSummary {
  next_date?: string | null;
  next_day?: PlanSummaryDay | null;
  id: string;
  name: string;
  goal: string;
  schedule_mode: ScheduleMode;
  start_date: string | null;
  end_date: string | null;
  revision_number?: number;
  days?: PlanSummaryDay[];
}

export interface TrainingPlan {
  id: string;
  organization: string;
  client_profile: string;
  client_name: string;
  creator_membership: string | null;
  creator_name: string | null;
  name: string;
  description: string | null;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  schedule_mode: ScheduleMode;
  status: PlanStatus;
  revision_number: number;
  days: TrainingPlanDay[];
  source_template: string | null;
  created_at: string;
  updated_at: string;
}

// ── Schedule / today ────────────────────────────────────────────────────────

export type TodayReason =
  | "SCHEDULED"
  | "REST_DAY"
  | "BEFORE_START"
  | "PLAN_FINISHED"
  | "NO_PLAN"
  | "NO_DAYS";

export interface TodayWorkout {
  date: string;
  weekday: number;
  schedule_mode: ScheduleMode | null;
  reason: TodayReason;
  plan: PlanSummary | null;
  day: TrainingPlanDay | null;
  next_date: string | null;
  next_day: PlanSummaryDay | null;
}

export interface ScheduleOccurrence {
  date: string;
  weekday: number;
  is_today: boolean;
  status: "SCHEDULED" | "COMPLETED";
  day: {
    id: string;
    name: string;
    day_number: number;
    weekday: number | null;
    exercise_count: number;
    set_count: number;
  };
}

export interface WorkoutSchedule {
  from: string | null;
  to: string | null;
  plan: PlanSummary | null;
  occurrences: ScheduleOccurrence[];
}

/** `GET /training-plans/days/<id>/` — the overview before starting a session. */
export interface WorkoutDayDetail {
  plan: PlanSummary;
  day: TrainingPlanDay;
  session: WorkoutSessionSummary | null;
  [key: string]: unknown;
}

// ── Sessions ────────────────────────────────────────────────────────────────

export type WorkoutSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface WorkoutSessionSummary {
  id: string;
  client_profile: string;
  plan_day_id: string | null;
  plan_day_name: string | null;
  plan_name: string | null;
  started_at: string;
  completed_at: string | null;
  status: WorkoutSessionStatus;
  client_notes: string | null;
  set_count: number;
  completed_set_count: number;
  exercise_count: number;
  duration_seconds: number | null;
  total_volume_kg: number | null;
}

export interface WorkoutLogSet {
  id?: string;
  exercise: string;
  exercise_name?: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight_kg: number | null;
  actual_rpe: number | null;
  actual_duration_seconds: number | null;
  is_completed: boolean;
}

/** What the client posts to `workout-sessions/complete/`. */
export interface CompleteWorkoutPayload {
  client_session_uuid: string;
  plan_day_id?: string | null;
  started_at: string;
  completed_at?: string;
  client_notes?: string;
  sets: Array<{
    exercise_id: string;
    set_number: number;
    actual_reps?: number | null;
    actual_weight_kg?: number | null;
    actual_rpe?: number | null;
    actual_duration_seconds?: number | null;
    is_completed?: boolean;
  }>;
}

// ── Plan templates ──────────────────────────────────────────────────────────

export interface PlanTemplateDay {
  key?: string;
  name: string;
  week_day?: number | null;
  scheduled_date?: string | null;
  exercises: Array<{
    exercise_id: string;
    name?: string;
    sets: number;
    reps: string;
    duration_seconds?: number | null;
    weight_kg?: number | null;
    rpe?: number | null;
    rest_seconds: number;
    tempo?: string;
    instructions?: string;
  }>;
}

export interface PlanTemplate {
  id: string;
  organization: string;
  name: string;
  description: string | null;
  goal: string;
  schedule_mode: ScheduleMode;
  day_count: number;
  exercise_count: number;
  assigned_count: number;
  is_ready: boolean;
  can_manage: boolean;
  days?: unknown[];
  assignments?: Array<{
    plan_id?: string;
    client_profile: string;
    client_name?: string;
    is_active?: boolean;
    start_date?: string | null;
    end_date?: string | null;
  }>;
  created_at: string;
  updated_at: string;
}

// ── Nutrition ───────────────────────────────────────────────────────────────
//
// Shapes below mirror `apps/nutrition/serializers.py` exactly. An earlier draft
// guessed at `title`/`foods`/`amount`; the API says `name`/`food_items`/
// `quantity`, and a wrong guess renders a plan with empty meal names.

export interface MealFoodItem {
  id?: string;
  food_name: string;
  quantity: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source?: string;
  alternatives?: string;
  order_index?: number;
}

export interface NutritionMeal {
  id?: string;
  name: string;
  time_indicator: string;
  order_index?: number;
  target_calories: number | null;
  coach_notes: string;
  is_mandatory: boolean;
  food_items: MealFoodItem[];
}

export interface NutritionAssignment {
  plan_id: string;
  client_profile: string;
  client_name: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export interface NutritionTemplate {
  id: string;
  organization?: string;
  creator_membership?: string | null;
  creator_name?: string;
  name: string;
  description: string | null;
  daily_calories_target: number | null;
  protein_grams_target: number | string | null;
  carbs_grams_target: number | string | null;
  fat_grams_target: number | string | null;
  is_public_to_org: boolean;
  meal_count: number;
  food_count: number;
  assigned_count: number;
  is_ready: boolean;
  can_manage: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NutritionTemplateDetail extends NutritionTemplate {
  meals: NutritionMeal[];
  assignments: NutritionAssignment[];
}

export interface NutritionPlan {
  id: string;
  organization?: string;
  client_profile: string;
  client_name?: string;
  creator_name?: string;
  source_template?: string | null;
  name: string;
  description: string | null;
  daily_calories_target: number | null;
  protein_grams_target: number | string | null;
  carbs_grams_target: number | string | null;
  fat_grams_target: number | string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  meals: NutritionMeal[];
  created_at?: string;
  updated_at?: string;
}

export interface NutritionLog {
  id: string;
  client_profile: string;
  log_date: string;
  meals_followed: string[];
  notes: string | null;
  created_at: string;
}

// ── Invitations ─────────────────────────────────────────────────────────────

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export interface Invitation {
  token: string;
  organization: string;
  organization_name: string;
  recipient_phone: string;
  recipient_phone_masked?: string;
  role: MembershipRole;
  status: InvitationStatus;
  created_at: string;
  expires_at: string | null;
  claim_url?: string;
  sms_sent?: boolean;
}

export interface PublicInvitation {
  organization_name: string;
  organization_type: OrganizationType;
  role: MembershipRole;
  inviter_name: string | null;
  recipient_phone_masked: string;
  recipient_matches_session: boolean | null;
  status: InvitationStatus;
  expires_at: string | null;
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  client_profile: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
  created_at: string;
}

export interface ProgressPhoto {
  id: string;
  client_profile: string;
  pose: string;
  taken_at: string;
  notes: string | null;
  photo_url: string | null;
  status: "PENDING" | "CONFIRMED" | string;
  coach_feedback: string | null;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  client_profile: string;
  exercise: string;
  exercise_name: string;
  record_type: string;
  value: number;
  achieved_at: string;
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  organization: string | null;
  title: string;
  message: string;
  notification_type: string;
  target_route: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  [key: string]: boolean;
}

// ── Errors ──────────────────────────────────────────────────────────────────

export interface BilingualMessage {
  en?: string;
  fa?: string;
}

export type FieldErrors = Record<string, BilingualMessage | string | string[]>;

export interface ApiErrorBody {
  code?: string;
  message?: string;
  message_en?: string;
  message_fa?: string;
  messages?: BilingualMessage;
  field_errors?: FieldErrors;
  [key: string]: unknown;
}
