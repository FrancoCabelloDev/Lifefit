export type Role = "super_admin" | "gym_admin" | "coach" | "athlete" | "nutritionist" | "receptionist"

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  gym_admin: 'Administrador',
  coach: 'Coach',
  athlete: 'Atleta',
  nutritionist: 'Nutricionista',
  receptionist: 'Atención al Cliente',
}

export const ROLE_HEADERS: Record<Role, string> = {
  super_admin: 'Panel Super Admin',
  gym_admin: 'Panel Admin',
  coach: 'Panel Coach',
  athlete: 'Mi Espacio',
  nutritionist: 'Panel Nutricionista',
  receptionist: 'Panel Recepción',
}

export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'custom'

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  price: string
  currency: string
  billing_cycle: BillingCycle
  user_limit: number | null
  max_athletes: number
  max_coaches: number
  max_nutritionists: number
  features: Record<string, boolean>
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  puntos: number
  nivel: number
  gym?: string | number | null
  is_google_account?: boolean
  phone?: string | null
  dni?: string | null
  active_membership?: GymSubscription | null
  date_joined?: string
  // Perfil profesional
  profile_picture?: string | null
  bio?: string
  specialty?: string
  years_experience?: number | null
  max_clients?: number
  // Datos físicos autoreportados (atletas)
  height_cm?: number | null
  weight_kg?: number | null
}

export type StaffProfile = {
  id: string
  first_name: string
  last_name: string
  role: 'coach' | 'nutritionist'
  profile_picture: string | null
  bio: string
  specialty: string
  years_experience: number | null
  current_clients: number
  max_clients: number
  is_available: boolean
}

export type LoginResponse = {
  access: string
  refresh: string
  user: User
}

export type Gym = {
  id: string
  name: string
  slug: string
  logo: string | null
  brand_color: string
  status: string
  ruc?: string
  location?: string
  contact_email?: string
  website?: string
  active_plan?: {
    name: string
    price: number
    billing_cycle: string
    start_date: string
  } | null
  created_at?: string
  deleted_at?: string | null
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type ChallengeVerificationType = "automatic" | "manual"
export type ChallengeTargetRole = "all" | "athlete" | "coach" | "nutritionist"

export type Challenge = {
  id: string
  gym: string | null
  name: string
  description: string
  type: "attendance" | "distance" | "workouts" | "nutrition" | "mixed"
  start_date: string
  start_time: string | null
  end_date: string
  responsible: string | null
  responsible_name: string | null
  responsible_role: string | null
  reward_points: number
  goal_value: number
  status: "draft" | "active" | "completed" | "archived"
  // Verificación
  verification_type: ChallengeVerificationType
  // Participantes
  max_participants: number | null
  current_participants: number
  is_full: boolean
  // Audiencia
  target_role: ChallengeTargetRole
  created_at: string
  updated_at: string
}

export type Badge = {
  id: string
  gym?: string | null
  name: string
  description: string
  icon: string
  condition: string
  created_at: string
  updated_at: string
}

export type StaffMember = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  date_joined: string
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete'

export type Subscription = {
  id: string
  owner_gym: string | null
  owner_user: string | null
  plan: string
  plan_detail: SubscriptionPlan
  gym_name: string | null
  gym_slug: string | null
  status: SubscriptionStatus
  start_date: string
  end_date: string | null
  next_billing_date: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'success' | 'pending' | 'failed'

export type Payment = {
  id: string
  subscription: string
  subscription_detail: Subscription
  gym_name: string
  gym_slug: string
  plan_name: string
  amount: string
  currency: string
  status: PaymentStatus
  paid_at: string
  provider: string
  external_id: string
  created_at: string
  updated_at: string
}

export type PaymentMetrics = {
  mrr: number
  arr: number
  monthly_income: number
  mrr_change: number
  pending_payments: number
  total_gyms_with_subscriptions: number
  currency: string
}

export type RevenuePoint = {
  month: string
  total: number
}

export type SubscriptionTier = 'basic' | 'premium' | null

export type GymMembershipPlan = {
  id: number
  gym: string
  gym_name: string
  name: string
  description: string
  price: string
  duration_days: number
  features: string[]
  is_active: boolean
  tier: 'basic' | 'premium'
  created_at: string
  updated_at: string
}

export type GymSubscriptionStatus = 'active' | 'expired' | 'canceled'

export type GymSubscription = {
  id: string
  athlete: string
  athlete_name: string
  gym: string
  plan: number | null
  plan_name: string | null
  plan_price: number | null
  plan_tier: 'basic' | 'premium' | null
  status: GymSubscriptionStatus
  start_date: string
  end_date: string | null
  auto_renew: boolean
  days_remaining: number | null
  is_expired: boolean
  created_at: string
  updated_at: string
}

export type GymPaymentStatus = 'success' | 'pending' | 'failed' | 'refunded'

export type GymPayment = {
  id: string
  gym: string
  subscription: string | null
  athlete: string | null
  athlete_name: string | null
  plan: number | null
  plan_name: string | null
  amount: string
  currency: string
  status: GymPaymentStatus
  paid_at: string
  due_date: string | null
  payment_method: string
  reference: string
  notes: string
  created_at: string
  updated_at: string
}

export type GymPaymentMetrics = {
  total_collected: number
  this_month: number
  pending_count: number
  failed_count: number
}

export type CheckIn = {
  id: string
  user: string
  user_name: string
  user_role: string
  gym: string
  branch: string | null
  branch_name: string | null
  method: 'manual' | 'qr' | 'self'
  timestamp: string
  created_at: string
}

export type NutritionistAssignment = {
  id: string
  nutritionist: string
  nutritionist_name: string
  athlete: string
  athlete_name: string
  gym: string
  is_active: boolean
  assigned_at: string
  created_at: string
}

export type CoachAthlete = {
  id: string
  first_name: string
  last_name: string
  email: string
  nivel: number
  puntos: number
  has_active_routine: boolean
  routine_name: string | null
  routine_id: string | null
  has_active_plan: boolean
  plan_name: string | null
  sessions_last_7_days: number
  is_at_risk: boolean
  assigned_at: string | null
}

export type NutritionistAthlete = {
  id: string
  first_name: string
  last_name: string
  email: string
  nivel: number
  puntos: number
  has_active_plan: boolean
  plan_name: string | null
  plan_id: string | null
  meals_completed_today: number
  compliance_percentage: number
}

export type CoachAtRisk = {
  id: string
  first_name: string
  last_name: string
  email: string
  nivel: number
  puntos: number
  last_session: string | null
}

export type CoachDashboard = {
  total_athletes: number
  with_active_routine: number
  with_active_plan: number
  sessions_today: number
  sessions_week: number
  active_challenges: number
  at_risk_count: number
  at_risk_athletes: CoachAtRisk[]
  top_athletes: { id: string; first_name: string; last_name: string; puntos: number; nivel: number }[]
}

export type NutritionistDashboard = {
  total_athletes: number
  with_active_plan: number
  completed_plans: number
  avg_compliance_percentage: number
  meals_logged_week: number
  low_compliance_athletes: number
  reviews_pending: {
    assignment_id: string
    athlete_id: string
    athlete_name: string
    plan_name: string
    requested_at: string
  }[]
}

export type CoachAssignment = {
  id: string
  coach: string
  coach_name: string
  athlete: string
  athlete_name: string
  gym: string
  is_active: boolean
  assigned_at: string
  created_at: string
}

export type Notification = {
  id: string
  recipient: string
  recipient_name: string
  actor: string | null
  actor_name: string | null
  notification_type: string
  title: string
  message: string
  gym: string | null
  is_read: boolean
  link: string
  created_at: string
  updated_at: string
}

export type ComplianceDay = {
  date: string
  compliance: number
  completed: number
  total: number
}

export type DashboardStats = {
  total_athletes: number
  active_athletes: number
  inactive_athletes: number
  checkins_today: number
  checkins_week: number
  checkins_month: number
  athletes_joined_month: number
  growth_rate: number
  sessions_today: number
  active_coaches: number
  active_nutritionists: number
  expiring_memberships: { id: string; name: string; plan: string; end_date: string | null; days_remaining: number | null }[]
  date: string
}

export type Exercise = {
  id: string
  gym: string | null
  name: string
  category: 'strength' | 'cardio' | 'mobility' | 'flexibility' | 'hiit'
  equipment: string
  muscle_group: string
  description: string
  media_url: string
  created_at: string
  updated_at: string
}

export type WorkoutRoutine = {
  id: string
  gym: string | null
  name: string
  objective: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number
  status: 'draft' | 'published' | 'archived'
  points_reward: number
  created_by: string | null
  is_public: boolean
  notes: string
  routine_exercises: RoutineExercise[]
  completed_by_me: boolean
  completed_today: boolean
  created_at: string
  updated_at: string
}

export type RoutineExercise = {
  id: string
  routine: string
  exercise: string
  exercise_detail: Exercise
  order: number
  sets: number
  reps: number
  rest_seconds: number
  tempo: string
  weight_kg: number | null
  created_at: string
  updated_at: string
}

export type NutritionPlan = {
  id: string
  gym: string | null
  name: string
  description: string
  calories_per_day: number
  protein_g: number
  carbs_g: number
  fats_g: number
  duration_days: number
  status: 'draft' | 'active' | 'archived'
  points_reward: number
  meals_by_day: Record<string, MealTemplate[]>
  total_meals: number
  user_assignment: any | null
  created_at: string
  updated_at: string
}

export type MealWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type MealType = 'breakfast' | 'mid_morning' | 'lunch' | 'afternoon_snack' | 'dinner' | 'late_snack'

export type MealTemplate = {
  id: string
  plan: string
  day_number: number | null
  weekday: MealWeekday | null
  weekday_display: string
  meal_type: MealType
  meal_type_display: string
  name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  ingredients: string
  instructions: string
  order: number
  food_items?: any[]
  created_at: string
  updated_at: string
}

export type UserRoutineAssignment = {
  id: string
  user: string
  routine: string
  routine_detail: WorkoutRoutine | null
  assigned_by: string | null
  start_date: string
  end_date: string | null
  status: 'active' | 'paused' | 'completed'
  compliance_percentage: number
  created_at: string
  updated_at: string
}

export type ParticipationStatus = "joined" | "pending_review" | "completed" | "rejected" | "dropped"

export type ChallengeParticipation = {
  id: string
  challenge: string
  challenge_detail: Challenge | null
  user: string
  user_detail: { id: string; email: string; first_name?: string; last_name?: string } | null
  progress: number
  progress_percentage: number
  status: ParticipationStatus
  points_earned: number
  last_update: string
  // Verificación manual
  evidence_note: string
  verified_by: string | null
  verified_by_name: string | null
  verified_at: string | null
  rejection_note: string
  created_at: string
  updated_at: string
}

export type UserBadge = {
  id: string
  user: string
  badge: string
  badge_detail: Badge | null
  awarded_at: string
}

export type MealLogStatus = 'completed' | 'skipped' | 'alternative'

export type UserMealLog = {
  id: string
  user: string
  meal_template: string
  date: string
  completed: boolean
  status: MealLogStatus
  alternative_food_text: string
  notes: string
  created_at: string
  updated_at: string
}

export type UserNutritionPlan = {
  id: string
  user: string
  plan: string
  plan_detail: NutritionPlan | null
  assigned_by: string | null
  start_date: string
  end_date: string | null
  status: string
  compliance_percentage: number
  created_at: string
  updated_at: string
}

export type UserProgress = {
  id: string
  user: string
  user_detail: { id: string; email: string; first_name?: string; last_name?: string } | null
  level: number
  total_points: number
  current_xp: number
  next_level_xp: number
  streak_days?: number
  created_at: string
  updated_at: string
}

export type NutritionistAppointment = {
  id: string
  nutritionist: string
  nutritionist_name: string
  athlete: string
  athlete_name: string
  athlete_email: string
  gym: string
  scheduled_at: string
  duration_minutes: number
  appointment_type: 'first' | 'followup'
  appointment_type_display: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'reschedule_requested'
  status_display: string
  notes: string
  clinical_notes: string
  reschedule_note: string
  cancelled_by: string
  created_at: string
  updated_at: string
}

export type NutritionistMessage = {
  id: string
  nutritionist: string
  athlete: string
  athlete_name: string
  sender_name: string
  gym: string
  sender_is_nutritionist: boolean
  body: string
  is_read: boolean
  created_at: string
}

export type NutritionistMessageThread = {
  athlete_id: string
  athlete_name: string
  athlete_email: string
  last_message: string
  last_message_at: string | null
  unread: number
  total: number
}

export type BodyMeasurement = {
  id: string
  athlete: string
  nutritionist: string | null
  gym: string
  measured_at: string
  weight_kg: string | null
  height_cm: string | null
  body_fat_pct: string | null
  muscle_mass_kg: string | null
  waist_cm: string | null
  hip_cm: string | null
  arm_cm: string | null
  visceral_fat: number | null
  notes: string
  bmi: number | null
  recorded_by: string | null
  created_at: string
}

export type NutritionistAppointmentStats = {
  new_clients: number
  new_clients_delta: number
  first_consultations: number
  followup_consultations: number
  messages_sent: number
  cancelled_appointments: NutritionistAppointment[]
}
