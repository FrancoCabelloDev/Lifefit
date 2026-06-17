'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays,
  Clock, CheckCircle2, X, AlertCircle, Search,
  Target, Salad, Scale, ClipboardList, ChevronDown,
  Loader2, ArrowRight, RefreshCw, ThumbsUp, CalendarClock, FileText, Save,
} from 'lucide-react'
import { format, formatDistanceToNow, addDays, startOfDay, isAfter, isBefore, parseISO, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { getStoredUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { User, NutritionistAppointment, NutritionistAthlete } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface AthleteProfile {
  athlete: {
    id: string
    first_name: string
    last_name: string
    email: string
    fitness_goal: string
    goal_notes: string
    puntos: number
    nivel: string
  }
  goal: {
    target_weight_kg: string | null
    target_body_fat_pct: string | null
    target_date: string | null
    notes: string
  } | null
  nutrition_plan: {
    name: string
    compliance_percentage: number
  } | null
  measurements: {
    measured_at: string
    weight_kg: string | null
    body_fat_pct: string | null
    bmi: number | null
    muscle_mass_kg: string | null
  }[]
  stats: {
    meals_week: number
    meals_today: number
    sessions_week: number
  }
  appointments: {
    id: string
    scheduled_at: string
    appointment_type: string
    status: string
    status_display: string
    notes: string
  }[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  scheduled:            'bg-blue-50 text-blue-700 border-blue-100',
  confirmed:            'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed:            'bg-slate-100 text-slate-600 border-slate-200',
  cancelled:            'bg-rose-50 text-rose-600 border-rose-100',
  no_show:              'bg-slate-100 text-slate-500 border-slate-200',
  reschedule_requested: 'bg-amber-50 text-amber-700 border-amber-100',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled:            <Clock className="w-3 h-3" />,
  confirmed:            <CheckCircle2 className="w-3 h-3" />,
  completed:            <CheckCircle2 className="w-3 h-3" />,
  cancelled:            <X className="w-3 h-3" />,
  no_show:              <AlertCircle className="w-3 h-3" />,
  reschedule_requested: <RefreshCw className="w-3 h-3" />,
}

const FITNESS_GOAL_LABELS: Record<string, string> = {
  lose_weight:   'Perder peso',
  gain_muscle:   'Ganar músculo',
  maintain:      'Mantenimiento',
  improve_health:'Mejorar salud',
  gain_weight:   'Ganar peso',
  other:         'Otro',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// ── AppointmentContextPanel ───────────────────────────────────────────────────

function AppointmentContextPanel({
  appointment,
  gymId,
  onClose,
  onStatusChange,
}: {
  appointment: NutritionistAppointment
  gymId: string
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const router = useRouter()

  const [clinicalNotes, setClinicalNotes] = useState(appointment.clinical_notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)

  const saveNotesMutation = useMutation({
    mutationFn: (notes: string) =>
      api.patch(`/api/gyms/appointments/${appointment.id}/save-notes/`, { clinical_notes: notes }),
    onSuccess: () => {
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2500)
    },
    onError: (err) => showError(err, 'No se pudieron guardar las notas'),
  })

  const { data: profile, isLoading } = useQuery<AthleteProfile>({
    queryKey: ['athlete-profile-appt', appointment.athlete],
    queryFn: () => api.get(`/api/gyms/athlete-profile/${appointment.athlete}/`),
    staleTime: 60_000,
  })

  const athleteName = appointment.athlete_name || 'Atleta'
  const initials    = getInitials(athleteName)
  const endTime     = new Date(new Date(appointment.scheduled_at).getTime() + appointment.duration_minutes * 60000)

  const pastAppts = (profile?.appointments ?? [])
    .filter(a => a.id !== appointment.id && a.status !== 'cancelled')
    .slice(0, 3)

  const lastMeasurement = profile?.measurements?.[0] ?? null

  const compliancePct = profile?.nutrition_plan?.compliance_percentage ?? null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{athleteName}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {appointment.appointment_type === 'first' ? 'Primera Consulta' : 'Seguimiento'}
              {' · '}{formatTime(appointment.scheduled_at)} – {formatTime(endTime.toISOString())}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[80, 60, 90, 70].map((w, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%` }} />
                  <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">

              {/* 1 — Objetivo del atleta */}
              {(profile?.athlete.fitness_goal || profile?.goal) && (
                <section className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objetivo</p>
                  </div>
                  {profile?.athlete.fitness_goal && (
                    <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg mb-2">
                      {FITNESS_GOAL_LABELS[profile.athlete.fitness_goal] ?? profile.athlete.fitness_goal}
                    </span>
                  )}
                  {profile?.goal && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        {profile.goal.target_weight_kg && (
                          <div className="flex-1 min-w-[80px] bg-slate-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-sm font-bold text-slate-800">{parseFloat(profile.goal.target_weight_kg).toFixed(1)} kg</p>
                            <p className="text-[10px] text-slate-400">peso meta</p>
                          </div>
                        )}
                        {profile.goal.target_body_fat_pct && (
                          <div className="flex-1 min-w-[80px] bg-slate-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-sm font-bold text-slate-800">{parseFloat(profile.goal.target_body_fat_pct).toFixed(1)}%</p>
                            <p className="text-[10px] text-slate-400">grasa meta</p>
                          </div>
                        )}
                        {profile.goal.target_date && (
                          <div className="flex-1 min-w-[80px] bg-amber-50 rounded-lg px-3 py-2 text-center">
                            <p className="text-sm font-bold text-amber-700">
                              {new Date(profile.goal.target_date + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-[10px] text-amber-500">fecha límite</p>
                          </div>
                        )}
                      </div>
                      {profile.goal.notes && (
                        <p className="text-xs text-slate-500 italic">"{profile.goal.notes}"</p>
                      )}
                    </div>
                  )}
                  {profile?.athlete.goal_notes && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{profile.athlete.goal_notes}</p>
                  )}
                </section>
              )}

              {/* 2 — Nutrición esta semana */}
              <section className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Salad className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nutrición esta semana</p>
                </div>

                {profile?.nutrition_plan ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 truncate">
                      Plan: <span className="font-medium text-slate-700">{profile.nutrition_plan.name}</span>
                    </p>

                    {compliancePct !== null && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Cumplimiento</span>
                          <span className={cn(
                            'text-xs font-bold',
                            compliancePct >= 80 ? 'text-emerald-600' :
                            compliancePct >= 50 ? 'text-amber-600' : 'text-rose-500',
                          )}>
                            {compliancePct}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              compliancePct >= 80 ? 'bg-emerald-500' :
                              compliancePct >= 50 ? 'bg-amber-400' : 'bg-rose-400',
                            )}
                            style={{ width: `${compliancePct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2">
                      <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-black text-slate-800">{profile?.stats.meals_today ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">comidas hoy</p>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-black text-slate-800">{profile?.stats.meals_week ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">esta semana</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin plan nutricional activo</p>
                )}
              </section>

              {/* 3 — Última medición */}
              <section className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Última medición</p>
                  </div>
                  {lastMeasurement && (
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(lastMeasurement.measured_at), { locale: es, addSuffix: true })}
                    </span>
                  )}
                </div>

                {lastMeasurement ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Peso', value: lastMeasurement.weight_kg ? `${parseFloat(lastMeasurement.weight_kg).toFixed(1)} kg` : '—' },
                      { label: 'Grasa', value: lastMeasurement.body_fat_pct ? `${parseFloat(lastMeasurement.body_fat_pct).toFixed(1)}%` : '—' },
                      { label: 'IMC', value: lastMeasurement.bmi ? lastMeasurement.bmi.toFixed(1) : '—' },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-sm font-bold text-slate-800">{m.value}</p>
                        <p className="text-[10px] text-slate-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin mediciones registradas</p>
                )}
              </section>

              {/* 4 — Historial de citas */}
              {pastAppts.length > 0 && (
                <section className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial de consultas</p>
                  </div>
                  <div className="space-y-1.5">
                    {pastAppts.map(a => (
                      <div key={a.id} className="flex items-center gap-2.5 py-1">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          a.status === 'completed' ? 'bg-emerald-400' :
                          a.status === 'no_show'   ? 'bg-slate-300' : 'bg-amber-400',
                        )} />
                        <span className="text-xs text-slate-600 flex-1">
                          {a.appointment_type === 'first' ? '1ª consulta' : 'Seguimiento'}
                          {' · '}
                          {format(new Date(a.scheduled_at), "d 'de' MMM", { locale: es })}
                        </span>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          a.status === 'no_show'   ? 'bg-slate-100 text-slate-400' :
                                                     'bg-amber-50 text-amber-600',
                        )}>
                          {a.status_display}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5 — Notas de la cita */}
              {appointment.notes && (
                <section className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas de la cita</p>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 italic">
                    "{appointment.notes}"
                  </p>
                </section>
              )}

              {/* 6 — Notas clínicas */}
              <section className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notas clínicas</p>
                  </div>
                  <span className="text-[10px] text-slate-400 italic">Privadas · solo tú las ves</span>
                </div>
                <textarea
                  value={clinicalNotes}
                  onChange={e => { setClinicalNotes(e.target.value); setNotesSaved(false) }}
                  onBlur={() => {
                    if (clinicalNotes !== (appointment.clinical_notes ?? '')) {
                      saveNotesMutation.mutate(clinicalNotes)
                    }
                  }}
                  rows={4}
                  placeholder="Observaciones, diagnóstico, plan de tratamiento..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none transition-all"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={cn(
                    'text-[10px] transition-all duration-300',
                    notesSaved ? 'text-emerald-500 opacity-100' : 'opacity-0',
                  )}>
                    Guardado
                  </span>
                  <button
                    onClick={() => saveNotesMutation.mutate(clinicalNotes)}
                    disabled={saveNotesMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {saveNotesMutation.isPending
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando...</>
                      : <><Save className="w-3 h-3" /> Guardar</>
                    }
                  </button>
                </div>
              </section>

              {/* Ver perfil completo */}
              <div className="p-4">
                <button
                  onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${appointment.athlete}`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
                >
                  Ver perfil completo <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — actions */}
        {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
          <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onStatusChange(appointment.id, 'completed'); onClose() }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Completar
              </button>
              <button
                onClick={() => { onStatusChange(appointment.id, 'no_show'); onClose() }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 text-sm font-semibold transition-all"
              >
                <AlertCircle className="w-4 h-4" /> No asistió
              </button>
            </div>
            <button
              onClick={() => { onStatusChange(appointment.id, 'cancelled'); onClose() }}
              className="w-full py-2 rounded-xl border border-dashed border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-medium transition-all"
            >
              Cancelar cita
            </button>
          </div>
        )}

        {/* Footer — reschedule_requested */}
        {appointment.status === 'reschedule_requested' && (
          <div className="p-4 border-t border-amber-100 shrink-0 space-y-2 bg-amber-50/40">
            {appointment.reschedule_note && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 mb-2">
                <span className="font-semibold">Motivo:</span> {appointment.reschedule_note}
              </p>
            )}
            <p className="text-xs text-amber-600 font-semibold mb-1">Solicitud de reprogramación</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onStatusChange(appointment.id, 'accept_reschedule')}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-sm font-semibold transition-all"
              >
                <CalendarClock className="w-4 h-4" /> Reprogramar
              </button>
              <button
                onClick={() => { onStatusChange(appointment.id, 'reject_reschedule'); onClose() }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 text-sm font-semibold transition-all"
              >
                <X className="w-4 h-4" /> Rechazar
              </button>
            </div>
            <button
              onClick={() => { onStatusChange(appointment.id, 'completed'); onClose() }}
              className="w-full py-2 rounded-xl border border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-medium transition-all"
            >
              Marcar como completada de todas formas
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── NewAppointmentForm ────────────────────────────────────────────────────────

const TODAY = startOfDay(new Date())
const MAX_DATE = addDays(TODAY, 21)

interface NewAppointmentFormProps {
  gymId: string
  nutritionistId: string
  onClose: () => void
  onSuccess: (appointment: NutritionistAppointment) => void
}

function NewAppointmentForm({ gymId, nutritionistId, onClose, onSuccess }: NewAppointmentFormProps) {
  const [athleteSearch, setAthleteSearch]     = useState('')
  const [selectedAthlete, setSelectedAthlete] = useState<{ id: string; name: string } | null>(null)
  const [selectedDate, setSelectedDate]       = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot]       = useState<string | null>(null)
  const [duration, setDuration]               = useState('30')
  const [type, setType]                       = useState('followup')
  const [notes, setNotes]                     = useState('')

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''

  // Reset slot when date changes
  useEffect(() => { setSelectedSlot(null) }, [dateStr])

  const availableDaysQuery = useQuery({
    queryKey: ['nutri-own-days', nutritionistId],
    queryFn: async () => {
      const res = await api.get<string[]>('/api/gyms/availability/days/', {
        params: { nutritionist_id: nutritionistId },
      })
      return (res ?? []) as string[]
    },
  })

  const availableDaySet = new Set(availableDaysQuery.data ?? [])

  const isDisabledDay = (day: Date) => {
    if (isBefore(day, TODAY)) return true
    if (isAfter(day, MAX_DATE)) return true
    return !availableDaySet.has(format(day, 'yyyy-MM-dd'))
  }

  const athletesQuery = useQuery({
    queryKey: ['nutri-athletes-search', athleteSearch],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/nutritionist-assignments/my_athletes/', {
        params: { search: athleteSearch, page: '1', page_size: '8' },
      })
      return (data.results || []) as NutritionistAthlete[]
    },
    enabled: athleteSearch.length > 0 || !selectedAthlete,
  })

  const slotsQuery = useQuery({
    queryKey: ['nutri-own-slots', nutritionistId, dateStr],
    queryFn: async () => {
      const res = await api.get<string[]>('/api/gyms/availability/slots/', {
        params: { nutritionist_id: nutritionistId, date: dateStr },
      })
      return res ?? []
    },
    enabled: !!dateStr,
  })

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post<NutritionistAppointment>('/api/gyms/appointments/', payload),
    onSuccess: (data) => onSuccess(data),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAthlete || !selectedSlot) return
    mutation.mutate({
      athlete: selectedAthlete.id,
      scheduled_at: selectedSlot,
      duration_minutes: parseInt(duration),
      appointment_type: type,
      notes,
    })
  }

  const hasSlots = (slotsQuery.data?.length ?? 0) > 0
  const canSubmit = !!selectedAthlete && !!selectedSlot && !mutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">Nueva cita</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Athlete selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Cliente</label>
            {selectedAthlete ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {getInitials(selectedAthlete.name)}
                </div>
                <span className="text-sm font-medium text-slate-800 flex-1">{selectedAthlete.name}</span>
                <button type="button" onClick={() => setSelectedAthlete(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-9 h-9 rounded-xl text-sm border-slate-200"
                  value={athleteSearch}
                  onChange={e => setAthleteSearch(e.target.value)}
                />
                {athletesQuery.data && athletesQuery.data.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                    {athletesQuery.data.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setSelectedAthlete({ id: a.id, name: `${a.first_name} ${a.last_name}` }); setAthleteSearch('') }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {a.first_name[0]}{a.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{a.first_name} {a.last_name}</p>
                          <p className="text-[10px] text-slate-400">{a.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar date picker */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Fecha</label>
            {availableDaysQuery.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando disponibilidad...
              </div>
            ) : availableDaysQuery.data?.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 text-xs text-amber-700 font-medium">
                No tienes horarios configurados. Contacta al administrador.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDisabledDay}
                  locale={es}
                />
              </div>
            )}
          </div>

          {/* Slot picker */}
          {selectedDate && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                Horario — {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </label>
              {slotsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando horarios...
                </div>
              ) : !hasSlots ? (
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 py-4 text-center">
                  <p className="text-xs text-slate-400">Sin disponibilidad para este día</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slotsQuery.data!.map(slot => {
                    const label = new Date(slot).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                    const isSelected = selectedSlot === slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all',
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Duration + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Duración</label>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1.5 horas</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                <option value="first">Primera consulta</option>
                <option value="followup">Seguimiento</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Objetivos, recordatorios..."
              className="w-full rounded-xl text-sm border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-95">
              {mutation.isPending ? 'Guardando...' : 'Crear cita'}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-rose-600 text-center">
              {(mutation.error as any)?.data?.scheduled_at?.[0] ?? (mutation.error as any)?.message ?? 'Error al crear la cita'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AgendaPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const queryClient = useQueryClient()
  const user = getStoredUser<User>()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAppt, setSelectedAppt] = useState<NutritionistAppointment | null>(null)
  const [rescheduleAppt, setRescheduleAppt] = useState<NutritionistAppointment | null>(null)
  const [newScheduledAt, setNewScheduledAt] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)

  const now = new Date()
  const [viewDate, setViewDate] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', gymId],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/appointments/')
      return (data?.results || data || []) as NutritionistAppointment[]
    },
    refetchInterval: 60000,
  })

  const allAppointments = appointmentsQuery.data || []

  const invalidateAppts = () => queryClient.invalidateQueries({ queryKey: ['appointments', gymId] })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (status === 'accept_reschedule') {
        // Opens modal — handled separately
        return
      }
      if (status === 'reject_reschedule') {
        return api.post(`/api/gyms/appointments/${id}/reject-reschedule/`, {})
      }
      if (status === 'cancelled') {
        return api.post(`/api/gyms/appointments/${id}/cancel/`, {})
      }
      return api.patch(`/api/gyms/appointments/${id}/`, { status })
    },
    onSuccess: () => invalidateAppts(),
    onError: (err) => showError(err, 'No se pudo actualizar la cita'),
  })

  const handleRescheduleAccept = async () => {
    if (!rescheduleAppt || !newScheduledAt) return
    setRescheduleSubmitting(true)
    try {
      await api.post(`/api/gyms/appointments/${rescheduleAppt.id}/accept-reschedule/`, {
        scheduled_at: newScheduledAt,
      })
      showSuccess('Cita reprogramada')
      invalidateAppts()
      setRescheduleAppt(null)
      setSelectedAppt(null)
      setNewScheduledAt('')
    } catch (err) {
      showError(err, 'No se pudo reprogramar la cita')
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  const daysInMonth  = getDaysInMonth(viewDate.year, viewDate.month)
  const firstDay     = getFirstDayOfMonth(viewDate.year, viewDate.month)
  const WEEKDAYS     = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const MONTHS       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const appointmentsByDay: Record<number, NutritionistAppointment[]> = {}
  allAppointments.forEach(a => {
    const d = new Date(a.scheduled_at)
    if (d.getFullYear() === viewDate.year && d.getMonth() === viewDate.month) {
      const day = d.getDate()
      if (!appointmentsByDay[day]) appointmentsByDay[day] = []
      appointmentsByDay[day].push(a)
    }
  })

  const dayAppointments = selectedDay
    ? (appointmentsByDay[selectedDay] || []).filter(a => {
        if (filterStatus !== 'all' && a.status !== filterStatus) return false
        if (searchQuery && !a.athlete_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    : []

  const prevMonth = () => setViewDate(v => ({
    month: v.month === 0 ? 11 : v.month - 1,
    year:  v.month === 0 ? v.year - 1 : v.year,
  }))
  const nextMonth = () => setViewDate(v => ({
    month: v.month === 11 ? 0 : v.month + 1,
    year:  v.month === 11 ? v.year + 1 : v.year,
  }))

  if (!user || user.role !== 'nutritionist') return null

  return (
    <div className="space-y-6">
      {showForm && user && (
        <NewAppointmentForm
          gymId={gymId}
          nutritionistId={user.id}
          onClose={() => setShowForm(false)}
          onSuccess={(appointment) => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['appointments', gymId] })
            const d = new Date(appointment.scheduled_at)
            setViewDate({ year: d.getFullYear(), month: d.getMonth() })
            setSelectedDay(d.getDate())
          }}
        />
      )}

      {/* Context panel */}
      {selectedAppt && (
        <AppointmentContextPanel
          appointment={selectedAppt}
          gymId={gymId}
          onClose={() => setSelectedAppt(null)}
          onStatusChange={(id, status) => {
            if (status === 'accept_reschedule') {
              setRescheduleAppt(selectedAppt)
              return
            }
            statusMutation.mutate({ id, status })
          }}
        />
      )}

      {/* Reschedule modal */}
      <Dialog open={!!rescheduleAppt} onOpenChange={v => { if (!v) { setRescheduleAppt(null); setNewScheduledAt('') } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              Aceptar reprogramación
            </DialogTitle>
            {rescheduleAppt && (
              <p className="text-sm text-slate-500">
                {rescheduleAppt.athlete_name} · cita original: {format(new Date(rescheduleAppt.scheduled_at), "d 'de' MMMM, HH:mm", { locale: es })}
              </p>
            )}
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                Nuevo horario
              </Label>
              <input
                type="datetime-local"
                value={newScheduledAt}
                onChange={e => setNewScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-400">
              El atleta recibirá una notificación con el nuevo horario.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRescheduleAppt(null); setNewScheduledAt('') }}>
              Cancelar
            </Button>
            <Button
              onClick={handleRescheduleAccept}
              disabled={!newScheduledAt || rescheduleSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {rescheduleSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando...</>
                : <><CalendarClock className="w-4 h-4 mr-1.5" /> Confirmar nuevo horario</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona tus consultas y citas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nueva cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-800">{MONTHS[viewDate.month]} {viewDate.year}</h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-[10px] font-semibold text-slate-400 text-center py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday    = now.getDate() === day && now.getMonth() === viewDate.month && now.getFullYear() === viewDate.year
                const isSelected = selectedDay === day
                const dayAppts   = appointmentsByDay[day] || []
                const apptCount  = dayAppts.length
                const hasReschedule = dayAppts.some(a => a.status === 'reschedule_requested')

                return (
                  <button key={day} onClick={() => setSelectedDay(day)}
                    className={cn(
                      'relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-sm font-medium transition-all',
                      isSelected ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                        : isToday ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}>
                    <span>{day}</span>
                    {apptCount > 0 && (
                      <div className={`flex gap-0.5 mt-0.5 ${isSelected ? 'opacity-80' : ''}`}>
                        {Array.from({ length: Math.min(apptCount, 3) }).map((_, i) => (
                          <div key={i} className={cn(
                            'w-1 h-1 rounded-full',
                            isSelected ? 'bg-white' : (hasReschedule && i === 0 ? 'bg-amber-400' : 'bg-emerald-400'),
                          )} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" />Citas</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-600" />Hoy</div>
            </div>
          </div>
        </div>

        {/* Day appointments */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {selectedDay ? `${selectedDay} de ${MONTHS[viewDate.month]}` : 'Selecciona un día'}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input placeholder="Buscar..." className="pl-8 h-8 text-xs rounded-xl border-slate-200 w-36"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-8 rounded-xl text-xs border border-slate-200 px-2 bg-white focus:outline-none">
                <option value="all">Todos</option>
                <option value="scheduled">Programadas</option>
                <option value="confirmed">Confirmadas</option>
                <option value="reschedule_requested">Reprogramación</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>
          </div>

          {!selectedDay ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Selecciona un día del calendario</p>
            </div>
          ) : dayAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Sin citas para este día</p>
              <button onClick={() => setShowForm(true)} className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                + Crear nueva cita
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map(a => {
                const endTime = new Date(new Date(a.scheduled_at).getTime() + a.duration_minutes * 60000)
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAppt(a)}
                    className={cn(
                      'rounded-2xl border hover:shadow-sm transition-all p-4 cursor-pointer group',
                      a.status === 'reschedule_requested'
                        ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                        : 'bg-white border-slate-100 hover:border-emerald-200',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-right w-14">
                        <p className="text-sm font-bold text-slate-800">{formatTime(a.scheduled_at)}</p>
                        <p className="text-[10px] text-slate-400">{formatTime(endTime.toISOString())}</p>
                      </div>

                      <div className="w-px self-stretch bg-slate-100 mx-1" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {getInitials(a.athlete_name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{a.athlete_name}</p>
                              <p className="text-[10px] text-slate-400">
                                {a.duration_minutes} min · {a.appointment_type === 'first' ? '1ª consulta' : 'Seguimiento'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-[10px] font-bold flex items-center gap-1 ${STATUS_STYLES[a.status]}`}>
                              {STATUS_ICONS[a.status]}
                              {a.status_display}
                            </Badge>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                          </div>
                        </div>
                        {a.notes && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 line-clamp-1">
                            {a.notes}
                          </p>
                        )}
                        {a.status === 'reschedule_requested' && (
                          <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {a.reschedule_note ? `Motivo: ${a.reschedule_note}` : 'Solicita reprogramación'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
