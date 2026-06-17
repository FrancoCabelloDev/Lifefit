'use client'

import { useEffect, useState, use } from 'react'
import {
  Loader2, Dumbbell, Clock, Award, CalendarDays, Plus, Trash2,
  Info, Zap, ChevronDown, ChevronUp, CheckCircle2, Flame,
} from 'lucide-react'
import { startOfWeek, addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { levelColors, levelLabels } from '@/lib/constants'
import WorkoutLogger from '@/components/workouts/WorkoutLogger'
import type { WorkoutRoutine, UserRoutineAssignment, PaginatedResponse } from '@/lib/types'
import { useSubscriptionTier } from '@/lib/hooks'
import WeekSelector from '@/components/shared/WeekSelector'
import { cn } from '@/lib/utils'

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

const DAYS = [
  { value: 0, label: 'Lunes',     short: 'Lun' },
  { value: 1, label: 'Martes',    short: 'Mar' },
  { value: 2, label: 'Miércoles', short: 'Mié' },
  { value: 3, label: 'Jueves',    short: 'Jue' },
  { value: 4, label: 'Viernes',   short: 'Vie' },
  { value: 5, label: 'Sábado',    short: 'Sáb' },
  { value: 6, label: 'Domingo',   short: 'Dom' },
]


const EFFORT_LABELS: Record<number, string> = {
  1: 'Muy fácil', 2: 'Fácil', 3: 'Ligero',
  4: 'Moderado',  5: 'Medio',  6: 'Algo intenso',
  7: 'Intenso',   8: 'Muy intenso', 9: 'Máximo', 10: 'Límite',
}
const effortColor = (r: number) =>
  r <= 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
  r <= 6 ? 'bg-amber-100 text-amber-700 border-amber-200' :
           'bg-rose-100 text-rose-700 border-rose-200'

// ── Exercise checkboxes (localStorage) ──────────────────────────────────────

function useExerciseChecks(routineId: string, dateStr: string) {
  const key = `workout_${routineId}_${dateStr}`
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
  })
  const toggle = (exId: string) => {
    setChecked(prev => {
      const next = { ...prev, [exId]: !prev[exId] }
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }
  return { checked, toggle }
}

// ── Effort Rating Modal ──────────────────────────────────────────────────────

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
  const [rating, setRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!rating) return
    setSaving(true)
    await onConfirm(rating)
    setSaving(false)
    setRating(null)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">¿Cómo fue tu entrenamiento?</DialogTitle>
          <p className="text-sm text-slate-500 mt-0.5">{routine.name}</p>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2 py-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(r => (
            <button
              key={r}
              onClick={() => setRating(r)}
              className={cn(
                'h-11 rounded-xl border-2 text-sm font-bold transition-all',
                rating === r
                  ? effortColor(r) + ' scale-105 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {rating && (
          <p className="text-center text-sm font-medium text-slate-700 -mt-1">
            {EFFORT_LABELS[rating]}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!rating || saving}
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Flame className="w-4 h-4 mr-1" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Day selector chip ────────────────────────────────────────────────────────

function DayChip({
  day,
  date,
  slots,
  isToday,
  isPast,
  isSelected,
  onClick,
}: {
  day: { value: number; label: string; short: string }
  date: Date
  slots: WeeklySlot[]
  isToday: boolean
  isPast: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const dateNum  = format(date, 'd')
  const hasSlots = slots.length > 0
  const allDone  = hasSlots && slots.every(s => s.routine_detail?.completed_today)
  const someDone = hasSlots && slots.some(s => s.routine_detail?.completed_today)
  const isMissed = isPast && !isToday && hasSlots && !someDone

  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all min-w-[52px]',
        isSelected
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          : isToday
          ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
          : allDone
          ? 'border-slate-200 bg-slate-700 text-white'
          : isMissed
          ? 'border-dashed border-slate-200 text-slate-400 bg-slate-50'
          : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50',
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{day.short}</span>
      <span className="text-base font-black leading-none">{dateNum}</span>
      {allDone ? (
        <span className={cn('text-[9px] font-bold mt-0.5', isSelected ? 'text-white/80' : 'text-emerald-400')}>✓</span>
      ) : isMissed ? (
        <span className={cn('text-[9px] font-bold mt-0.5', isSelected ? 'text-white/80' : 'text-rose-300')}>✗</span>
      ) : someDone ? (
        <span className={cn('text-[9px] font-bold mt-0.5', isSelected ? 'text-white/80' : 'text-amber-400')}>~</span>
      ) : isToday && !isSelected ? (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
      ) : (
        <span className="h-2 mt-0.5" />
      )}
    </button>
  )
}

// ── Hero Routine Card ─────────────────────────────────────────────────────────

function HeroRoutineCard({
  slot,
  isToday,
  isPast,
  canEdit,
  dateStr,
  onDelete,
  onComplete,
}: {
  slot: WeeklySlot
  isToday: boolean
  isPast: boolean
  canEdit: boolean
  dateStr: string
  onDelete: (slot: WeeklySlot) => void
  onComplete: (routine: WorkoutRoutine) => void
}) {
  const routine    = slot.routine_detail
  const selfCreate = !slot.coach
  const exercises  = routine?.routine_exercises ?? []
  const { checked, toggle } = useExerciseChecks(routine?.id ?? '', dateStr)
  const checkedCount = exercises.filter(ex => checked[ex.id]).length
  const isMissed = isPast && !isToday && !routine?.completed_today

  if (!routine) return null

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden',
      isToday ? 'border-emerald-200' : 'border-slate-200',
    )}>
      {/* Top accent bar */}
      <div className={cn(
        'h-1',
        isToday && !routine.completed_today ? 'bg-emerald-500' :
        routine.completed_today             ? 'bg-emerald-300' :
        isMissed                            ? 'bg-slate-200' :
                                              'bg-slate-100',
      )} />

      <div className="p-5">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{routine.name}</h3>
            {routine.objective && (
              <p className="text-sm text-slate-500 mt-0.5 leading-snug">{routine.objective}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {routine.completed_today && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completada
              </span>
            )}
            {isMissed && (
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                ✗ No completada
              </span>
            )}
            {canEdit && selfCreate && (
              <button
                onClick={() => onDelete(slot)}
                className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className={cn('text-xs', levelColors[routine.level] || '')}>
            {levelLabels[routine.level] || routine.level}
          </Badge>
          <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
            <Clock className="w-3 h-3 mr-1" />
            {routine.duration_minutes} min
          </Badge>
          {exercises.length > 0 && (
            <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
              <Dumbbell className="w-3 h-3 mr-1" />
              {exercises.length} ejercicios
            </Badge>
          )}
          {routine.points_reward > 0 && (
            <Badge variant="outline" className="text-xs border-amber-100 text-amber-600 bg-amber-50">
              <Award className="w-3 h-3 mr-1" />
              {routine.points_reward} pts
            </Badge>
          )}
        </div>

        {/* Coach / personal note */}
        {slot.notes && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {slot.coach ? 'Nota de tu coach' : 'Nota'}
            </p>
            <p className="text-sm text-slate-600 italic">"{slot.notes}"</p>
          </div>
        )}

        {/* Exercise checklist — always visible */}
        {exercises.length > 0 && (
          <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500">Ejercicios</p>
              <span className="text-xs font-bold">
                <span className="text-emerald-600">{checkedCount}</span>
                <span className="text-slate-400">/{exercises.length}</span>
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => toggle(ex.id)}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                    checked[ex.id]
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 hover:border-emerald-400',
                  )}>
                    {checked[ex.id] && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={cn(
                    'flex-1 text-sm transition-all',
                    checked[ex.id] ? 'line-through text-slate-400' : 'text-slate-700',
                  )}>
                    <span className="text-slate-400 text-xs mr-1.5">{i + 1}.</span>
                    {ex.exercise_detail?.name ?? `Ejercicio ${i + 1}`}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {ex.sets}×{ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA — only on today */}
        {isToday && (
          routine.completed_today ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 rounded-xl py-3">
              <CheckCircle2 className="w-4 h-4" /> Sesión completada hoy
            </div>
          ) : (
            <button
              onClick={() => onComplete(routine)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              <Flame className="w-4 h-4" /> Completar sesión
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MiPlanSemanalPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId }          = use(params)
  const { tier }           = useSubscriptionTier()
  const isBasic            = tier !== 'premium'

  const [slots, setSlots]             = useState<WeeklySlot[]>([])
  const [routines, setRoutines]       = useState<WorkoutRoutine[]>([])
  const [assignments, setAssignments] = useState<UserRoutineAssignment[]>([])
  const [hasCoach, setHasCoach]       = useState(false)
  const [isLoading, setIsLoading]     = useState(true)
  const [loggerRoutine, setLoggerRoutine] = useState<WorkoutRoutine | null>(null)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [effortRoutine, setEffortRoutine] = useState<WorkoutRoutine | null>(null)

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const [selectedDay, setSelectedDay] = useState<number>(todayDow)
  const [weekStart, setWeekStart]     = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Form
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

  const handleAdd = async () => {
    if (!formDay || !formRoutine) return
    setSaving(true)
    try {
      await api.post('/api/workouts/weekly-plan/', {
        routine: formRoutine,
        day_of_week: parseInt(formDay),
        notes: formNotes,
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

  const handleQuickComplete = (routine: WorkoutRoutine) => setEffortRoutine(routine)

  const confirmComplete = async (rating: number) => {
    if (!effortRoutine) return
    try {
      await api.post('/api/workouts/sessions/', {
        routine:               effortRoutine.id,
        performed_at:          new Date().toISOString(),
        duration_minutes:      effortRoutine.duration_minutes,
        status:                'completed',
        completion_percentage: 100,
        perceived_exertion:    rating,
      })
      setEffortRoutine(null)
      fetchAll()
    } catch {
      setEffortRoutine(null)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  )

  const canEdit        = !hasCoach
  const totalExercises = slots.reduce((s, sl) => s + (sl.routine_detail?.routine_exercises?.length || 0), 0)
  const activeDays     = new Set(slots.map(s => s.day_of_week)).size

  // Selected day derived values
  const selectedDaySlots  = slots.filter(s => s.day_of_week === selectedDay)
  const selectedDayDate   = addDays(weekStart, selectedDay)
  const selectedDayDateStr = format(selectedDayDate, 'yyyy-MM-dd')
  const selectedDayLabel  = DAYS.find(d => d.value === selectedDay)?.label ?? ''
  const isSelectedToday   = selectedDay === todayDow
  const isSelectedPast    = selectedDay < todayDow

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Entrenamiento</h1>
          <p className="text-slate-500 mt-0.5">
            {hasCoach ? 'Plan diseñado por tu coach' : 'Tu plan de entrenamiento'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Agregar rutina
          </Button>
        )}
      </div>

      <Tabs defaultValue="esta-semana">
        <TabsList className="mb-4">
          <TabsTrigger value="esta-semana">Esta semana</TabsTrigger>
          <TabsTrigger value="todas">Todas mis rutinas</TabsTrigger>
        </TabsList>

        {/* ── Tab: Esta semana ── */}
        <TabsContent value="esta-semana" className="space-y-4">
          <WeekSelector currentWeekStart={weekStart} onChange={setWeekStart} />

          {hasCoach && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-xs font-medium text-emerald-700">
                Tu coach administra este plan. Consulta con él si quieres cambios.
              </p>
            </div>
          )}

          {slots.length === 0 ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <CalendarDays className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">
                  {hasCoach ? 'Tu coach aún no ha armado tu plan' : 'Tu plan está vacío'}
                </h3>
                <p className="text-slate-500 mt-1">
                  {hasCoach
                    ? '¡Pídele a tu coach que configure tu semana de entrenamiento!'
                    : 'Agrega rutinas a los días de la semana para organizar tu entrenamiento.'}
                </p>
                {canEdit && (
                  <Button onClick={() => setDialogOpen(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" /> Agregar mi primera rutina
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Días / semana', value: activeDays,     icon: '📅', bg: 'bg-emerald-50' },
                  { label: 'Rutinas',       value: slots.length,   icon: '💪', bg: 'bg-blue-50'    },
                  { label: 'Ejercicios',    value: totalExercises, icon: '⚡', bg: 'bg-amber-50'   },
                ].map(s => (
                  <Card key={s.label} className="border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-base shrink-0`}>
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium leading-none">{s.label}</p>
                        <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{s.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Day selector chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                {DAYS.map(day => {
                  const daySlots = slots.filter(s => s.day_of_week === day.value)
                  const isToday  = day.value === todayDow
                  const isPast   = day.value < todayDow
                  const dayDate  = addDays(weekStart, day.value)
                  return (
                    <DayChip
                      key={day.value}
                      day={day}
                      date={dayDate}
                      slots={daySlots}
                      isToday={isToday}
                      isPast={isPast}
                      isSelected={selectedDay === day.value}
                      onClick={() => setSelectedDay(day.value)}
                    />
                  )
                })}
              </div>

              {/* Selected day content */}
              <div>
                {/* Day label row */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    {selectedDayLabel}
                    {isSelectedToday && (
                      <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Hoy
                      </span>
                    )}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {format(selectedDayDate, "d 'de' MMMM", { locale: es })}
                  </span>
                </div>

                {selectedDaySlots.length === 0 ? (
                  /* Rest / free day */
                  <div className={cn(
                    'border-2 rounded-2xl flex flex-col items-center justify-center py-16 gap-2',
                    isSelectedToday
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-dashed border-slate-200 bg-slate-50/30',
                  )}>
                    <span className={`text-4xl ${isSelectedToday ? '' : 'opacity-25'}`}>
                      {isSelectedToday ? '🎯' : '🌙'}
                    </span>
                    <p className={`text-sm font-semibold mt-1 ${isSelectedToday ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {isSelectedToday ? 'Día libre' : 'Día de descanso'}
                    </p>
                    {canEdit && (
                      <button
                        onClick={() => { setFormDay(String(selectedDay)); setDialogOpen(true) }}
                        className="mt-2 text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors underline underline-offset-2"
                      >
                        + Agregar rutina para {selectedDayLabel.toLowerCase()}
                      </button>
                    )}
                  </div>
                ) : (
                  /* Routine cards for the selected day */
                  <div className="space-y-4">
                    {selectedDaySlots.map(slot => (
                      <HeroRoutineCard
                        key={slot.id}
                        slot={slot}
                        isToday={isSelectedToday}
                        isPast={isSelectedPast}
                        canEdit={canEdit}
                        dateStr={selectedDayDateStr}
                        onDelete={handleDelete}
                        onComplete={handleQuickComplete}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Tab: Todas mis rutinas ── */}
        <TabsContent value="todas" className="space-y-4">
          {isBasic && assignments.length === 0 && routines.length > 0 && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Estas son las rutinas disponibles en el gimnasio. Agrégalas a tu plan semanal desde la pestaña "Esta semana".
              </p>
            </div>
          )}
          {(isBasic ? routines : assignments.map(a => a.routine_detail).filter(Boolean) as WorkoutRoutine[]).length === 0 ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <Dumbbell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">
                  {isBasic ? 'No hay rutinas disponibles' : 'Sin rutinas asignadas'}
                </h3>
                <p className="text-slate-500 mt-1">
                  {isBasic
                    ? 'El gimnasio aún no ha creado rutinas disponibles.'
                    : 'Tu coach aún no te ha asignado rutinas de entrenamiento.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(isBasic ? routines : assignments.map(a => a.routine_detail).filter(Boolean) as WorkoutRoutine[]).map(routine => {
                const isExpanded     = expandedId === routine.id
                const completedToday = routine.completed_today
                return (
                  <Card key={routine.id} className="border-slate-200 shadow-sm">
                    <CardContent className="p-0">
                      <div
                        role="button" tabIndex={0}
                        onClick={() => setExpandedId(isExpanded ? null : routine.id)}
                        onKeyDown={e => e.key === 'Enter' && setExpandedId(isExpanded ? null : routine.id)}
                        className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Dumbbell className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">{routine.name}</h3>
                              {completedToday && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completada hoy</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant="outline" className={`text-xs ${levelColors[routine.level] || ''}`}>
                                {levelLabels[routine.level] || routine.level}
                              </Badge>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {routine.duration_minutes} min
                              </span>
                              {routine.points_reward > 0 && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <Award className="w-3 h-3" /> {routine.points_reward} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant={completedToday ? 'outline' : 'default'}
                            className={completedToday
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'bg-emerald-600 hover:bg-emerald-700'}
                            onClick={e => { e.stopPropagation(); setLoggerRoutine(routine) }}
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            {completedToday ? 'Repetir' : 'Iniciar'}
                          </Button>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-2">
                          {routine.objective && <p className="text-sm text-slate-600 mb-2">{routine.objective}</p>}
                          {routine.routine_exercises?.map((ex, i) => (
                            <div key={ex.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                                <span className="text-sm font-medium text-slate-700">{ex.exercise_detail?.name || `Ejercicio ${i + 1}`}</span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {ex.sets} × {ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                              </span>
                            </div>
                          ))}
                          {routine.notes && <p className="text-xs text-slate-400 italic mt-2">{routine.notes}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog agregar rutina */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Agregar rutina a tu plan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Día de la semana</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger><SelectValue placeholder="Selecciona el día..." /></SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rutina</Label>
              <Select value={formRoutine} onValueChange={setFormRoutine}>
                <SelectTrigger><SelectValue placeholder="Selecciona la rutina..." /></SelectTrigger>
                <SelectContent>
                  {routines.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — {r.duration_minutes} min · {r.points_reward} pts
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Ej: Enfocarse en la técnica..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving || !formDay || !formRoutine} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Effort rating modal */}
      {effortRoutine && (
        <EffortModal
          routine={effortRoutine}
          open={true}
          onClose={() => setEffortRoutine(null)}
          onConfirm={confirmComplete}
        />
      )}

      {/* Full workout logger */}
      {loggerRoutine && (
        <WorkoutLogger routine={loggerRoutine} open={true} onClose={() => setLoggerRoutine(null)} onComplete={fetchAll} />
      )}
    </div>
  )
}
