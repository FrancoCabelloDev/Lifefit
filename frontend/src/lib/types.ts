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
