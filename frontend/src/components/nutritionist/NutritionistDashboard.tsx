'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Users, MessageSquare, TrendingUp, Apple,
  AlertTriangle, CheckCircle2, Clock, ChevronRight, Plus,
  ArrowUp, ArrowDown, Minus, Send, X, CalendarCheck,
  UserPlus, RefreshCw, MailOpen, Camera, Loader2,
} from 'lucide-react'
import { showSuccess, showError } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatsCardSkeleton } from '@/components/ui/skeletons'
import { api } from '@/lib/api'
import type {
  User,
  NutritionistDashboard,
  NutritionistAthlete,
  NutritionistAppointment,
  NutritionistAppointmentStats,
  NutritionistMessage,
} from '@/lib/types'

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '--'
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function formatDateFull(dateStr: string | null | undefined) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '--'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

function formatRelative(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Ahora mismo'
  if (diffMins < 60) return `Hace ${diffMins}m`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `Hace ${diffHrs}h`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Minus className="w-3 h-3" />0</span>
  if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600"><ArrowUp className="w-3 h-3" />+{delta}</span>
  return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-500"><ArrowDown className="w-3 h-3" />{delta}</span>
}

interface AppointmentCardProps {
  appointment: NutritionistAppointment
  isNext?: boolean
  gymId: string
  onStatusChange: (id: string, status: string) => void
  completing?: boolean
}

function AppointmentCard({ appointment, isNext, gymId, onStatusChange, completing }: AppointmentCardProps) {
  const router = useRouter()
  const d = new Date(appointment.scheduled_at)
  const now = new Date()
  const isToday = now.toDateString() === d.toDateString()
  const isPast = d < now
  const canStart = isToday || isPast
  const initials = appointment.athlete_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={`rounded-2xl border transition-all ${isNext ? 'border-emerald-200 bg-white shadow-md shadow-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900 text-sm truncate">{appointment.athlete_name}</p>
              <Badge
                className={`text-[10px] font-bold px-2 py-0.5 flex-shrink-0 ${
                  appointment.appointment_type === 'first'
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {appointment.appointment_type === 'first' ? '1ª consulta' : 'Seguimiento'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isToday ? 'Hoy' : formatDateFull(appointment.scheduled_at)} · {formatTime(appointment.scheduled_at)} — {
                (() => {
                  const end = new Date(d.getTime() + appointment.duration_minutes * 60000)
                  return formatTime(end.toISOString())
                })()
              }
            </p>
          </div>
        </div>

        {isNext && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => canStart && onStatusChange(appointment.id, 'completed')}
              disabled={!canStart || completing}
              title={!canStart ? `Disponible el ${d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}` : undefined}
              className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              {completing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                : <><CheckCircle2 className="w-4 h-4" /> {canStart ? 'Marcar como realizada' : 'Consulta programada'}</>
              }
            </button>
            <button
              onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${appointment.athlete}`)}
              className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all"
            >
              Ver perfil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NutritionistDashboard({ gymId, user }: { gymId: string; user: User }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'cancelled' | 'messages'>('cancelled')

  const { data: nd, isLoading: ndLoading, isError: ndError } = useQuery({
    queryKey: ['nutritionist-dashboard', gymId],
    queryFn: () => api.get<NutritionistDashboard>('/api/gyms/nutritionist-assignments/dashboard/'),
  })

  const { data: appointmentStats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['appointment-stats', gymId],
    queryFn: () => api.get<NutritionistAppointmentStats>('/api/gyms/appointments/dashboard_stats/'),
    staleTime: 60000,
  })

  const { data: nextAppointment, isError: nextError } = useQuery({
    queryKey: ['next-appointment', gymId],
    queryFn: () => api.get<NutritionistAppointment | null>('/api/gyms/appointments/next/'),
    refetchInterval: 60000,
  })

  const { data: upcomingAppointments, isLoading: upcomingLoading, isError: upcomingError } = useQuery({
    queryKey: ['upcoming-appointments', gymId],
    queryFn: () => api.get<NutritionistAppointment[]>('/api/gyms/appointments/upcoming/'),
    refetchInterval: 60000,
  })

  const { data: recentMessages, isError: messagesError } = useQuery({
    queryKey: ['recent-messages', gymId],
    queryFn: () => api.get<NutritionistMessage[]>('/api/gyms/messages/recent/'),
    refetchInterval: 30000,
  })

  const { data: pendingPhotos, isError: photosError } = useQuery({
    queryKey: ['pending-photos', gymId],
    queryFn: () => api.get<any>('/api/nutrition/meal-logs/pending-approvals/'),
    refetchInterval: 60000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/gyms/appointments/${id}/`, { status }),
    onSuccess: () => {
      showSuccess('Consulta registrada como realizada.')
      queryClient.invalidateQueries({ queryKey: ['next-appointment', gymId] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-appointments', gymId] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats', gymId] })
    },
    onError: (err) => showError(err, 'No se pudo actualizar la consulta'),
  })

  const reviewsPending = nd?.reviews_pending ?? []

  const adminName = user.first_name || 'Nutricionista'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const upcoming = (upcomingAppointments || []).filter(a => a.id !== nextAppointment?.id).slice(0, 5)

  const anyError = ndError || statsError || nextError || upcomingError || messagesError || photosError

  if (ndLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
            <div className="h-56 bg-slate-100 animate-pulse rounded-2xl" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {adminName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${gymId}/panel/agenda`)}
          className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva cita
        </button>
      </div>

      {/* Error banner */}
      {anyError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Algunas secciones no pudieron cargarse. Intenta recargar la página.</span>
        </div>
      )}

      {/* Main layout: left content + right stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">

        {/* LEFT: appointments */}
        <div className="lg:col-span-3 space-y-4">

          {/* Próxima consulta */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Próxima consulta</h2>
              {nextAppointment && new Date(nextAppointment.scheduled_at) < new Date() && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                  Retrasada
                </Badge>
              )}
            </div>

            {nextAppointment ? (
              <AppointmentCard
                appointment={nextAppointment}
                isNext
                gymId={gymId}
                completing={statusMutation.isPending}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">Sin consultas pendientes</p>
                <p className="text-xs text-slate-400 mt-1">Programa una consulta desde la agenda</p>
                <button
                  onClick={() => router.push(`/${gymId}/panel/agenda`)}
                  className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Abrir agenda →
                </button>
              </div>
            )}
          </section>

          {/* Revisiones de semana pendientes */}
          {reviewsPending.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Revisiones pendientes
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {reviewsPending.length}
                  </span>
                </h2>
              </div>
              <div className="space-y-2">
                {reviewsPending.map(r => {
                  const since = (() => {
                    const d = new Date(r.requested_at)
                    const diffMs = Date.now() - d.getTime()
                    const diffH = Math.floor(diffMs / 3600000)
                    if (diffH < 1) return 'Hace unos minutos'
                    if (diffH < 24) return `Hace ${diffH}h`
                    return `Hace ${Math.floor(diffH / 24)}d`
                  })()
                  const initials = r.athlete_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div
                      key={r.assignment_id}
                      className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 cursor-pointer hover:border-amber-200 transition-colors"
                      onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${r.athlete_id}?tab=nutrition`)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.athlete_name}</p>
                        <p className="text-xs text-slate-500 truncate">{r.plan_name}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[11px] text-amber-600 font-medium">{since}</p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto mt-0.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Próximas consultas */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Próximas consultas</h2>
              <button
                onClick={() => router.push(`/${gymId}/panel/agenda`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Abrir agenda <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    gymId={gymId}
                    onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                <p className="text-sm text-slate-400">Esta lista está vacía</p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: stats + tabs */}
        <div className="lg:col-span-2 space-y-4">

          {/* Mis estadísticas */}
          <section className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Mis estadísticas</h2>
              <span className="text-[10px] text-slate-400 font-medium">Últimos 30 días</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {/* Nuevos clientes */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <DeltaBadge delta={appointmentStats?.new_clients_delta ?? 0} />
                </div>
                <p className="text-xl font-bold text-slate-900">{statsLoading ? '—' : (appointmentStats?.new_clients ?? nd?.total_athletes ?? 0)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Nuevos clientes</p>
              </div>

              {/* Primeras consultas */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">=</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{statsLoading ? '—' : (appointmentStats?.first_consultations ?? 0)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Primeras consultas</p>
              </div>

              {/* Consultas de seguimiento */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">=</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{statsLoading ? '—' : (appointmentStats?.followup_consultations ?? 0)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Consultas de seguimiento</p>
              </div>

              {/* Mensajes enviados */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Send className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">=</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{statsLoading ? '—' : (appointmentStats?.messages_sent ?? 0)}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Mensajes enviados</p>
              </div>
            </div>

            {/* Compliance bar */}
            {nd && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-500">Cumplimiento promedio</span>
                  <span className={`text-xs font-bold ${nd.avg_compliance_percentage >= 80 ? 'text-emerald-600' : nd.avg_compliance_percentage >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>
                    {nd.avg_compliance_percentage}%
                  </span>
                </div>
                <Progress
                  value={nd.avg_compliance_percentage}
                  className={`h-1.5 ${nd.avg_compliance_percentage >= 80 ? '[&>div]:bg-emerald-500' : nd.avg_compliance_percentage >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500'}`}
                />
                {nd.low_compliance_athletes > 0 && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {nd.low_compliance_athletes} atleta{nd.low_compliance_athletes > 1 ? 's' : ''} con bajo cumplimiento
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Tabs: Citas canceladas / Últimos mensajes */}
          <section className="bg-white rounded-2xl border border-slate-100">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab('cancelled')}
                className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'cancelled'
                    ? 'text-emerald-700 border-b-2 border-emerald-600 -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                Citas canceladas
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'messages'
                    ? 'text-emerald-700 border-b-2 border-emerald-600 -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <MailOpen className="w-3.5 h-3.5" />
                Últimos mensajes
              </button>
            </div>

            <div className="p-3 min-h-[160px]">
              {activeTab === 'cancelled' ? (
                appointmentStats?.cancelled_appointments && appointmentStats.cancelled_appointments.length > 0 ? (
                  <div className="space-y-2">
                    {appointmentStats.cancelled_appointments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {a.athlete_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{a.athlete_name}</p>
                          <p className="text-[10px] text-slate-400">{formatDateFull(a.scheduled_at)} · {formatTime(a.scheduled_at)}</p>
                        </div>
                        <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[9px] font-bold">Cancelada</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <CalendarCheck className="w-8 h-8 text-slate-200" />
                    <p className="text-xs text-slate-400">Esta lista está vacía</p>
                  </div>
                )
              ) : (
                recentMessages && recentMessages.length > 0 ? (
                  <div className="space-y-2">
                    {recentMessages.map(m => (
                      <button
                        key={m.id}
                        onClick={() => router.push(`/${gymId}/panel/mensajes?athlete=${m.athlete}`)}
                        className="w-full flex items-start gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {m.athlete_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-slate-800 truncate">{m.athlete_name}</p>
                            <span className="text-[9px] text-slate-400 flex-shrink-0">{formatRelative(m.created_at)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{m.body}</p>
                        </div>
                        {!m.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <MessageSquare className="w-8 h-8 text-slate-200" />
                    <p className="text-xs text-slate-400">Sin mensajes nuevos</p>
                  </div>
                )
              )}
            </div>
          </section>

          {/* Fotos pendientes de revisión */}
          {pendingPhotos && pendingPhotos.count > 0 && (
            <section className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <h2 className="text-xs font-bold text-amber-800 flex-1">Fotos pendientes de revisión</h2>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                  {pendingPhotos.count}
                </span>
              </div>
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {(() => {
                  // Agrupar por atleta
                  const byAthlete: Record<string, { name: string; id: string; count: number }> = {}
                  for (const item of pendingPhotos.results) {
                    if (!byAthlete[item.athlete_id]) {
                      byAthlete[item.athlete_id] = { name: item.athlete_name, id: item.athlete_id, count: 0 }
                    }
                    byAthlete[item.athlete_id].count++
                  }
                  return Object.values(byAthlete).map(athlete => (
                    <button
                      key={athlete.id}
                      onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${athlete.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {athlete.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 flex-1 truncate">{athlete.name}</p>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 flex-shrink-0">
                        {athlete.count} foto{athlete.count > 1 ? 's' : ''}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    </button>
                  ))
                })()}
              </div>
            </section>
          )}

          {/* Quick access */}
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            <button
              onClick={() => router.push(`/${gymId}/panel/gestion/atletas`)}
              className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-xl transition-all text-left group"
            >
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Clientes</p>
                <p className="text-[10px] text-slate-400">{nd?.total_athletes ?? 0} asignados</p>
              </div>
            </button>
            <button
              onClick={() => router.push(`/${gymId}/panel/nutricion/planes-nutricionales`)}
              className="flex items-center gap-2.5 p-3 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-xl transition-all text-left group"
            >
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                <Apple className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Planes</p>
                <p className="text-[10px] text-slate-400">{nd?.with_active_plan ?? 0} activos</p>
              </div>
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
