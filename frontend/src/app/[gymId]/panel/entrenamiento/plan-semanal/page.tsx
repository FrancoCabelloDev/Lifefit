'use client'

import { useEffect, useState, use } from 'react'
import { Loader2, Plus, Trash2, CalendarDays, Target, User, Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import type { User as UserType, WorkoutRoutine, PaginatedResponse } from '@/lib/types'

interface WeeklySlot {
  id: string
  routine: string
  routine_detail: WorkoutRoutine
  day_of_week: number
  day_label: string
  suggested_time: string | null
  notes: string
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

const GOAL_LABELS: Record<string, string> = {
  weight_loss: '🔥 Pérdida de peso',
  muscle_gain: '💪 Ganancia muscular',
  endurance: '🏃 Resistencia',
  flexibility: '🧘 Flexibilidad',
  sport_perf: '🏅 Rendimiento deportivo',
  general_fitness: '⭐ Fitness general',
}

export default function PlanSemanalCoachPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)

  const [athletes, setAthletes] = useState<UserType[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [selectedAthlete, setSelectedAthlete] = useState<UserType | null>(null)
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form estado
  const [formDay, setFormDay] = useState('')
  const [formRoutine, setFormRoutine] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const data = await api.get<PaginatedResponse<UserType>>('/api/auth/gym-members/', { params: { role: 'athlete' } })
        setAthletes(Array.isArray(data) ? data : data.results || [])
      } catch { }
    }
    const fetchRoutines = async () => {
      try {
        const data = await api.get<PaginatedResponse<WorkoutRoutine>>('/api/workouts/routines/')
        setRoutines(Array.isArray(data) ? data : data.results || [])
      } catch { }
    }
    fetchAthletes()
    fetchRoutines()
  }, [gymId])

  const fetchPlan = async (athleteId: string) => {
    setIsLoading(true)
    try {
      const data = await api.get<{ results: WeeklySlot[] } | WeeklySlot[]>(
        `/api/workouts/weekly-plan/`, { params: { athlete: athleteId } }
      )
      setSlots(Array.isArray(data) ? data : data.results || [])
    } catch {
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAthlete = (id: string) => {
    setSelectedAthleteId(id)
    const athlete = athletes.find(a => a.id === id) || null
    setSelectedAthlete(athlete)
    fetchPlan(id)
  }

  const handleAddSlot = async () => {
    if (!formDay || !formRoutine || !selectedAthleteId) return
    setSaving(true)
    try {
      await api.post('/api/workouts/weekly-plan/', {
        athlete: selectedAthleteId,
        routine: formRoutine,
        day_of_week: parseInt(formDay),
        suggested_time: formTime || null,
        notes: formNotes,
      })
      showSuccess('Rutina agregada al plan')
      setDialogOpen(false)
      setFormDay(''); setFormRoutine(''); setFormTime(''); setFormNotes('')
      fetchPlan(selectedAthleteId)
    } catch (err) {
      showError(err, 'Error al agregar rutina')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slotId: string) => {
    try {
      await api.delete(`/api/workouts/weekly-plan/${slotId}/`)
      showSuccess('Rutina eliminada del plan')
      fetchPlan(selectedAthleteId)
    } catch (err) {
      showError(err, 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Plan Semanal</h1>
        <p className="text-slate-500 mt-2 text-lg">Diseña la semana de entrenamiento de tus atletas</p>
      </div>

      {/* Selector de atleta */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <Label className="mb-2 block">Selecciona un atleta</Label>
          <Select value={selectedAthleteId} onValueChange={handleSelectAthlete}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Elige un atleta..." />
            </SelectTrigger>
            <SelectContent>
              {athletes.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.first_name} {a.last_name} — {a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Info del atleta seleccionado */}
      {selectedAthlete && (
        <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
              {selectedAthlete.first_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{selectedAthlete.first_name} {selectedAthlete.last_name}</p>
              <p className="text-xs text-slate-500">{selectedAthlete.email}</p>
              {(selectedAthlete as any).fitness_goal ? (
                <div className="flex items-center gap-2 mt-2">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    {GOAL_LABELS[(selectedAthlete as any).fitness_goal] || (selectedAthlete as any).fitness_goal}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Sin objetivo definido aún</p>
              )}
              {(selectedAthlete as any).goal_notes && (
                <p className="text-xs text-slate-500 mt-1 italic">"{(selectedAthlete as any).goal_notes}"</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan semanal */}
      {selectedAthleteId && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Semana de entrenamiento</h2>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar rutina
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : slots.length === 0 ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-10 text-center">
                <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">Aún no hay rutinas en el plan. Presiona "Agregar rutina" para empezar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {DAYS.map(day => {
                  const daySlots = slots.filter(s => s.day_of_week === day.value)
                  return (
                    <div key={day.value} className="w-52 flex-shrink-0 flex flex-col gap-2">
                      {/* Day header */}
                      <div className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide text-center ${
                        daySlots.length > 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {day.label}
                        {daySlots.length > 0 && (
                          <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                            {daySlots.length}
                          </span>
                        )}
                      </div>

                      {/* Slots */}
                      {daySlots.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center py-8">
                          <p className="text-xs text-slate-300">Descanso</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {daySlots.map(slot => (
                            <div key={slot.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm group">
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Dumbbell className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                                    {slot.routine_detail?.name || 'Rutina'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDelete(slot.id)}
                                  className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="mt-1.5 space-y-0.5">
                                {slot.suggested_time && (
                                  <p className="text-[10px] text-slate-400">{slot.suggested_time.slice(0, 5)}</p>
                                )}
                                {slot.routine_detail && (
                                  <p className="text-[10px] text-slate-400">
                                    {slot.routine_detail.duration_minutes} min · {slot.routine_detail.routine_exercises?.length || 0} ejercicios · {slot.routine_detail.points_reward} pts
                                  </p>
                                )}
                                {slot.notes && (
                                  <p className="text-[10px] text-slate-400 italic">{slot.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog agregar rutina */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar rutina al plan</DialogTitle>
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
              <Label>Hora sugerida <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notas <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Ej: Enfocarse en la técnica, descansar 90 seg entre series..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddSlot}
              disabled={saving || !formDay || !formRoutine}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
