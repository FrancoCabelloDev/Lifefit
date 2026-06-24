'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Dumbbell, Activity, TrendingUp, CalendarCheck, Calendar, Clock, UserPlus, CheckCircle2, AlertTriangle, Target, Zap, Award, Medal, Trophy, Apple, ListOrdered, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TableSkeleton, ChartSkeleton, StatsCardSkeleton, CardSkeleton } from '@/components/ui/skeletons'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, DashboardStats, Role, CoachDashboard, CoachAthlete, NutritionistDashboard, NutritionistAthlete } from '@/lib/types'
import { useSubscriptionTier } from '@/lib/hooks'
import NutritionistDashboardView from '@/components/nutritionist/NutritionistDashboard'
import CoachDashboardView from '@/components/coach/CoachDashboard'
import OnboardingModal from '@/components/athlete/OnboardingModal'
import { BookUser, UserCheck } from 'lucide-react'

export default function GymDashboard({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  const router = useRouter()

  const storedUser = getStoredUser<User>()
  if (!storedUser) {
    router.push('/tugimnasio')
    return null
  }

  const user = storedUser
  const adminName = storedUser.first_name || 'Usuario'

  const gymQuery = useQuery({
    queryKey: ['gym', gymId],
    queryFn: async () => {
      const data = await api.get<any>("/api/gyms/gyms/", { params: { slug: gymId } })
      const g = data.results?.[0] || (Array.isArray(data) ? data[0] : null)
      return g?.name || 'tu Gimnasio'
    },
    staleTime: 60000,
  })
  const gymName = gymQuery.data || 'tu Gimnasio'

  const statsQuery = useQuery({
    queryKey: ['gym-stats', gymId],
    queryFn: () => api.get<DashboardStats>("/api/gyms/dashboard/stats/"),
    enabled: user.role !== 'athlete',
  })

  const athleteDashboardQuery = useQuery({
    queryKey: ['athlete-dashboard', gymId],
    queryFn: () => api.get<any>("/api/challenges/progress/my_dashboard/"),
    enabled: user.role === 'athlete',
  })

  const rankingQuery = useQuery({
    queryKey: ['ranking', gymId],
    queryFn: () => api.get<any>('/api/gamification/ranking/', { params: { gym_slug: gymId } }),
    enabled: user.role === 'athlete',
  })

  const myTeamQuery = useQuery({
    queryKey: ['my-team', gymId],
    queryFn: async () => {
      const [coachDir, nutriDir, coachAssign, nutriAssign] = await Promise.all([
        api.get<any>('/api/gyms/staff-directory/', { params: { role: 'coach' } }),
        api.get<any>('/api/gyms/staff-directory/', { params: { role: 'nutritionist' } }),
        api.get<any>('/api/gyms/coach-assignments/', { params: { is_active: 'true' } }),
        api.get<any>('/api/gyms/nutritionist-assignments/', { params: { is_active: 'true' } }),
      ])
      const coaches: any[] = Array.isArray(coachDir) ? coachDir : []
      const nutris: any[] = Array.isArray(nutriDir) ? nutriDir : []
      const activeCoach = (Array.isArray(coachAssign) ? coachAssign : coachAssign?.results || []).find((a: any) => a.is_active)
      const activeNutri = (Array.isArray(nutriAssign) ? nutriAssign : nutriAssign?.results || []).find((a: any) => a.is_active)
      const myCoach = activeCoach ? coaches.find((c: any) => c.id === activeCoach.coach) ?? null : null
      const myNutri = activeNutri ? nutris.find((n: any) => n.id === activeNutri.nutritionist) ?? null : null
      return { myCoach, myNutri }
    },
    enabled: user.role === 'athlete',
    staleTime: 30000,
  })

  const coachDashQuery = useQuery({
    queryKey: ['coach-dashboard', gymId],
    queryFn: () => api.get<CoachDashboard>("/api/gyms/coach-assignments/dashboard/"),
    enabled: user.role === 'coach',
  })

  const [coachSearch, setCoachSearch] = useState('')
  const [coachPage, setCoachPage] = useState(1)

  const coachAthletesQuery = useQuery({
    queryKey: ['coach-athletes', gymId, coachSearch, coachPage],
    queryFn: async () => {
      const data = await api.get<any>("/api/gyms/coach-assignments/my_athletes/", {
        params: { search: coachSearch, page: String(coachPage), page_size: '10' }
      })
      return { athletes: (data.results || []) as CoachAthlete[], total: data.total || 0, total_pages: data.total_pages || 1 }
    },
    enabled: user.role === 'coach',
  })
  const coachAthletes = coachAthletesQuery.data?.athletes || []
  const coachTotalPages = coachAthletesQuery.data?.total_pages || 1

  const nutriDashQuery = useQuery({
    queryKey: ['nutritionist-dashboard', gymId],
    queryFn: () => api.get<NutritionistDashboard>("/api/gyms/nutritionist-assignments/dashboard/"),
    enabled: user.role === 'nutritionist',
  })

  const complianceChartQuery = useQuery({
    queryKey: ['compliance-chart', gymId],
    queryFn: async () => {
      const data = await api.get<any>("/api/gyms/nutritionist-assignments/compliance_chart/", { params: { days: '7' } })
      return (data?.daily || []) as { date: string; compliance: number; completed: number; total: number }[]
    },
    enabled: user.role === 'nutritionist',
    staleTime: 60000,
  })

  const [nutriSearch, setNutriSearch] = useState('')
  const [nutriPage, setNutriPage] = useState(1)

  const nutriAthletesQuery = useQuery({
    queryKey: ['nutritionist-athletes', gymId, nutriSearch, nutriPage],
    queryFn: async () => {
      const data = await api.get<any>("/api/gyms/nutritionist-assignments/my_athletes/", {
        params: { search: nutriSearch, page: String(nutriPage), page_size: '10' }
      })
      return { athletes: (data.results || []) as NutritionistAthlete[], total: data.total || 0, total_pages: data.total_pages || 1 }
    },
    enabled: user.role === 'nutritionist',
  })
  const nutriAthletes = nutriAthletesQuery.data?.athletes || []
  const nutriTotalPages = nutriAthletesQuery.data?.total_pages || 1

  // ⚠️ Todos los hooks deben llamarse antes de cualquier return condicional (Rules of Hooks)
  const { tier: athleteTier } = useSubscriptionTier()
  const isBasic = user?.role === 'athlete' && athleteTier !== 'premium'

  if (user?.role === 'coach') {
    return <CoachDashboardView gymId={gymId} user={user} />
  }

  if (user?.role === 'nutritionist') {
    return <NutritionistDashboardView gymId={gymId} user={user} />
  }

  if (user?.role === 'athlete') {
    const ad = athleteDashboardQuery.data

    if (athleteDashboardQuery.isLoading) {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hola, {adminName} 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Este es tu progreso en <span className="font-semibold text-emerald-700">{gymName}</span>.
            </p>
          </div>
          <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
          </div>
        </div>
      )
    }

    if (!ad) {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hola, {adminName} 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Este es tu progreso en <span className="font-semibold text-emerald-700">{gymName}</span>.
            </p>
          </div>
          <p className="text-slate-500">Error al cargar tu progreso.</p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <OnboardingModal gymId={gymId} />

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hola, {adminName} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Este es tu progreso en <span className="font-semibold text-emerald-700">{gymName}</span>.
          </p>
        </div>

        {!isBasic && (
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wide">Tus puntos</p>
                <p className="text-4xl font-bold mt-1">{ad.total_points ?? 0} pts</p>
                {rankingQuery.data?.my_rank && (
                  <p className="text-emerald-200 text-sm mt-1.5">
                    Posición <span className="font-bold text-white">#{rankingQuery.data.my_rank}</span> en el ranking
                  </p>
                )}
              </div>
              <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                <Trophy className="h-8 w-8 text-yellow-300" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <button
                onClick={() => router.push(`/${gymId}/panel/ranking`)}
                className="text-xs text-emerald-100 hover:text-white transition-colors font-medium"
              >
                Ver ranking completo →
              </button>
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${isBasic ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Rutinas Hoy</p>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{ad.sessions_today}</h2>
              <p className="text-xs text-slate-500 mt-1">Entrenamientos completados hoy</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Comidas Hoy</p>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{ad.meals_today}</h2>
              <p className="text-xs text-slate-500 mt-1">{ad.has_active_plan ? 'Plan activo' : 'Sin plan activo'}</p>
            </CardContent>
          </Card>

          {!isBasic && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-sm font-medium text-slate-600">Retos Activos</p>
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{ad.active_challenges}</h2>
                <p className="text-xs text-slate-500 mt-1">Retos en progreso</p>
              </CardContent>
            </Card>
          )}

          {!isBasic && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-sm font-medium text-slate-600">Logros</p>
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                    <Award className="h-5 w-5 text-rose-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{ad.badges_count}</h2>
                <p className="text-xs text-slate-500 mt-1">Insignias ganadas</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mi Equipo — solo Premium */}
        {!isBasic && <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">Mi Equipo</CardTitle>
              <CardDescription>Tu coach y nutricionista asignados</CardDescription>
            </div>
            <button
              onClick={() => router.push(`/${gymId}/panel/mi-equipo`)}
              className="h-8 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <BookUser className="w-3.5 h-3.5" />
              Ver directorio
            </button>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 md:grid-cols-2">
            {/* Coach */}
            {myTeamQuery.data?.myCoach ? (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                {myTeamQuery.data.myCoach.profile_picture ? (
                  <img src={myTeamQuery.data.myCoach.profile_picture} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-700 flex-shrink-0">
                    {myTeamQuery.data.myCoach.first_name?.[0]}{myTeamQuery.data.myCoach.last_name?.[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Tu Coach</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{myTeamQuery.data.myCoach.first_name} {myTeamQuery.data.myCoach.last_name}</p>
                  {myTeamQuery.data.myCoach.specialty && <p className="text-[10px] text-slate-500 truncate">{myTeamQuery.data.myCoach.specialty}</p>}
                </div>
                <button
                  onClick={() => router.push(`/${gymId}/panel/mensajes-coach`)}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                  title="Enviar mensaje al coach"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push(`/${gymId}/panel/mi-equipo`)}
                className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-emerald-50 border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-xl transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Elige tu Coach</p>
                  <p className="text-xs text-slate-400">Ver coaches disponibles →</p>
                </div>
              </button>
            )}

            {/* Nutricionista */}
            {myTeamQuery.data?.myNutri ? (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                {myTeamQuery.data.myNutri.profile_picture ? (
                  <img src={myTeamQuery.data.myNutri.profile_picture} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center font-bold text-amber-700 flex-shrink-0">
                    {myTeamQuery.data.myNutri.first_name?.[0]}{myTeamQuery.data.myNutri.last_name?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Tu Nutricionista</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{myTeamQuery.data.myNutri.first_name} {myTeamQuery.data.myNutri.last_name}</p>
                  {myTeamQuery.data.myNutri.specialty && <p className="text-[10px] text-slate-500 truncate">{myTeamQuery.data.myNutri.specialty}</p>}
                </div>
              </div>
            ) : (
              <button
                onClick={() => router.push(`/${gymId}/panel/mi-equipo`)}
                className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-amber-50 border-2 border-dashed border-slate-200 hover:border-amber-300 rounded-xl transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Elige tu Nutricionista</p>
                  <p className="text-xs text-slate-400">Ver nutricionistas disponibles →</p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Acceso Rápido</CardTitle>
            <CardDescription>Tu progreso y actividades</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 md:grid-cols-3">
            <button onClick={() => router.push(`/${gymId}/panel/mis-rutinas`)} className="flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Mis Rutinas</p>
                <p className="text-xs text-slate-500">Ver y registrar entrenamientos</p>
              </div>
            </button>
            <button onClick={() => router.push(`/${gymId}/panel/mi-nutricion`)} className="flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Mi Nutrición</p>
                <p className="text-xs text-slate-500">Plan y registro de comidas</p>
              </div>
            </button>
            <button onClick={() => router.push(`/${gymId}/panel/mis-retos`)} className="flex items-center gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Mis Retos</p>
                <p className="text-xs text-slate-500">Desafíos y competencias</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const s = statsQuery.data

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hola, {adminName} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Este es el resumen de <span className="font-semibold text-emerald-700">{gymName}</span>.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4"><CardSkeleton rows={3} /></div>
          <div className="col-span-3"><CardSkeleton rows={3} /></div>
        </div>
      </div>
    )
  }

  if (!s) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hola, {adminName} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Este es el resumen de <span className="font-semibold text-emerald-700">{gymName}</span>.
          </p>
        </div>
        <p className="text-slate-500">Error al cargar estadísticas del gimnasio.</p>
      </div>
    )
  }

  const roleGreetings: Record<string, string> = {
    coach: 'panel de entrenamiento',
    nutritionist: 'panel de nutrición',
    receptionist: 'panel de recepción',
    gym_admin: 'resumen general',
  }
  const greetingType = roleGreetings[user?.role || 'gym_admin'] || 'resumen general'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Hola, {adminName} 👋
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Este es el {greetingType} de <span className="font-semibold text-emerald-700">{gymName}</span>.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Atletas Activos</p>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">{s.active_athletes}</h2>
              <span className="text-xs font-medium text-emerald-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> +{s.growth_rate}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Nuevos este mes: {s.athletes_joined_month}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Staff & Coaches</p>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">{s.active_coaches + s.active_nutritionists}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">{s.active_coaches} coaches & {s.active_nutritionists} nutricionistas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Asistencia Hoy</p>
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">{s.checkins_today}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">{s.checkins_week} esta semana · {s.checkins_month} este mes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Sesiones Hoy</p>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">{s.sessions_today}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Sesiones programadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Actividad Reciente</CardTitle>
            <CardDescription>Eventos y notificaciones de tu gimnasio</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-xl">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.athletes_joined_month} nuevos atletas</p>
                <p className="text-xs text-slate-500">Se unieron este mes</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-amber-50 rounded-xl">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.checkins_today} check-ins hoy</p>
                <p className="text-xs text-slate-500">{s.checkins_week} esta semana</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-xl">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.sessions_today} sesiones hoy</p>
                <p className="text-xs text-slate-500">Entrenamientos programados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Membresías por Vencer</CardTitle>
            <CardDescription>Atletas con membresía próxima a expirar</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {s.expiring_memberships.length > 0 ? (
              <div className="space-y-3">
                {s.expiring_memberships.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.plan}</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      Por vencer
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                <CalendarCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>No hay membresías por vencer.</p>
                <p className="text-sm mt-1">Todos los atletas están al día.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
