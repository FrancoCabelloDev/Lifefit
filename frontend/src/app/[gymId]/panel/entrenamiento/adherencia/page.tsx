'use client'

import { useEffect, useRef, useState, use } from 'react'
import {
  TrendingUp, Loader2, AlertTriangle, CheckCircle2,
  Dumbbell, X, ChevronRight, Calendar, Zap, Circle,
  CalendarDays, Activity, ChevronDown, Award,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { useRoleGuard } from '@/hooks/useRoleGuard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoutineAdherence {
  routine_id:        string
  routine_name:      string
  assigned_since:    string
  sessions_last_30d: number
  adherence_pct:     number
  last_completed:    string | null
  days_since_last:   number | null
}

interface AthleteAdherence {
  athlete_id:          string
  athlete_name:        string
  athlete_email:       string
  routines:            RoutineAdherence[]
  total_sessions_30d:  number
  avg_adherence_pct:   number
  days_inactive:       number | null
  alert:               boolean
  pending_approval:    boolean
  current_week_start:  string
}

interface ExerciseLog {
  exercise_name:   string
  sets_prescribed: number
  sets_completed:  number
  completed:       boolean
}

interface WeekSession {
  session_id:            string
  routine_name:          string | null
  performed_at:          string
  duration_minutes:      number
  perceived_exertion:    number
  completion_percentage: number
  exercises_done:        number
  exercises_total:       number
  exercise_logs:         ExerciseLog[]
}

interface WeekData {
  week_start:         string
  week_end:           string
  week_label:         string
  sessions_completed: number
  sessions_expected:  number
  all_completed:      boolean
  approved:           boolean
  points_awarded:     number
  sessions:           WeekSession[]
}

interface WeekSlot {
  slot_id:        string
  day_of_week:    number
  day_label:      string
  routine_name:   string
  suggested_time: string | null
}

interface ActiveRoutine {
  assignment_id:    string
  routine_id:       string
  routine_name:     string
  level:            string
  duration_minutes: number
  assigned_since:   string
  exercises: { id: string; name: string; sets: number; reps: number; weight_kg: number | null }[]
}

interface AthleteDetail {
  athlete: {
    id:           string
    full_name:    string
    email:        string
    puntos:       number
    member_since: string
  }
  active_routines: ActiveRoutine[]
  weekly_plan:     WeekSlot[]
  weeks:           WeekData[]
  week_points:     number
  adherence: {
    sessions_last_30d: number
    adherence_pct:     number
    days_inactive:     number | null
    alert:             boolean
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// ── Helpers ───────────────────────────────────────────────────────────────────

function InactivityLabel({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">Sin actividad</span>
  if (days === 0)    return <span className="text-xs text-emerald-600 font-medium">Activo hoy</span>
  if (days === 1)    return <span className="text-xs text-emerald-600">Activo ayer</span>
  if (days < 7)      return <span className="text-xs text-amber-600">Hace {days} días</span>
  return <span className="text-xs text-rose-500 font-semibold">Inactivo {days}d ⚠️</span>
}

function SectionHeader({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      {badge}
    </div>
  )
}

const effortBg = (r: number) =>
  r <= 3 ? 'bg-emerald-50 text-emerald-700' :
  r <= 6 ? 'bg-amber-50  text-amber-700'   :
           'bg-rose-50   text-rose-700'

// ── ApproveWeekButton ─────────────────────────────────────────────────────────

function ApproveWeekButton({
  athleteId,
  weekStart,
  weekPoints,
  onApproved,
}: {
  athleteId:  string
  weekStart:  string
  weekPoints: number
  onApproved: (weekStart: string, pointsAwarded: number) => void
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (state !== 'idle') return
    setState('loading')
    try {
      const res = await api.post<{ points_awarded: number }>(
        `/api/workouts/coach/athlete/${athleteId}/approve-week/`,
        { week_start: weekStart },
      )
      setState('done')
      showSuccess(`+${res.points_awarded} pts acreditados`)
      setTimeout(() => onApproved(weekStart, res.points_awarded), 500)
    } catch (err) {
      showError(err, 'Error al aprobar semana')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Aprobado
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 select-none',
        'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700',
        'transition-colors duration-150',
        state === 'loading' && 'opacity-60 cursor-not-allowed',
      )}
      style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), background-color 150ms, border-color 150ms' }}
      onMouseDown={e => { if (state === 'idle') (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
    >
      {state === 'loading'
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <Zap className="w-3.5 h-3.5" />
      }
      Aprobar +{weekPoints} pts
    </button>
  )
}

// ── Week Card ─────────────────────────────────────────────────────────────────

function WeekCard({
  week,
  athleteId,
  weekPoints,
  defaultExpanded,
  optimisticApproved,
  onApproved,
}: {
  week:             WeekData
  athleteId:        string
  weekPoints:       number
  defaultExpanded:  boolean
  optimisticApproved: boolean
  onApproved:       (weekStart: string, pts: number) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const isApproved  = week.approved || optimisticApproved
  const isComplete  = week.all_completed
  const hasSessions = week.sessions.length > 0

  const ptsAwarded = optimisticApproved ? weekPoints : week.points_awarded

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden',
        isApproved  ? 'border-emerald-200 bg-emerald-50/20'  :
        isComplete  ? 'border-emerald-200 bg-white'           :
        hasSessions ? 'border-amber-100  bg-amber-50/10'      :
                      'border-slate-100  bg-white',
      )}
    >
      {/* Top strip */}
      <div className={cn(
        'h-0.5',
        isApproved  ? 'bg-emerald-400' :
        isComplete  ? 'bg-emerald-300' :
        hasSessions ? 'bg-amber-300'   : 'bg-slate-100',
      )} />

      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
        style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1)' }}
      >
        {/* Chevron */}
        <ChevronDown className={cn(
          'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
          expanded ? 'rotate-0' : '-rotate-90',
        )} />

        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-800">
            Semana {week.week_label}
          </span>
        </div>

        {/* Right side: completion + action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Session count pill */}
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full tabular-nums',
            isApproved                                       ? 'bg-emerald-100 text-emerald-700' :
            week.sessions_completed === week.sessions_expected && week.sessions_expected > 0
                                                             ? 'bg-emerald-100 text-emerald-700' :
            hasSessions                                      ? 'bg-amber-100   text-amber-700'   :
                                                               'bg-slate-100   text-slate-400',
          )}>
            {week.sessions_completed}/{week.sessions_expected}
          </span>

          {/* Status badge / approve button */}
          {isApproved ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" /> +{ptsAwarded} pts
            </span>
          ) : isComplete ? (
            <ApproveWeekButton
              athleteId={athleteId}
              weekStart={week.week_start}
              weekPoints={weekPoints}
              onApproved={onApproved}
            />
          ) : hasSessions ? (
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              Incompleta
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Sin sesiones
            </span>
          )}
        </div>
      </button>

      {/* Sessions list */}
      {expanded && (
        <div className="border-t border-slate-100">
          {week.sessions.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-4 text-xs text-slate-400">
              <Calendar className="w-4 h-4" />
              Sin sesiones esta semana
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {week.sessions.map(session => {
                const isSessionExpanded = expandedSession === session.session_id
                const pct = Math.round(session.completion_percentage)

                return (
                  <div key={session.session_id}>
                    <button
                      onClick={() => setExpandedSession(isSessionExpanded ? null : session.session_id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50/60 transition-colors"
                    >
                      {/* RPE bubble */}
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex flex-col items-center justify-center shrink-0 text-[11px] font-black',
                        effortBg(session.perceived_exertion),
                      )}>
                        <span className="leading-none">{session.perceived_exertion}</span>
                        <span className="text-[7px] font-semibold opacity-60">RPE</span>
                      </div>

                      {/* Routine + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {session.routine_name ?? 'Sesión libre'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(parseISO(session.performed_at), "EEEE d MMM · HH:mm", { locale: es })}
                        </p>
                      </div>

                      {/* Exercises count */}
                      <div className="text-right shrink-0">
                        <span className={cn(
                          'text-sm font-black tabular-nums',
                          pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-500',
                        )}>
                          {session.exercises_done}/{session.exercises_total}
                        </span>
                        <p className="text-[10px] text-slate-400">ej.</p>
                      </div>

                      <ChevronDown className={cn(
                        'w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform duration-150',
                        isSessionExpanded ? 'rotate-0' : '-rotate-90',
                      )} />
                    </button>

                    {/* Exercise logs */}
                    {isSessionExpanded && session.exercise_logs.length > 0 && (
                      <div className="bg-slate-50/60 border-t border-slate-100 divide-y divide-slate-100/60">
                        {session.exercise_logs.map((log, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-6 py-2">
                            {log.completed
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              : <Circle       className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            }
                            <span className={cn(
                              'flex-1 text-xs',
                              log.completed ? 'text-slate-700' : 'text-slate-400',
                            )}>
                              {log.exercise_name}
                            </span>
                            <span className={cn(
                              'text-xs font-semibold tabular-nums',
                              log.completed ? 'text-emerald-600' : 'text-slate-400',
                            )}>
                              {log.sets_completed}/{log.sets_prescribed}s
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Athlete Detail Panel ──────────────────────────────────────────────────────

function AthletePanel({
  athleteId,
  onClose,
}: {
  athleteId: string
  onClose:   () => void
}) {
  const [data, setData]           = useState<AthleteDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  // week_start → points_awarded for optimistic updates
  const [approvedWeeks, setApprovedWeeks] = useState<Map<string, number>>(new Map())

  const fetchData = () => {
    setLoading(true)
    api.get<AthleteDetail>(`/api/workouts/coach/athlete/${athleteId}/`)
      .then(d => { setData(d); setApprovedWeeks(new Map()) })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [athleteId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleWeekApproved = (weekStart: string, pts: number) => {
    setApprovedWeeks(prev => new Map(prev).set(weekStart, pts))
    // Re-fetch en background para sincronizar puntos totales
    api.get<AthleteDetail>(`/api/workouts/coach/athlete/${athleteId}/`)
      .then(d => { setData(d); setApprovedWeeks(new Map()) })
      .catch(() => {})
  }

  const adherence = data?.adherence
  const isAlert   = (adherence?.days_inactive ?? 0) >= 5

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30 lg:hidden"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
        style={{ transition: 'transform 220ms cubic-bezier(0.23,1,0.32,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 truncate">
              {data?.athlete.full_name ?? '…'}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {data?.athlete.email ?? ''}
              {data && (
                <span className="ml-2 text-slate-300">·</span>
              )}
              {data && (
                <span className="ml-2 text-xs font-semibold text-slate-500">
                  {data.athlete.puntos} pts
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0 ml-3"
            style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : !data ? (
            <div className="py-20 text-center text-sm text-slate-400">
              No se pudo cargar el detalle.
            </div>
          ) : (
            <div className="p-5 space-y-6">

              {/* ── Alert inactividad ── */}
              {isAlert && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-rose-700">Inactividad prolongada</p>
                    <p className="text-xs text-rose-600 mt-0.5">
                      {adherence?.days_inactive === null
                        ? 'Nunca ha completado una sesión'
                        : `${adherence!.days_inactive} días sin entrenar`}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Métricas ── */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: 'Sesiones / 30d',
                    value: adherence?.sessions_last_30d ?? 0,
                    color: 'text-slate-900',
                  },
                  {
                    label: 'Adherencia',
                    value: `${adherence?.adherence_pct ?? 0}%`,
                    color: (adherence?.adherence_pct ?? 0) >= 75 ? 'text-emerald-600'
                         : (adherence?.adherence_pct ?? 0) >= 40 ? 'text-amber-500'
                         : 'text-rose-500',
                  },
                  {
                    label: 'Pts acumulados',
                    value: data.athlete.puntos,
                    color: 'text-slate-900',
                  },
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 rounded-2xl p-3.5 text-center">
                    <p className={cn('text-xl font-black', m.color)}>{m.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Plan semanal ── */}
              {data.weekly_plan.length > 0 && (
                <section>
                  <SectionHeader icon={<CalendarDays className="w-4 h-4" />} label="Plan semanal" />
                  <div className="grid grid-cols-7 gap-1 mt-3">
                    {DOW_LABELS.map((d, i) => {
                      const slot = data.weekly_plan.find(s => s.day_of_week === i)
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex flex-col items-center gap-1 py-2 rounded-xl text-center',
                            slot ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100',
                          )}
                        >
                          <span className="text-[10px] font-bold text-slate-400">{d}</span>
                          {slot
                            ? <Dumbbell className="w-3 h-3 text-emerald-600" />
                            : <span className="w-3 h-3" />
                          }
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ── Semanas ── */}
              <section>
                <SectionHeader
                  icon={<Activity className="w-4 h-4" />}
                  label="Semanas"
                  badge={
                    data.weeks.some(w => w.all_completed && !w.approved && !approvedWeeks.has(w.week_start)) ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        pendiente de aprobar
                      </span>
                    ) : undefined
                  }
                />

                {data.weeks.every(w => w.sessions_completed === 0) ? (
                  <div className="mt-3 flex flex-col items-center py-8 gap-2">
                    <Calendar className="w-8 h-8 text-slate-200" />
                    <p className="text-xs text-slate-400">Sin sesiones registradas</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {data.weeks.map((week, i) => (
                      <WeekCard
                        key={week.week_start}
                        week={week}
                        athleteId={athleteId}
                        weekPoints={data.week_points}
                        defaultExpanded={i === 0}
                        optimisticApproved={approvedWeeks.has(week.week_start)}
                        onApproved={handleWeekApproved}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Rutinas activas ── */}
              {data.active_routines.length > 0 && (
                <section>
                  <SectionHeader icon={<Dumbbell className="w-4 h-4" />} label="Rutinas activas" />
                  <div className="mt-3 space-y-2">
                    {data.active_routines.map(r => (
                      <div key={r.assignment_id} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.routine_name}</p>
                          <span className="text-xs text-slate-400 shrink-0">{r.exercises.length} ej.</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.duration_minutes} min · desde{' '}
                          {format(parseISO(r.assigned_since + 'T00:00:00'), "d MMM yyyy", { locale: es })}
                        </p>
                        {r.exercises.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.exercises.slice(0, 5).map(ex => (
                              <span key={ex.id} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                                {ex.name}
                              </span>
                            ))}
                            {r.exercises.length > 5 && (
                              <span className="text-[10px] text-slate-400 px-1">+{r.exercises.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Types for pending points ───────────────────────────────────────────────────


// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdherenciaPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId }               = use(params)
  useRoleGuard(gymId, ['coach'])
  const [data, setData]         = useState<AthleteAdherence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    api.get<AthleteAdherence[]>('/api/workouts/adherence/')
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [gymId])

  const alerts = data.filter(a => a.alert).length
  const active = data.filter(a => !a.alert).length
  const avgPct = data.length
    ? Math.round(data.reduce((s, a) => s + a.avg_adherence_pct, 0) / data.length)
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* ── Left: athlete list ── */}
      <div className={cn(
        'flex-1 min-w-0 space-y-5 transition-all duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        selectedId ? 'lg:mr-[420px]' : '',
      )}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entrenamiento</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Seguimiento y aprobación de tus atletas</p>
          </div>

        </div>

        {<>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activos',          value: active,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Con alerta',        value: alerts,       color: 'text-rose-500',    bg: 'bg-rose-50'    },
            { label: 'Adherencia media',  value: `${avgPct}%`, color: 'text-slate-900',   bg: 'bg-slate-50'   },
          ].map(s => (
            <div key={s.label} className={cn('rounded-2xl border border-slate-200 p-4', s.bg)}>
              <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Athlete list */}
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Sin atletas asignados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map(athlete => {
              const isSelected = selectedId === athlete.athlete_id
              return (
                <button
                  key={athlete.athlete_id}
                  onClick={() => setSelectedId(isSelected ? null : athlete.athlete_id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-150',
                    athlete.alert
                      ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50/60',
                    isSelected && 'ring-2 ring-emerald-400 ring-offset-1',
                  )}
                  style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.99)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0',
                    athlete.alert ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700',
                  )}>
                    {athlete.athlete_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{athlete.athlete_name}</p>
                      {athlete.alert && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                      {athlete.pending_approval && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <Zap className="w-2.5 h-2.5" /> Aprobar semana
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <InactivityLabel days={athlete.days_inactive} />
                      <span className="text-slate-200 text-xs">·</span>
                      <span className="text-xs text-slate-400">{athlete.total_sessions_30d} ses./30d</span>
                    </div>
                    {athlete.routines.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                        {athlete.routines.map(r => (
                          <div key={r.routine_id} className="flex items-center gap-1.5">
                            <div className="w-14 h-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  r.adherence_pct >= 75 ? 'bg-emerald-500'
                                  : r.adherence_pct >= 40 ? 'bg-amber-400'
                                  : 'bg-rose-400',
                                )}
                                style={{ width: `${r.adherence_pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{r.adherence_pct}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className={cn(
                        'text-base font-black',
                        athlete.avg_adherence_pct >= 75 ? 'text-emerald-600'
                        : athlete.avg_adherence_pct >= 40 ? 'text-amber-500'
                        : 'text-rose-500',
                      )}>
                        {athlete.avg_adherence_pct}%
                      </p>
                      <p className="text-[10px] text-slate-400">adherencia</p>
                    </div>
                    <ChevronRight className={cn(
                      'w-4 h-4 transition-transform duration-150',
                      isSelected ? 'rotate-90 text-emerald-500' : 'text-slate-300',
                    )} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
        </>}
      </div>

      {/* ── Right: slide-in athlete detail panel ── */}
      {selectedId && (
        <AthletePanel
          key={selectedId}
          athleteId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
