'use client'

import { useEffect, useState, use } from 'react'
import {
  Loader2, Dumbbell, Clock, Award, Plus, Trash2,
  CheckCircle2, Flame, ChevronDown, Info, ChevronRight,
} from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { levelColors, levelLabels } from '@/lib/constants'
import type { WorkoutRoutine, UserRoutineAssignment, PaginatedResponse } from '@/lib/types'
import { useSubscriptionTier } from '@/lib/hooks'
import { cn } from '@/lib/utils'

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
  { value: 0, label: 'Lunes',     short: 'Lu' },
  { value: 1, label: 'Martes',    short: 'Ma' },
  { value: 2, label: 'Miércoles', short: 'Mi' },
  { value: 3, label: 'Jueves',    short: 'Ju' },
  { value: 4, label: 'Viernes',   short: 'Vi' },
  { value: 5, label: 'Sábado',    short: 'Sá' },
  { value: 6, label: 'Domingo',   short: 'Do' },
]

const EFFORT_LABELS: Record<number, string> = {
  1: 'Muy fácil', 2: 'Fácil',     3: 'Ligero',
  4: 'Moderado',  5: 'Medio',      6: 'Algo intenso',
  7: 'Intenso',   8: 'Muy intenso', 9: 'Máximo', 10: 'Límite',
}

type SessionLogsMap = Record<string, number>
const logKey = (slotId: string, reId: string) => `${slotId}::${reId}`

// ── Effort Modal ──────────────────────────────────────────────────────────────

function EffortModal({
  routine,
  open,
  onClose,
  onConfirm,
}: {
  routine: WorkoutRoutine
  open: boolean
  onClose: () => void
  onConfirm: (rating: number) => void
}) {
  const [rating, setRating]   = useState<number | null>(null)
  const [saving, setSaving]   = useState(false)

  const effortBg = (r: number) =>
    r <= 3 ? 'border-emerald-400 bg-emerald-500 text-white' :
    r <= 6 ? 'border-amber-400 bg-amber-500 text-white' :
             'border-rose-400 bg-rose-500 text-white'

  const handleConfirm = async () => {
    if (!rating) return
    setSaving(true)
    await onConfirm(rating)
    setSaving(false)
    setRating(null)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">¿Cómo fue el entrenamiento?</DialogTitle>
          <p className="text-sm text-slate-400 mt-0.5">{routine.name}</p>
        </DialogHeader>

        <div className="py-2">
          <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
            Esfuerzo percibido (RPE)
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(r => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={cn(
                  'h-12 rounded-xl border-2 text-base font-black transition-all duration-150 active:scale-[0.92]',
                  rating === r
                    ? effortBg(r)
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          {rating && (
            <p className="text-center text-sm font-semibold text-slate-700 mt-3">
              {EFFORT_LABELS[rating]}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-10">
            Cancelar
          </Button>
          <Button
            disabled={!rating || saving}
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 active:scale-[0.97]"
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              : <Flame   className="w-4 h-4 mr-1.5" />
            }
            Registrar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Day strip ─────────────────────────────────────────────────────────────────

function DayStrip({
  slots,
  weekStart,
  selectedDay,
  todayDow,
  onSelect,
}: {
  slots: WeeklySlot[]
  weekStart: Date
  selectedDay: number
  todayDow: number
  onSelect: (d: number) => void
}) {
  return (
    <div className="flex gap-1.5">
      {DAYS.map(day => {
        const daySlots   = slots.filter(s => s.day_of_week === day.value)
        const hasSlots   = daySlots.length > 0
        const isToday    = day.value === todayDow
        const isSelected = day.value === selectedDay
        const allDone    = hasSlots && daySlots.every(s => s.routine_detail?.completed_today)
        const date       = addDays(weekStart, day.value)
        const dateNum    = format(date, 'd')

        return (
          <button
            key={day.value}
            onClick={() => onSelect(day.value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-2xl border transition-all duration-150 active:scale-[0.95]',
              isSelected
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20'
                : isToday
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200',
            )}
          >
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider',
              isSelected ? 'text-white/70' : isToday ? 'text-emerald-600' : 'text-slate-400',
            )}>
              {day.short}
            </span>
            <span className={cn(
              'text-lg font-black leading-none',
              isSelected ? 'text-white' : 'text-inherit',
            )}>
              {dateNum}
            </span>
            {/* Activity indicator */}
            <span className={cn(
              'w-1 h-1 rounded-full mt-0.5 transition-colors',
              allDone
                ? 'bg-emerald-500'
                : hasSlots
                ? isSelected ? 'bg-white/60' : isToday ? 'bg-emerald-400' : 'bg-slate-300'
                : 'opacity-0',
            )} />
          </button>
        )
      })}
    </div>
  )
}

// ── Exercise row ──────────────────────────────────────────────────────────────

function ExerciseRow({
  ex,
  index,
  setsCompleted,
  interactive,
  onSetTap,
}: {
  ex: WorkoutRoutine['routine_exercises'][0]
  index: number
  setsCompleted: number
  interactive: boolean
  onSetTap: (n: number) => void
}) {
  const isFullyDone = setsCompleted >= ex.sets
  const name        = ex.exercise_detail?.name ?? `Ejercicio ${index + 1}`

  return (
    <div className={cn(
      'px-5 py-4 transition-colors duration-200',
      isFullyDone ? 'bg-emerald-50/60' : 'bg-white',
    )}>
      {/* Exercise name + meta */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors',
            isFullyDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400',
          )}>
            {isFullyDone ? '✓' : index + 1}
          </span>
          <span className={cn(
            'text-sm font-semibold leading-tight',
            isFullyDone ? 'text-emerald-700' : 'text-slate-800',
          )}>
            {name}
          </span>
        </div>
        <span className="text-xs text-slate-400 shrink-0 font-medium">
          {ex.sets}×{ex.reps}
          {ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
        </span>
      </div>

      {/* Series pills — large, finger-friendly */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: ex.sets }).map((_, si) => {
          const filled = si < setsCompleted
          return (
            <button
              key={si}
              disabled={!interactive}
              onClick={() => interactive && onSetTap(filled ? si : si + 1)}
              className={cn(
                'h-11 px-4 rounded-xl text-sm font-bold border-2 transition-all duration-150 select-none',
                interactive
                  ? filled
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25 active:scale-[0.90]'
                    : 'border-slate-200 text-slate-400 bg-white hover:border-emerald-300 hover:text-emerald-600 active:scale-[0.90]'
                  : filled
                  ? 'bg-emerald-200 border-emerald-200 text-emerald-600 cursor-not-allowed'
                  : 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed',
              )}
              style={{
                transition: 'transform 150ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms, border-color 150ms',
              }}
            >
              {filled ? '✓' : `S${si + 1}`}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Workout card ──────────────────────────────────────────────────────────────

function WorkoutCard({
  slot,
  isToday,
  isPast,
  canEdit,
  sessionLogs,
  onSetCompleted,
  onComplete,
  onDelete,
}: {
  slot: WeeklySlot
  isToday: boolean
  isPast: boolean
  canEdit: boolean
  sessionLogs: SessionLogsMap
  onSetCompleted: (slotId: string, reId: string, n: number) => void
  onComplete: (slot: WeeklySlot, logs: SessionLogsMap) => void
  onDelete: (slot: WeeklySlot) => void
}) {
  const [expanded, setExpanded] = useState(isToday)
  const routine    = slot.routine_detail
  const exercises  = routine?.routine_exercises ?? []
  const selfCreate = !slot.coach
  const isMissed   = isPast && !isToday && !routine?.completed_today

  const getSets   = (reId: string) => sessionLogs[logKey(slot.id, reId)] ?? 0
  const doneSets  = exercises.filter(ex => getSets(ex.id) >= ex.sets).length
  const anySets   = exercises.some(ex => getSets(ex.id) > 0)
  const pct       = exercises.length > 0 ? Math.round((doneSets / exercises.length) * 100) : 0

  if (!routine) return null

  return (
    <div className={cn(
      'bg-white rounded-3xl border overflow-hidden shadow-sm transition-shadow',
      isToday && !routine.completed_today ? 'border-slate-200 shadow-md shadow-slate-200/80' : 'border-slate-200',
      isMissed && 'opacity-60',
    )}>
      {/* Progress bar */}
      <div className="h-1 bg-slate-100 relative overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-all duration-500',
            anySets ? 'bg-emerald-500' : routine.completed_today ? 'bg-emerald-300' : 'bg-transparent',
          )}
          style={{ width: anySets ? `${pct}%` : routine.completed_today ? '100%' : '0%' }}
        />
      </div>

      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-slate-50/80 transition-colors"
      >
        {/* Icon */}
        <div className={cn(
          'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
          routine.completed_today && !anySets
            ? 'bg-emerald-100'
            : isToday
            ? 'bg-slate-900'
            : 'bg-slate-100',
        )}>
          {routine.completed_today && !anySets
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Dumbbell className={cn('w-5 h-5', isToday ? 'text-white' : 'text-slate-500')} />
          }
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 leading-tight">{routine.name}</h3>
            {routine.completed_today && !anySets && (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Completada
              </span>
            )}
            {anySets && (
              <span className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                pct === 100
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200',
              )}>
                {doneSets}/{exercises.length} ej.
              </span>
            )}
            {isMissed && (
              <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                No completada
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {routine.duration_minutes} min
            </span>
            <span className="text-xs text-slate-400">
              {exercises.length} ejercicios
            </span>
            {routine.points_reward > 0 && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Award className="w-3 h-3" /> {routine.points_reward} pts
              </span>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && selfCreate && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(slot) }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-slate-400 transition-transform duration-200',
            expanded && 'rotate-180',
          )}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Coach note */}
      {slot.notes && expanded && (
        <div className="mx-5 mb-3 flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 italic leading-relaxed">{slot.notes}</p>
        </div>
      )}

      {/* Exercises */}
      {expanded && exercises.length > 0 && (
        <>
          <div className="border-t border-slate-100 divide-y divide-slate-100/80">
            {exercises.map((ex, i) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                index={i}
                setsCompleted={getSets(ex.id)}
                interactive={isToday && !routine.completed_today}
                onSetTap={(n) => onSetCompleted(slot.id, ex.id, n)}
              />
            ))}
          </div>

          {/* CTA */}
          {isToday && (
            <div className="px-5 py-4 border-t border-slate-100">
              {routine.completed_today && !anySets ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> Sesión completada hoy
                </div>
              ) : (
                <button
                  onClick={() => onComplete(slot, sessionLogs)}
                  disabled={!anySets}
                  className={cn(
                    'w-full h-12 rounded-2xl text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2',
                    anySets
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 active:scale-[0.98]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                  )}
                >
                  <Flame className="w-4 h-4" />
                  {anySets
                    ? `Registrar sesión · ${doneSets}/${exercises.length} ejercicios`
                    : 'Completa al menos 1 serie'
                  }
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Rest day ──────────────────────────────────────────────────────────────────

function RestDay({
  isToday,
  dayLabel,
  canEdit,
  onAdd,
}: {
  isToday: boolean
  dayLabel: string
  canEdit: boolean
  onAdd: () => void
}) {
  return (
    <div className={cn(
      'rounded-3xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3 transition-colors',
      isToday ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/20',
    )}>
      <span className="text-4xl">{isToday ? '🎯' : '🌙'}</span>
      <div className="text-center">
        <p className={cn(
          'text-sm font-bold',
          isToday ? 'text-emerald-600' : 'text-slate-400',
        )}>
          {isToday ? 'Día libre hoy' : 'Día de descanso'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {isToday ? 'Recupera, hidratate y descansa' : dayLabel}
        </p>
      </div>
      {canEdit && (
        <button
          onClick={onAdd}
          className="mt-1 text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors underline underline-offset-2"
        >
          + Agregar rutina para {dayLabel.toLowerCase()}
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MiPlanSemanalPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId }   = use(params)
  const { tier }    = useSubscriptionTier()
  const isBasic     = tier !== 'premium'

  const [slots, setSlots]             = useState<WeeklySlot[]>([])
  const [routines, setRoutines]       = useState<WorkoutRoutine[]>([])
  const [assignments, setAssignments] = useState<UserRoutineAssignment[]>([])
  const [hasCoach, setHasCoach]       = useState(false)
  const [isLoading, setIsLoading]     = useState(true)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null)

  const todayDow  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const [selectedDay, setSelectedDay] = useState<number>(todayDow)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const [sessionLogs, setSessionLogs] = useState<SessionLogsMap>({})
  const [effortSlot, setEffortSlot]   = useState<{ slot: WeeklySlot; logs: SessionLogsMap } | null>(null)

  const [formDay, setFormDay]         = useState('')
  const [formRoutine, setFormRoutine] = useState('')
  const [formNotes, setFormNotes]     = useState('')
  const [saving, setSaving]           = useState(false)

  const fetchAll = async () => {
    try {
      const [planData, coachStatus, routinesData, assignedData] = await Promise.all([
        api.get<{ results: WeeklySlot[] } | WeeklySlot[]>('/api/workouts/weekly-plan/'),
        api.get<{ has_coach: boolean }>('/api/workouts/my-coach-status/'),
        api.get<PaginatedResponse<WorkoutRoutine> | WorkoutRoutine[]>('/api/workouts/routines/'),
        api.get<UserRoutineAssignment[]>('/api/workouts/routines/my_assigned/').catch(() => []),
      ])
      setSlots(Array.isArray(planData) ? planData : (planData as any).results || [])
      setHasCoach(coachStatus.has_coach)
      setRoutines(Array.isArray(routinesData) ? routinesData : (routinesData as any).results || [])
      setAssignments(Array.isArray(assignedData) ? assignedData : [])
    } catch {
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [gymId])

  const handleSetCompleted = (slotId: string, reId: string, n: number) =>
    setSessionLogs(prev => ({ ...prev, [logKey(slotId, reId)]: n }))

  const handleOpenEffort = (slot: WeeklySlot, logs: SessionLogsMap) =>
    setEffortSlot({ slot, logs })

  const confirmComplete = async (rating: number) => {
    if (!effortSlot) return
    const { slot, logs } = effortSlot
    const routine   = slot.routine_detail
    const exercises = routine?.routine_exercises ?? []
    const exercise_logs = exercises.map(ex => {
      const sc = logs[logKey(slot.id, ex.id)] ?? 0
      return { routine_exercise: ex.id, sets_completed: sc, completed: sc >= ex.sets }
    })
    const totalEx  = exercises.length
    const doneEx   = exercise_logs.filter(l => l.completed).length
    const pct      = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 100
    try {
      await api.post('/api/workouts/sessions/', {
        routine:               routine.id,
        performed_at:          new Date().toISOString(),
        duration_minutes:      routine.duration_minutes,
        status:                'completed',
        completion_percentage: pct,
        perceived_exertion:    rating,
        exercise_logs,
      })
      showSuccess(`¡Sesión completada! ${doneEx}/${totalEx} ejercicios`)
      setSessionLogs(prev => {
        const next = { ...prev }
        exercises.forEach(ex => delete next[logKey(slot.id, ex.id)])
        return next
      })
      setEffortSlot(null)
      fetchAll()
    } catch (err) {
      showError(err, 'Error al guardar la sesión')
      setEffortSlot(null)
    }
  }

  const handleAdd = async () => {
    if (!formDay || !formRoutine) return
    setSaving(true)
    try {
      await api.post('/api/workouts/weekly-plan/', {
        routine:     formRoutine,
        day_of_week: parseInt(formDay),
        notes:       formNotes,
      })
      showSuccess('Rutina agregada a tu plan')
      setDialogOpen(false)
      setFormDay(''); setFormRoutine(''); setFormNotes('')
      fetchAll()
    } catch (err) {
      showError(err, 'Error al agregar rutina')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slot: WeeklySlot) => {
    try {
      await api.delete(`/api/workouts/weekly-plan/${slot.id}/`)
      showSuccess('Rutina eliminada del plan')
      fetchAll()
    } catch (err) {
      showError(err, 'Error al eliminar')
    }
  }

  const canEdit = !hasCoach

  const selectedDaySlots = slots.filter(s => s.day_of_week === selectedDay)
  const isSelectedToday  = selectedDay === todayDow
  const isSelectedPast   = selectedDay < todayDow
  const selectedDate     = addDays(weekStart, selectedDay)
  const selectedDayLabel = DAYS.find(d => d.value === selectedDay)?.label ?? ''

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Mi Entrenamiento</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {hasCoach ? 'Plan de tu coach' : 'Tu plan semanal'}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 rounded-xl h-9 text-sm active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar
          </Button>
        )}
      </div>

      {/* ── Coach banner — slim ── */}
      {hasCoach && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          Tu coach diseña y actualiza este plan
        </div>
      )}

      {/* ── Day strip ── */}
      {slots.length > 0 && (
        <DayStrip
          slots={slots}
          weekStart={weekStart}
          selectedDay={selectedDay}
          todayDow={todayDow}
          onSelect={setSelectedDay}
        />
      )}

      {/* ── Day content ── */}
      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-600">
              {hasCoach ? 'Tu coach aún no armó tu plan' : 'Tu plan está vacío'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {hasCoach
                ? 'Escríbele un mensaje para que configure tu semana'
                : 'Agrega rutinas a los días de la semana'}
            </p>
          </div>
          {canEdit && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 rounded-xl active:scale-[0.97]"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Agregar primera rutina
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Date label */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-700">{selectedDayLabel}</h2>
            {isSelectedToday && (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Hoy
              </span>
            )}
            <span className="ml-auto text-xs text-slate-400">
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </span>
          </div>

          {selectedDaySlots.length === 0 ? (
            <RestDay
              isToday={isSelectedToday}
              dayLabel={selectedDayLabel}
              canEdit={canEdit}
              onAdd={() => { setFormDay(String(selectedDay)); setDialogOpen(true) }}
            />
          ) : (
            <div className="space-y-3">
              {selectedDaySlots.map(slot => (
                <WorkoutCard
                  key={slot.id}
                  slot={slot}
                  isToday={isSelectedToday}
                  isPast={isSelectedPast}
                  canEdit={canEdit}
                  sessionLogs={sessionLogs}
                  onSetCompleted={handleSetCompleted}
                  onComplete={handleOpenEffort}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Quick nav to next workout day */}
          {isSelectedToday && selectedDaySlots.length === 0 && (() => {
            const next = DAYS.find(d =>
              d.value > selectedDay && slots.some(s => s.day_of_week === d.value)
            )
            if (!next) return null
            return (
              <button
                onClick={() => setSelectedDay(next.value)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.98]"
              >
                <span>Próximo entrenamiento: <span className="font-bold text-slate-900">{next.label}</span></span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )
          })()}
        </div>
      )}

      {/* ── My Routines section (library tab replaced) ── */}
      {assignments.length > 0 && (
        <details className="group">
          <summary className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl cursor-pointer list-none select-none hover:bg-slate-50 transition-colors active:scale-[0.98]">
            <span className="text-sm font-semibold text-slate-700">Todas mis rutinas</span>
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 duration-200" />
          </summary>
          <div className="mt-2 space-y-2">
            {(isBasic ? routines : assignments.map(a => a.routine_detail).filter(Boolean) as WorkoutRoutine[]).map(routine => {
              const isOpen = expandedRoutineId === routine.id
              return (
                <div key={routine.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedRoutineId(isOpen ? null : routine.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      <Dumbbell className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{routine.name}</p>
                      <p className="text-xs text-slate-400">
                        {routine.duration_minutes} min · {routine.routine_exercises?.length ?? 0} ejercicios
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          const syn: WeeklySlot = {
                            id: `quick-${routine.id}`,
                            routine: routine.id,
                            routine_detail: routine,
                            day_of_week: -1,
                            day_label: '',
                            suggested_time: null,
                            notes: '',
                            coach: null,
                          }
                          setEffortSlot({ slot: syn, logs: {} })
                        }}
                        className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors active:scale-[0.95]"
                      >
                        Iniciar
                      </button>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-slate-400 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )} />
                    </div>
                  </button>
                  {isOpen && (routine.routine_exercises ?? []).length > 0 && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100/80">
                      {(routine.routine_exercises ?? []).map((ex, i) => (
                        <div key={ex.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50">
                          <span className="text-sm text-slate-700">
                            <span className="text-xs text-slate-400 mr-1.5">{i + 1}.</span>
                            {ex.exercise_detail?.name ?? `Ejercicio ${i + 1}`}
                          </span>
                          <span className="text-xs text-slate-500">
                            {ex.sets}×{ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* ── Effort modal ── */}
      {effortSlot && (
        <EffortModal
          routine={effortSlot.slot.routine_detail}
          open
          onClose={() => setEffortSlot(null)}
          onConfirm={confirmComplete}
        />
      )}

      {/* ── Add routine dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Agregar rutina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Día</Label>
                <Select value={formDay} onValueChange={setFormDay}>
                  <SelectTrigger className="h-9 rounded-xl text-sm">
                    <SelectValue placeholder="Día…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DAYS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Rutina</Label>
                <Select value={formRoutine} onValueChange={setFormRoutine}>
                  <SelectTrigger className="h-9 rounded-xl text-sm">
                    <SelectValue placeholder="Rutina…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {routines.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nota <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Ej: Enfocarse en técnica, pausas largas…"
                rows={2}
                className="rounded-xl text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-9 text-sm">
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !formDay || !formRoutine}
              className="bg-slate-900 hover:bg-slate-800 rounded-xl h-9 text-sm active:scale-[0.97]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
