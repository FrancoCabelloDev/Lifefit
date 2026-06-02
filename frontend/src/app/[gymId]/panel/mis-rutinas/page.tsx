'use client'

import { useEffect, useState, use } from 'react'
import { Dumbbell, Clock, Award, Loader2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { api } from '@/lib/api'
import type { UserRoutineAssignment, WorkoutRoutine } from '@/lib/types'
import WorkoutLogger from '@/components/workouts/WorkoutLogger'

export default function MisRutinasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams

  const [assignments, setAssignments] = useState<UserRoutineAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loggerRoutine, setLoggerRoutine] = useState<WorkoutRoutine | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchAssignments = async () => {
    try {
      const data = await api.get<UserRoutineAssignment[]>('/api/workouts/routines/my_assigned/')
      setAssignments(data)
    } catch (err) {
      console.error('Error fetching assignments', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  const levelColors: Record<string, string> = {
    beginner: 'bg-green-50 text-green-700 border-green-100',
    intermediate: 'bg-amber-50 text-amber-700 border-amber-100',
    advanced: 'bg-rose-50 text-rose-700 border-rose-100',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Rutinas</h1>
        <p className="text-slate-500 mt-2 text-lg">Rutinas asignadas para tu entrenamiento</p>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Sin rutinas asignadas</h3>
            <p className="text-slate-500 mt-1">Tu coach aún no te ha asignado rutinas de entrenamiento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const routine = assignment.routine_detail
            if (!routine) return null
            const isExpanded = expandedId === assignment.id
            const completedToday = routine.completed_today

            return (
              <Card key={assignment.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                    className="w-full flex items-center justify-between p-6 text-left"
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
                            {routine.level === 'beginner' ? 'Principiante' : routine.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
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
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLoggerRoutine(routine)
                        }}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Iniciar
                      </Button>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-3">
                      <p className="text-sm text-slate-600">{routine.objective}</p>
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

      {loggerRoutine && (
        <WorkoutLogger
          routine={loggerRoutine}
          open={true}
          onClose={() => setLoggerRoutine(null)}
          onComplete={fetchAssignments}
        />
      )}
    </div>
  )
}
