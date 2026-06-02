'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Dumbbell, Activity, TrendingUp, CalendarCheck, Calendar, Clock, UserPlus, CheckCircle2, AlertTriangle, Target, Zap, Award, Medal, Trophy, Apple, ListOrdered } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TableSkeleton, ChartSkeleton, StatsCardSkeleton, CardSkeleton } from '@/components/ui/skeletons'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, DashboardStats, Role, CoachDashboard, CoachAthlete, NutritionistDashboard, NutritionistAthlete } from '@/lib/types'

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

  if (user?.role === 'coach') {
    const cd = coachDashQuery.data

    if (coachDashQuery.isLoading) {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hola, {adminName} 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Panel de entrenamiento de <span className="font-semibold text-emerald-700">{gymName}</span>.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
          </div>
          <TableSkeleton rows={4} cols={6} />
        </div>
      )
    }

    if (!cd) {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hola, {adminName} 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Panel de entrenamiento de <span className="font-semibold text-emerald-700">{gymName}</span>.
            </p>
          </div>
          <p className="text-slate-500">Error al cargar datos del dashboard.</p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hola, {adminName} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Panel de entrenamiento de <span className="font-semibold text-emerald-700">{gymName}</span>.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Atletas Asignados</p>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{cd.total_athletes}</h2>
              <p className="text-xs text-slate-500 mt-1">{cd.with_active_routine} con rutina activa</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Sesiones Semana</p>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{cd.sessions_week}</h2>
              <p className="text-xs text-slate-500 mt-1">{cd.sessions_today} registradas hoy</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Planes Nutricionales</p>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Apple className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{cd.with_active_plan}</h2>
              <p className="text-xs text-slate-500 mt-1">atletas con plan activo</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Retos Activos</p>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{cd.active_challenges}</h2>
              <p className="text-xs text-slate-500 mt-1">atletas participando</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Mis Atletas</CardTitle>
                <CardDescription>{coachAthletesQuery.data?.total ?? coachAthletes.length} atletas asignados</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar atleta..."
                  className="pl-10 h-9 text-sm rounded-xl border-slate-200"
                  value={coachSearch}
                  onChange={(e) => { setCoachSearch(e.target.value); setCoachPage(1) }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {coachAthletesQuery.isLoading ? (
              <TableSkeleton rows={4} cols={6} />
            ) : coachAthletes.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Atleta</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nivel</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rutina</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan Nutricional</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sesiones (7d)</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {coachAthletes.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                {a.first_name[0]}{a.last_name[0]}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{a.first_name} {a.last_name}</div>
                                <div className="text-xs text-slate-400">{a.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                              Nvl {a.nivel}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {a.has_active_routine ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {a.routine_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Sin asignar</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {a.has_active_plan ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-100">
                                {a.plan_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Sin plan</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold text-sm ${a.sessions_last_7_days > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {a.sessions_last_7_days}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.id}`)}
                              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              Ver perfil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {coachTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
                    <button
                      onClick={() => setCoachPage(p => Math.max(1, p - 1))}
                      disabled={coachPage <= 1}
                      className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-slate-500">Página {coachPage} de {coachTotalPages}</span>
                    <button
                      onClick={() => setCoachPage(p => Math.min(coachTotalPages, p + 1))}
                      disabled={coachPage >= coachTotalPages}
                      className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-medium">{coachSearch ? 'Sin resultados' : 'No tienes atletas asignados'}</p>
                <p className="text-sm mt-1">{coachSearch ? 'Intenta con otro término de búsqueda.' : 'El administrador te asignará atletas próximamente.'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Acceso Rápido</CardTitle>
            <CardDescription>Gestiona tus atletas y recursos</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 md:grid-cols-3">
            <button onClick={() => router.push(`/${gymId}/panel/gestion/atletas`)} className="flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Mis Atletas</p>
                <p className="text-xs text-slate-500">Ver y gestionar asignaciones</p>
              </div>
            </button>
            <button onClick={() => router.push(`/${gymId}/panel/entrenamiento/rutinas`)} className="flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Rutinas</p>
                <p className="text-xs text-slate-500">Crear y asignar entrenamientos</p>
              </div>
            </button>
            <button onClick={() => router.push(`/${gymId}/panel/entrenamiento/ejercicios`)} className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ListOrdered className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Ejercicios</p>
                <p className="text-xs text-slate-500">Catálogo de ejercicios</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user?.role === 'nutritionist') {
    const nd = nutriDashQuery.data

    if (nutriDashQuery.isLoading) {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hola, {adminName} 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Panel de nutrición de <span className="font-semibold text-emerald-700">{gymName}</span>.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
          </div>
          <ChartSkeleton />
          <TableSkeleton rows={4} cols={6} />
        </div>
      )
    }

    if (!nd) {
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hola, {adminName} 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Panel de nutrición de <span className="font-semibold text-emerald-700">{gymName}</span>.
            </p>
          </div>
          <p className="text-slate-500">Error al cargar datos del dashboard.</p>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hola, {adminName} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Panel de nutrición de <span className="font-semibold text-emerald-700">{gymName}</span>.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Atletas Asignados</p>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{nd.total_athletes}</h2>
              <p className="text-xs text-slate-500 mt-1">{nd.with_active_plan} con plan activo</p>
              <p className="text-xs text-slate-500">{nd.completed_plans} planes completados</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Cumplimiento Promedio</p>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{nd.avg_compliance_percentage}%</h2>
              <p className="text-xs text-slate-500 mt-1">{nd.meals_logged_week} comidas registradas esta semana</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Alerta Bajo Cumplimiento</p>
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{nd.low_compliance_athletes}</h2>
              <p className="text-xs text-slate-500 mt-1">atletas con &lt;50% cumplimiento</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Planes Nutricionales</p>
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Apple className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{nd.with_active_plan}</h2>
              <p className="text-xs text-slate-500 mt-1">planes activos asignados</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Cumplimiento Diario (7 días)</CardTitle>
            <CardDescription>Porcentaje de comidas completadas por día</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {complianceChartQuery.isLoading ? (
              <ChartSkeleton />
            ) : complianceChartQuery.data && complianceChartQuery.data.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceChartQuery.data} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + 'T00:00:00')
                        return d.toLocaleDateString('es', { weekday: 'short' })
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      unit="%"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      labelFormatter={(v: any) => {
                        const d = new Date(String(v) + 'T00:00:00')
                        return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })
                      }}
                      formatter={(value: any) => [`${value}%`, 'Cumplimiento']}
                    />
                    <Bar dataKey="compliance" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                No hay datos de cumplimiento disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Mis Atletas</CardTitle>
                <CardDescription>{nutriAthletesQuery.data?.total ?? nutriAthletes.length} atletas asignados</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar atleta..."
                  className="pl-10 h-9 text-sm rounded-xl border-slate-200"
                  value={nutriSearch}
                  onChange={(e) => { setNutriSearch(e.target.value); setNutriPage(1) }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {nutriAthletesQuery.isLoading ? (
              <TableSkeleton rows={4} cols={6} />
            ) : nutriAthletes.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Atleta</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nivel</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan Activo</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cumplimiento</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Comidas Hoy</th>
                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {nutriAthletes.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                {a.first_name[0]}{a.last_name[0]}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{a.first_name} {a.last_name}</div>
                                <div className="text-xs text-slate-400">{a.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                              Nvl {a.nivel}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {a.has_active_plan ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-100">
                                {a.plan_name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">Sin plan</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[100px]">
                                <Progress value={a.compliance_percentage} className={`h-2 ${a.compliance_percentage < 50 ? '[&>div]:bg-rose-500' : a.compliance_percentage < 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
                              </div>
                              <span className={`text-xs font-bold ${a.compliance_percentage < 50 ? 'text-rose-600' : a.compliance_percentage < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {a.compliance_percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold text-sm ${a.meals_completed_today > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {a.meals_completed_today}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.id}`)}
                              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              Ver perfil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {nutriTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
                    <button
                      onClick={() => setNutriPage(p => Math.max(1, p - 1))}
                      disabled={nutriPage <= 1}
                      className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-slate-500">Página {nutriPage} de {nutriTotalPages}</span>
                    <button
                      onClick={() => setNutriPage(p => Math.min(nutriTotalPages, p + 1))}
                      disabled={nutriPage >= nutriTotalPages}
                      className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-medium">{nutriSearch ? 'Sin resultados' : 'No tienes atletas asignados'}</p>
                <p className="text-sm mt-1">{nutriSearch ? 'Intenta con otro término de búsqueda.' : 'El administrador te asignará atletas próximamente.'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Acceso Rápido</CardTitle>
            <CardDescription>Gestiona planes y atletas</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 md:grid-cols-3">
            <button onClick={() => router.push(`/${gymId}/panel/gestion/atletas`)} className="flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Mis Atletas</p>
                <p className="text-xs text-slate-500">Ver progreso nutricional</p>
              </div>
            </button>
            <button onClick={() => router.push(`/${gymId}/panel/nutricion/planes-nutricionales`)} className="flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Apple className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Planes Nutricionales</p>
                <p className="text-xs text-slate-500">Crear y asignar planes</p>
              </div>
            </button>
            <button onClick={() => router.push(`/${gymId}/panel/gamificacion/retos`)} className="flex items-center gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all text-left">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Retos</p>
                <p className="text-xs text-slate-500">Desafíos y competencias</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    )
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

    const xpPercent = ad.next_level_xp > 0 ? Math.min((ad.current_xp / ad.next_level_xp) * 100, 100) : 0

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

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-100 text-sm font-medium">NIVEL {ad.level}</p>
              <p className="text-4xl font-bold mt-1">{ad.total_points} pts</p>
            </div>
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
              <Zap className="h-8 w-8 text-yellow-300" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-emerald-100">
              <span>XP: {ad.current_xp} / {ad.next_level_xp}</span>
              <span>{Math.round(xpPercent)}%</span>
            </div>
            <Progress value={xpPercent} className="h-2 bg-white/20 [&>div]:bg-yellow-400" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-600">Rutinas Hoy</p>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{ad.sessions_today}</h2>
              <p className="text-xs text-slate-500 mt-1">{ad.has_active_routine ? 'Rutina activa asignada' : 'Sin rutina asignada'}</p>
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
        </div>

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
