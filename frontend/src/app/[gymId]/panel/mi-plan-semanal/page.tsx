'use client'

import { useEffect, useState, use } from 'react'
import { Loader2, Dumbbell, Clock, Award, CalendarDays, Plus, Trash2, Info, Zap, ChevronDown, ChevronUp } from 'lucide-react'
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
import WorkoutLogger from '@/components/workouts/WorkoutLogger'
import type { WorkoutRoutine, UserRoutineAssignment, PaginatedResponse } from '@/lib/types'
import { useSubscriptionTier } from '@/lib/hooks'

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
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
]

const levelLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const levelColors: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700 border-green-100',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-100',
  advanced: 'bg-rose-50 text-rose-700 border-rose-100',
}

export default function MiPlanSemanalPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const { tier } = useSubscriptionTier()
  const isBasic = tier !== 'premium'
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [assignments, setAssignments] = useState<UserRoutineAssignment[]>([])
  const [hasCoach, setHasCoach] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loggerRoutine, setLoggerRoutine] = useState<WorkoutRoutine | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form
  const [formDay, setFormDay] = useState('')
  const [formRoutine, setFormRoutine] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    try {
      const [planData, coachStatus, routinesData, assignedData] = await Promise.all([
        api.get<{ results: WeeklySlot[] } | WeeklySlot[]>('/api/workouts/weekly-plan/'),
        api.get<{ has_coach: boolean }>('/api/workouts/my-coach-status/'),
        api.get<PaginatedResponse<WorkoutRoutine> | WorkoutRoutine[]>('/api/workouts/routines/'),
        // Basic: usar todas las rutinas del gym como fallback (no tienen coach que asigne)
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

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const canEdit = !hasCoach
  const totalExercises = slots.reduce((s, sl) => s + (sl.routine_detail?.routine_exercises?.length || 0), 0)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Entrenamiento</h1>
          <p className="text-slate-500 mt-2 text-lg">
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
          {hasCoach && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">
                Tu coach administra este plan. Consulta con él si quieres hacer cambios.
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs text-slate-500 font-medium">Días de entrenamiento</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">
                      {new Set(slots.map(s => s.day_of_week)).size}
                    </p>
                    <p className="text-xs text-slate-400">de 7 días</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs text-slate-500 font-medium">Rutinas asignadas</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{slots.length}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <p className="text-xs text-slate-500 font-medium">Ejercicios totales</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{totalExercises}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {DAYS.map(day => {
                  const daySlots = slots.filter(s => s.day_of_week === day.value)
                  const isToday = day.value === todayDow
                  if (daySlots.length === 0) return null
                  return (
                    <Card
                      key={day.value}
                      className={`border shadow-sm ${isToday ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className={`font-bold text-base ${isToday ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {day.label}
                          </h3>
                          {isToday && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Hoy</Badge>
                          )}
                        </div>
                        <div className="space-y-3">
                          {daySlots.map(slot => {
                            const routine = slot.routine_detail
                            if (!routine) return null
                            const selfCreated = !slot.coach
                            return (
                              <div key={slot.id} className="flex items-center justify-between gap-4 bg-slate-50 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                    <Dumbbell className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 text-sm truncate">{routine.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <Badge variant="outline" className={`text-xs ${levelColors[routine.level] || ''}`}>
                                        {levelLabels[routine.level] || routine.level}
                                      </Badge>
                                      <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{routine.duration_minutes} min
                                      </span>
                                      {routine.points_reward > 0 && (
                                        <span className="text-xs text-amber-600 flex items-center gap-1">
                                          <Award className="w-3 h-3" />{routine.points_reward} pts
                                        </span>
                                      )}
                                      {routine.routine_exercises && routine.routine_exercises.length > 0 && (
                                        <span className="text-xs text-slate-400">
                                          {routine.routine_exercises.length} ejercicio{routine.routine_exercises.length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                    {slot.notes && <p className="text-xs text-slate-400 italic mt-1">{slot.notes}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {isToday && (
                                    <button
                                      onClick={() => setLoggerRoutine(routine)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                      Iniciar
                                    </button>
                                  )}
                                  {canEdit && selfCreated && (
                                    <button
                                      onClick={() => handleDelete(slot)}
                                      className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Tab: Todas mis rutinas ── */}
        <TabsContent value="todas" className="space-y-4">
          {/* Para Basic: mostrar rutinas del gym disponibles para agregar al plan */}
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
              {(isBasic ? routines : assignments.map(a => a.routine_detail).filter(Boolean) as WorkoutRoutine[]).map((routine) => {
                const itemId = routine.id
                const isExpanded = expandedId === itemId
                const completedToday = routine.completed_today

                return (
                  <Card key={itemId} className="border-slate-200 shadow-sm">
                    <CardContent className="p-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedId(isExpanded ? null : itemId)}
                        onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : itemId)}
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
                              : 'bg-emerald-600 hover:bg-emerald-700'
                            }
                            onClick={(e) => {
                              e.stopPropagation()
                              setLoggerRoutine(routine)
                            }}
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            {completedToday ? 'Repetir' : 'Iniciar'}
                          </Button>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-3">
                          <p className="text-sm text-slate-600">{routine.objective ?? ''}</p>
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
                          {routine.notes && (
                            <p className="text-xs text-slate-400 italic mt-2">{routine.notes}</p>
                          )}
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

      {/* Dialog agregar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar rutina a tu plan</DialogTitle>
          </DialogHeader>
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
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Ej: Enfocarse en la técnica..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !formDay || !formRoutine}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loggerRoutine && (
        <WorkoutLogger
          routine={loggerRoutine}
          open={true}
          onClose={() => setLoggerRoutine(null)}
          onComplete={fetchAll}
        />
      )}
    </div>
  )
}
