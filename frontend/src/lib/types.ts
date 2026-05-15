export type Role = "super_admin" | "gym_admin" | "coach" | "athlete" | "nutritionist" | "receptionist"

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
  plan?: string
  date_joined?: string
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
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Challenge = {
  id: string
  gym: string | null
  name: string
  description: string
  type: "attendance" | "distance" | "workouts" | "nutrition" | "mixed"
  start_date: string
  end_date: string
  reward_points: number
  goal_value: number
  status: "draft" | "active" | "completed" | "archived"
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
