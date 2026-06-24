'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dumbbell, ChevronDown, ChevronUp, CheckCircle2, Clock,
  Flame, Trophy, CalendarDays, Loader2, ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { User, UserRoutineAssignment, WorkoutRoutine } from '@/lib/types'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklySlot {
  id: string
  routine: string
  routine_detail: WorkoutRoutine
  day_of_week: number
  day_label: string
  suggested_time: string | null
  notes: string
  coach: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 0, label: 'Lunes',     short: 'Lun' },
  { value: 1, label: 'Martes',    short: 'Mar' },
  { value: 2, label: 'Miércoles', short: 'Mié' },
  { value: 3, label: 'Jueves',    short: 'Jue' },
  { value: 4, label: 'Viernes',   short: 'Vie' },
  { value: 5, label: 'Sábado',    short: 'Sáb' },
  { value: 6, label: 'Domingo',   short: 'Dom' },
]

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-50 text-emerald-700 border-emerald-100',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-100',
  advanced:     'bg-rose-50 text-rose-700 border-rose-100',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
}

// ── ExerciseList ──────────────────────────────────────────────────────────────

function ExerciseList({ routine }: { routine: WorkoutRoutine }) {
  const exercises = routine.routine_exercises ?? []
  if (exercises.length === 0) return (
    <p className="text-xs text-slate-400 italic py-2 px-1">Sin ejercicios detallados</p>
  )
  return (
    <div className="divide-y divide-slate-50">
      {exercises.map((ex, i) => (
        <div key={ex.id} className="flex items-center gap-3 py-2.5">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">
              {ex.exercise_detail?.name ?? '—'}
            </p>
            {ex.exercise_detail?.muscle_group && (
              <p className="text-[10px] text-slate-400">{ex.exercise_detail.muscle_group}</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
            <span className="font-medium">{ex.sets} × {ex.reps}</span>
            {ex.rest_seconds > 0 && (
              <span className="text-slate-300">{ex.rest_seconds}s</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── WeekDayCard ───────────────────────────────────────────────────────────────

function WeekDayCard({ day, slots }: { day: typeof DAYS[0]; slots: WeeklySlot[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-white">{day.short}</span>
        </div>
        <span className="text-sm font-semibold text-slate-800">{day.label}</span>
        <span className="ml-auto text-[10px] text-slate-400">
          {slots.length} {slots.length === 1 ? 'rutina' : 'rutinas'}
        </span>
      </div>

      {/* Slots */}
      <div className="divide-y divide-slate-50">
        {slots.map(slot => {
          const routine = slot.routine_detail
          if (!routine) return null
          const open = !!expanded[slot.id]
          const exCount = routine.routine_exercises?.length ?? 0

          return (
            <div key={slot.id} className="px-4 py-3">
              {/* Routine row */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {routine.name}
                    </p>
                    {routine.level && (
                      <Badge className={cn('text-[10px] border px-1.5 py-0', LEVEL_COLORS[routine.level])}>
                        {LEVEL_LABELS[routine.level] ?? routine.level}
                      </Badge>
                    )}
                    {routine.completed_today && (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 px-1.5 py-0 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Completada hoy
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {routine.duration_minutes > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {routine.duration_minutes} min
                      </span>
                    )}
                    {exCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Dumbbell className="w-3 h-3" />
                        {exCount} ejercicios
                      </span>
                    )}
                    {slot.suggested_time && (
                      <span className="text-[11px] text-slate-400">
                        {slot.suggested_time.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {slot.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">"{slot.notes}"</p>
                  )}
                </div>

                {exCount > 0 && (
                  <button
                    onClick={() => toggle(slot.id)}
                    className="shrink-0 w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-95"
                    style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
                    aria-label={open ? 'Ocultar ejercicios' : 'Ver ejercicios'}
                  >
                    {open
                      ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    }
                  </button>
                )}
              </div>

              {/* Exercises */}
              {open && exCount > 0 && (
                <div className="mt-3 pl-0 border-t border-slate-50 pt-2">
                  <ExerciseList routine={routine} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── RoutineCard (registro rápido) ─────────────────────────────────────────────

function RoutineCard({ assignment, gymId }: { assignment: UserRoutineAssignment; gymId: string }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const routine = assignment.routine_detail
  if (!routine) return null

  const sessionMutation = useMutation({
    mutationFn: () => api.post('/api/workouts/sessions/', {
      routine: routine.id,
      performed_at: new Date().toISOString(),
      duration_minutes: routine.duration_minutes,
      status: 'completed',
      completion_percentage: 100,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-routines', gymId] })
      queryClient.invalidateQueries({ queryKey: ['my-weekly-plan', gymId] })
    },
  })

  const completedToday = routine.completed_today

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-semibold text-slate-900 truncate">{routine.name}</h3>
              {routine.level && (
                <Badge className={cn('text-[10px] border', LEVEL_COLORS[routine.level])}>
                  {LEVEL_LABELS[routine.level] ?? routine.level}
                </Badge>
              )}
              {completedToday && (
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completada hoy
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {routine.duration_minutes > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {routine.duration_minutes} min
                </span>
              )}
              {(routine.points_reward ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                  <Trophy className="w-3 h-3" />
                  {routine.points_reward} pts
                </span>
              )}
              {(routine.routine_exercises?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Dumbbell className="w-3 h-3" />
                  {routine.routine_exercises!.length} ejercicios
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => { if (!completedToday) sessionMutation.mutate() }}
            disabled={completedToday || sessionMutation.isPending}
            className={cn(
              'shrink-0 h-9 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5',
              'active:scale-[0.97]',
              completedToday
                ? 'bg-emerald-50 text-emerald-600 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60'
            )}
            style={{ transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
          >
            {completedToday ? (
              <><CheckCircle2 className="w-3.5 h-3.5" />Completada</>
            ) : sessionMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Registrando...</>
            ) : (
              <><Flame className="w-3.5 h-3.5" />Marcar completada</>
            )}
          </button>
        </div>

        {(routine.routine_exercises?.length ?? 0) > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-3 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Ocultar ejercicios' : 'Ver ejercicios'}
          </button>
        )}
      </div>

      {expanded && (routine.routine_exercises?.length ?? 0) > 0 && (
        <div className="border-t border-slate-100 px-4 pb-3">
          <ExerciseList routine={routine} />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MisRutinasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['athlete'])
  useFeatureGuard(gymId, 'rutinas')
  const user = getStoredUser<User>()

  const weeklyQuery = useQuery({
    queryKey: ['my-weekly-plan', gymId],
    queryFn: async () => {
      const res = await api.get<{ results: WeeklySlot[] } | WeeklySlot[]>('/api/workouts/weekly-plan/')
      return (Array.isArray(res) ? res : res.results ?? []) as WeeklySlot[]
    },
    enabled: !!user && user.role === 'athlete',
  })

  const assignmentsQuery = useQuery({
    queryKey: ['my-routines', gymId],
    queryFn: () => api.get<UserRoutineAssignment[]>('/api/workouts/routines/my_assigned/'),
    enabled: !!user && user.role === 'athlete',
  })

  const slots       = weeklyQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []
  const isLoading   = weeklyQuery.isLoading || assignmentsQuery.isLoading

  // Agrupar slots por día (solo días con al menos un slot)
  const activeDays = DAYS.filter(d => slots.some(s => s.day_of_week === d.value))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Rutinas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Plan semanal y rutinas asignadas por tu coach</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Plan Semanal ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-700">Plan semanal</h2>
            </div>

            {activeDays.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Sin plan semanal configurado</p>
                  <p className="text-xs text-slate-400 mt-1">Tu coach configurará qué días entrenas</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDays.map(day => (
                  <WeekDayCard
                    key={day.value}
                    day={day}
                    slots={slots.filter(s => s.day_of_week === day.value)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Registro rápido ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-700">Registro rápido</h2>
              <span className="text-[11px] text-slate-400 ml-1">Marca completadas de hoy</span>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Sin rutinas asignadas</p>
                  <p className="text-xs text-slate-400 mt-1">Tu coach te asignará rutinas de entrenamiento</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => (
                  <RoutineCard key={a.id} assignment={a} gymId={gymId} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
