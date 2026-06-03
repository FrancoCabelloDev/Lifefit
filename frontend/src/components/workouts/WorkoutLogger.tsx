'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dumbbell, CheckCircle2, Circle } from 'lucide-react'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import type { WorkoutRoutine, RoutineExercise } from '@/lib/types'

interface WorkoutLoggerProps {
  routine: WorkoutRoutine
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export default function WorkoutLogger({ routine, open, onClose, onComplete }: WorkoutLoggerProps) {
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({})
  const [duration, setDuration] = useState(routine.duration_minutes || 30)
  const [exertion, setExertion] = useState('5')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleSet = (exerciseId: string, setIndex: number) => {
    setCompletedSets(prev => {
      const sets = [...(prev[exerciseId] || [])]
      sets[setIndex] = !sets[setIndex]
      return { ...prev, [exerciseId]: sets }
    })
  }

  const totalSets = routine.routine_exercises?.reduce(
    (sum: number, ex: RoutineExercise) => sum + (ex.sets || 0), 0
  ) || 0
  const completedCount = Object.values(completedSets).reduce(
    (sum, sets) => sum + sets.filter(Boolean).length, 0
  )
  // Si no hay ejercicios que marcar, se considera 100% completada
  const completionPct = totalSets > 0 ? Math.round((completedCount / totalSets) * 100) : 100
  const isCompleted = completionPct >= 80

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await api.post('/api/workouts/sessions/', {
        routine: routine.id,
        performed_at: new Date().toISOString(),
        duration_minutes: duration,
        perceived_exertion: parseInt(exertion),
        completion_percentage: completionPct,
        notes,
        status: isCompleted ? 'completed' : 'planned',
      })
      showSuccess(isCompleted ? '¡Entrenamiento completado! 💪' : 'Progreso guardado')
      onComplete()
      onClose()
    } catch (err) {
      showError('No se pudo guardar la sesión')
      console.error('Error saving session', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Dumbbell className="w-5 h-5 text-emerald-600" />
            {routine.name}
          </DialogTitle>
          <DialogDescription>
            {routine.objective} · {routine.duration_minutes} min · {routine.routine_exercises?.length || 0} ejercicios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {routine.routine_exercises?.map((exercise: RoutineExercise, exIdx: number) => (
            <div key={exercise.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center">
                    {exIdx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{exercise.exercise_detail?.name || `Ejercicio ${exIdx + 1}`}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {exercise.sets} × {exercise.reps}{exercise.weight_kg ? ` · ${exercise.weight_kg}kg` : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: exercise.sets || 0 }).map((_, setIdx) => {
                  const isComplete = completedSets[exercise.id]?.[setIdx] || false
                  return (
                    <button
                      key={setIdx}
                      onClick={() => toggleSet(exercise.id, setIdx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        isComplete
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                      Serie {setIdx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Duración (min)</Label>
            <Input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)} min={1} />
          </div>
          <div className="space-y-2">
            <Label>Percepción de esfuerzo</Label>
            <Select value={exertion} onValueChange={setExertion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} / 10</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="¿Cómo te fue en el entrenamiento?" rows={2} />
        </div>

        <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-slate-600">Progreso</span>
          <span className="text-sm font-bold text-emerald-600">{completedCount}/{totalSets} series · {completionPct}%</span>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Guardando...' : isCompleted ? 'Completar Entrenamiento' : 'Guardar Progreso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
