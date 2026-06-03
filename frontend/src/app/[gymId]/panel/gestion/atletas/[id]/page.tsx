'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Dumbbell, Apple, Target, Award, Zap,
  UserCheck, AlertTriangle, Activity, Ruler, Scale,
  Calendar, CheckCircle2, Clock, Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User } from '@/lib/types'
import { ProfileSkeleton } from '@/components/ui/skeletons'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val: any, unit = '') {
  if (val === null || val === undefined) return '—'
  return `${val}${unit}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function TierBadge({ tier }: { tier: string | null }) {
  if (tier === 'premium') return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
      <Star className="w-3 h-3" /> Premium
    </span>
  )
  if (tier === 'basic') return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
      Basic
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-500 border border-rose-100 text-xs font-bold px-2.5 py-0.5 rounded-full">
      Sin membresía
    </span>
  )
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
    no_show: 'bg-rose-50 text-rose-600 border-rose-100',
  }
  const labels: Record<string, string> = {
    scheduled: 'Programada', completed: 'Completada',
    cancelled: 'Cancelada', no_show: 'No asistió',
  }
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {labels[status] || status}
    </span>
  )
}

// ─── Sección: Medidas Antropométricas ────────────────────────────────────────

function MeasurementsSection({ measurements }: { measurements: any[] }) {
  if (!measurements || measurements.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center text-slate-400">
          <Ruler className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin medidas registradas</p>
          <p className="text-sm mt-1">Registra la primera medida antropométrica desde la agenda.</p>
        </CardContent>
      </Card>
    )
  }

  const latest = measurements[0]

  const statItems = [
    { label: 'Peso', value: fmt(latest.weight_kg, ' kg'), icon: Scale },
    { label: 'Altura', value: fmt(latest.height_cm, ' cm'), icon: Ruler },
    { label: 'IMC', value: fmt(latest.bmi), icon: Activity },
    { label: '% Grasa', value: fmt(latest.body_fat_pct, '%'), icon: Activity },
    { label: 'Masa muscular', value: fmt(latest.muscle_mass_kg, ' kg'), icon: Dumbbell },
    { label: 'Cintura', value: fmt(latest.waist_cm, ' cm'), icon: Ruler },
    { label: 'Cadera', value: fmt(latest.hip_cm, ' cm'), icon: Ruler },
    { label: 'Brazo', value: fmt(latest.arm_cm, ' cm'), icon: Ruler },
    { label: 'Grasa visceral', value: fmt(latest.visceral_fat), icon: Activity },
  ]

  return (
    <div className="space-y-4">
      {/* Última medida */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <Scale className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">Última medición</CardTitle>
                <CardDescription>{fmtDate(latest.measured_at)}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {statItems.map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className="font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          {latest.notes && (
            <p className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-3 italic">
              {latest.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      {measurements.length > 1 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Historial de mediciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Fecha', 'Peso', 'IMC', '% Grasa', 'Músculo', 'Cintura'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {measurements.map((m: any, i: number) => (
                    <tr key={m.id} className={`hover:bg-slate-50/80 ${i === 0 ? 'font-semibold' : ''}`}>
                      <td className="px-4 py-3 text-slate-700">{fmtDate(m.measured_at)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.weight_kg, ' kg')}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.bmi)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.body_fat_pct, '%')}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.muscle_mass_kg, ' kg')}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.waist_cm, ' cm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Sección: Citas ──────────────────────────────────────────────────────────

function AppointmentsSection({ appointments }: { appointments: any[] }) {
  if (!appointments || appointments.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin citas registradas</p>
          <p className="text-sm mt-1">Las citas agendadas con este atleta aparecerán aquí.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <CardTitle className="text-base font-semibold text-slate-800">
            Historial de citas ({appointments.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50">
          {appointments.map((apt: any) => (
            <div key={apt.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {apt.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Clock className="w-4 h-4 text-slate-400" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{apt.appointment_type_display || apt.appointment_type}</p>
                  <p className="text-xs text-slate-500">{fmtDateTime(apt.scheduled_at)} · {apt.duration_minutes} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <AppointmentStatusBadge status={apt.status} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AthleteProfilePage({ params }: { params: Promise<{ gymId: string; id: string }> }) {
  const { gymId, id } = use(params)
  const router = useRouter()
  const storedUser = getStoredUser<User>()
  const isNutritionist = storedUser?.role === 'nutritionist'
  const isAdmin = storedUser?.role === 'gym_admin' || storedUser?.role === 'super_admin'

  const { data, isLoading } = useQuery({
    queryKey: ['athlete-profile', id],
    queryFn: () => api.get<any>(`/api/gyms/athlete-profile/${id}/`),
  })

  if (isLoading) return <ProfileSkeleton />

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Atleta no encontrado</h2>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>Volver</Button>
      </div>
    )
  }

  const { athlete: a, stats: s, routine, nutrition_plan, points_history, measurements, appointments, membership_tier } = data

  const defaultTab = isNutritionist ? 'nutricion' : 'general'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {a.first_name} {a.last_name}
            </h1>
            <TierBadge tier={membership_tier} />
            <Badge className={a.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500'}>
              {a.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{a.email}</p>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Sesiones semana', value: s.sessions_week, sub: `${s.sessions_month} este mes`, icon: Dumbbell, color: 'bg-blue-100 text-blue-600' },
          { label: 'Comidas (7d)', value: s.meals_week, sub: `${s.meals_today} hoy`, icon: Apple, color: 'bg-amber-100 text-amber-600' },
          { label: 'Retos activos', value: s.active_challenges, sub: 'En progreso', icon: Target, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Insignias', value: s.badges_earned, sub: 'Logros', icon: Award, color: 'bg-rose-100 text-rose-600' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="p-5 text-center">
              <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-slate-100 rounded-xl p-1 h-auto">
          <TabsTrigger value="general" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            General
          </TabsTrigger>
          <TabsTrigger value="nutricion" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Nutrición
          </TabsTrigger>
          {!isNutritionist && (
            <TabsTrigger value="puntos" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Puntos
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab General ── */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Info personal */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-semibold text-slate-800">Información personal</CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 gap-4">
                {[
                  { label: 'DNI', value: a.dni },
                  { label: 'Celular', value: a.phone },
                  { label: 'Miembro desde', value: fmtDate(a.date_joined) },
                  { label: 'Check-ins totales', value: s.checkins_total },
                  { label: 'Check-ins este mes', value: s.checkins_month },
                  { label: 'Nivel', value: `Nivel ${a.nivel}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="font-medium text-slate-700 mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Staff asignado */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-semibold text-slate-800">Staff asignado</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {data.coach ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Coach</p>
                      <p className="font-semibold text-slate-800">{data.coach.name}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Sin coach asignado</p>
                )}
                {data.nutritionist ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Apple className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Nutricionista</p>
                      <p className="font-semibold text-slate-800">{data.nutritionist.name}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Sin nutricionista asignado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plan nutricional */}
          {nutrition_plan && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Apple className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-800">Plan Nutricional Activo</CardTitle>
                    <CardDescription>Asignado por {nutrition_plan.assigned_by || 'el sistema'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="font-bold text-slate-900">{nutrition_plan.name}</p>
                <p className="text-sm text-slate-500 mb-3">Inicio: {fmtDate(nutrition_plan.start_date)}</p>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-500">Cumplimiento</span>
                  <span className={`font-bold ${nutrition_plan.compliance_percentage >= 80 ? 'text-emerald-600' : nutrition_plan.compliance_percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {nutrition_plan.compliance_percentage}%
                  </span>
                </div>
                <Progress value={nutrition_plan.compliance_percentage} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Rutina */}
          {routine && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-800">Rutina Activa</CardTitle>
                    <CardDescription>Asignada por {routine.assigned_by || 'el sistema'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{routine.name}</p>
                  <p className="text-sm text-slate-500">Inicio: {fmtDate(routine.start_date)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Nutrición ── */}
        <TabsContent value="nutricion" className="mt-4 space-y-4">
          {membership_tier !== 'premium' && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Este atleta no tiene Plan Premium activo. No puede ser atendido por un nutricionista.
              </p>
            </div>
          )}
          <MeasurementsSection measurements={measurements || []} />
          <AppointmentsSection appointments={appointments || []} />
        </TabsContent>

        {/* ── Tab Puntos ── */}
        {!isNutritionist && (
          <TabsContent value="puntos" className="mt-4">
            {points_history && points_history.length > 0 ? (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-800">Historial de Puntos</CardTitle>
                      <CardDescription>Últimas 20 transacciones · Total: {s.total_points_earned} pts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          {['Fecha', 'Descripción', 'Fuente', 'Puntos'].map(h => (
                            <th key={h} className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase last:text-right">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {points_history.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4 text-sm text-slate-600">{fmtDate(p.created_at)}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.description || '—'}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-[10px] capitalize border-slate-200 text-slate-500">
                                {p.source?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">+{p.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400">
                  <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Sin historial de puntos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
