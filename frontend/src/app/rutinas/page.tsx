'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type RoutineExercise = {
  id: string
  order: number
  sets: number
  reps: number
  rest_seconds: number
  exercise_detail?: {
    name: string
    category?: string
  }
}

type Routine = {
  id: string
  gym: string | number | null
  name: string
  objective: string
  level: string
  status: string
  duration_minutes: number
  completed_by_me?: boolean
  points_reward?: number
  routine_exercises?: RoutineExercise[]
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  mobility: 'Movilidad',
  flexibility: 'Flexibilidad',
  hiit: 'HIIT',
}

export default function RutinasPage() {
  const { user, token, loading: authLoading, setUser } = useDashboardAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('todas')
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, boolean>>({})
  const [completionStatus, setCompletionStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [completionMessage, setCompletionMessage] = useState('')

  useEffect(() => {
    if (!token) return
    const fetchRoutines = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/workouts/routines/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setRoutines(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoutines()
  }, [token])

  const handleOpenRoutine = (routine: Routine) => {
    setSelectedRoutine(routine)
    setCompletionStatus('idle')
    setCompletionMessage(routine.completed_by_me ? 'Ya registraste esta rutina anteriormente.' : '')
    const initial: Record<string, boolean> = {}
    routine.routine_exercises
      ?.sort((a, b) => a.order - b.order)
      .forEach((exercise) => {
        initial[exercise.id] = false
      })
    setExerciseProgress(initial)
  }

  const handleCloseRoutine = () => {
    setSelectedRoutine(null)
    setExerciseProgress({})
    setCompletionStatus('idle')
    setCompletionMessage('')
  }

  const toggleExerciseProgress = (exerciseId: string) => {
    setExerciseProgress((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }))
  }

  const userGymId = user?.gym === null || user?.gym === undefined || user?.gym === '' ? null : user?.gym

  const categories = useMemo(() => {
    const catSet = new Set<string>()
    routines.forEach((routine) =>
      routine.routine_exercises?.forEach((block) => {
        if (block.exercise_detail?.category) {
          catSet.add(block.exercise_detail.category)
        }
      }),
    )
    return ['todas', ...Array.from(catSet)]
  }, [routines])

  const filteredRoutines = useMemo(() => {
    if (activeCategory === 'todas') return routines
    return routines.filter((routine) =>
      routine.routine_exercises?.some((block) => block.exercise_detail?.category === activeCategory),
    )
  }, [activeCategory, routines])

  if (!user) {
    return <DashboardPage user={user} active="/rutinas" loading loadingLabel="Cargando rutinas..." />
  }

  const loadingState = authLoading || loading

  const hasGymSpecificRoutines =
    userGymId !== null && routines.some((routine) => routine.gym !== null && String(routine.gym) === String(userGymId))
  const showGymEmptyMessage = userGymId !== null && !hasGymSpecificRoutines && routines.length > 0

  const renderBadge = (label: string, colorClass: string, key?: string) => (
    <span key={key ?? label} className={`rounded-full px-3 py-0.5 text-xs font-semibold text-white ${colorClass}`}>
      {label}
    </span>
  )

  const totalExercises = selectedRoutine?.routine_exercises?.length ?? 0
  const completedExercises = Object.values(exerciseProgress).filter(Boolean).length
  const isRoutineCompleted =
    !!selectedRoutine &&
    (selectedRoutine.completed_by_me ||
      (totalExercises > 0 && completedExercises === totalExercises && totalExercises === Object.keys(exerciseProgress).length))

  const handleRegisterCompletion = async () => {
    if (!selectedRoutine || !token || completionStatus === 'saving' || completionStatus === 'success') return
    setCompletionStatus('saving')
    setCompletionMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/workouts/sessions/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routine: selectedRoutine.id,
          performed_at: new Date().toISOString(),
          duration_minutes: selectedRoutine.duration_minutes,
          completion_percentage: 100,
          status: 'completed',
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'No pudimos registrar la rutina.')
      }
      const reward = selectedRoutine.points_reward ?? 0
      setCompletionStatus('success')
      setCompletionMessage(
        reward > 0
          ? `Has ganado ${reward} puntos. Buen trabajo!`
          : 'Rutina registrada en tu historial. Sigue asi!',
      )
      if (reward > 0 && setUser) {
        setUser((prev) => {
          if (!prev) return prev
          const updated = { ...prev, puntos: prev.puntos + reward }
          localStorage.setItem('lifefit_user', JSON.stringify(updated))
          return updated
        })
      }
      setRoutines((prev) =>
        prev.map((routine) => (routine.id === selectedRoutine.id ? { ...routine, completed_by_me: true } : routine)),
      )
      setSelectedRoutine((prev) => (prev ? { ...prev, completed_by_me: true } : prev))
    } catch (error) {
      setCompletionStatus('error')
      setCompletionMessage(error instanceof Error ? error.message : 'No pudimos registrar la rutina.')
    }
  }

  return (
    <DashboardPage user={user} active="/rutinas" loading={loadingState} loadingLabel="Cargando rutinas...">
        <>
          <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <p className="text-xs uppercase text-emerald-600">Rutinas</p>
            <h1 className="text-2xl font-semibold text-slate-900">Entrena con rutinas personalizadas</h1>
            <p className="text-sm text-slate-500">Accede al catÃ¡logo global de Lifefit y a los planes creados por tu gym.</p>
          </header>

          <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              {categories.map((category) => {
                const label = category === 'todas' ? 'Todas' : CATEGORY_LABELS[category] ?? category
                const isActive = activeCategory === category
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition ${
                      isActive ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {showGymEmptyMessage && (
              <p className="mb-4 text-xs text-slate-400">
                Tu gym aÃºn no ha publicado rutinas propias. EstÃ¡s viendo las rutinas globales de Lifefit.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {filteredRoutines.length ? (
                filteredRoutines.map((routine) => {
                  const exerciseCount = routine.routine_exercises?.length ?? 0
                  const levelLabel = LEVEL_LABELS[routine.level] ?? routine.level
                  const routineCategories = Array.from(
                    new Set(
                      routine.routine_exercises
                        ?.map((block) => block.exercise_detail?.category)
                        .filter(Boolean) as string[],
                    ),
                  )
                  return (
                    <div key={routine.id} className="flex flex-col rounded-3xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{routine.name}</p>
                          <p className="text-sm text-slate-500">{routine.objective}</p>
                          {routine.completed_by_me && (
                            <p className="mt-1 text-xs font-semibold text-emerald-600">Rutina completada ??</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {routine.gym ? 'Plan de tu gym' : 'Plan global Lifefit'}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                        <span>?? {routine.duration_minutes} min</span>
                        <span>???? {exerciseCount} ejercicios</span>
                        {routine.points_reward ? <span>? {routine.points_reward} pts</span> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {renderBadge(levelLabel, 'bg-amber-500', `${routine.id}-level`)}
                        {routineCategories.length === 0 && renderBadge('General', 'bg-slate-400', `${routine.id}-general`)}
                        {routineCategories.map((category) => {
                          const colors: Record<string, string> = {
                            strength: 'bg-purple-500',
                            cardio: 'bg-sky-500',
                            mobility: 'bg-emerald-500',
                            flexibility: 'bg-pink-500',
                            hiit: 'bg-orange-500',
                          }
                          return renderBadge(
                            CATEGORY_LABELS[category] ?? category,
                            colors[category] ?? 'bg-slate-400',
                            `${routine.id}-${category}`,
                          )
                        })}
                      </div>
                      <button
                        onClick={() => handleOpenRoutine(routine)}
                        className={`mt-4 w-full rounded-2xl py-2 text-sm font-semibold text-white transition ${
                          routine.completed_by_me ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
                        }`}
                      >
                        {routine.completed_by_me ? 'Ver rutina (completada)' : 'Iniciar'}
                      </button>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500">
                  {activeCategory === 'todas'
                    ? userGymId !== null
                      ? 'AÃºn no hay rutinas disponibles para tu cuenta.'
                      : 'AÃºn no hay rutinas globales disponibles.'
                    : 'No hay rutinas en esta categorÃ­a.'}
                </p>
              )}
            </div>
          </section>
          {selectedRoutine && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">Rutina en curso</p>
                    <h3 className="text-xl font-semibold text-slate-900">{selectedRoutine.name}</h3>
                    <p className="text-sm text-slate-500">{selectedRoutine.objective}</p>
                    {selectedRoutine.points_reward ? (
                      <p className="text-xs font-semibold text-emerald-600">Valor: {selectedRoutine.points_reward} pts</p>
                    ) : null}
                  </div>
                  <button
                    onClick={handleCloseRoutine}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cerrar ?
                  </button>
                </div>
                <div className="mt-4">
                  {(() => {
                    const total = totalExercises
                    const completed = completedExercises
                    const percentage = total ? Math.round((completed / total) * 100) : 0
                    return (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Progreso</span>
                          <span>
                            {completed}/{total}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>
                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-100 px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>??</span>
                    <span>00:00</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button className="rounded-full border border-slate-200 px-3 py-1">??</button>
                    <button className="rounded-full border border-slate-200 px-3 py-1">??</button>
                    <button className="rounded-full border border-slate-200 px-3 py-1">??</button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedRoutine.routine_exercises
                    ?.sort((a, b) => a.order - b.order)
                    .map((exercise) => {
                      const completed = exerciseProgress[exercise.id]
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => toggleExerciseProgress(exercise.id)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            completed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{exercise.exercise_detail?.name ?? 'Ejercicio'}</p>
                            <p className="text-xs text-slate-500">
                              {exercise.sets} series x {exercise.reps} repeticiones · Descanso {exercise.rest_seconds} seg
                            </p>
                          </div>
                          <span className="text-lg">{completed ? '??' : '?'}</span>
                        </button>
                      )
                    })}
                  {!selectedRoutine.routine_exercises?.length && (
                    <p className="text-sm text-slate-500">Aún no se han agregado ejercicios a esta rutina.</p>
                  )}
                </div>
                {isRoutineCompleted && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    {completionStatus === 'success' ? (
                      <>
                        <p className="text-base font-semibold text-emerald-700">Rutina completada</p>
                        <p className="text-sm text-emerald-700">
                          {completionMessage ||
                            (selectedRoutine.points_reward
                              ? `Has ganado ${selectedRoutine.points_reward} puntos.`
                              : 'Rutina registrada.')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-emerald-700">
                          {selectedRoutine.completed_by_me
                            ? 'Ya registraste esta rutina. Si la repetiste hoy, vuelve a registrarla para sumar de nuevo.'
                            : selectedRoutine.points_reward && selectedRoutine.points_reward > 0
                              ? `Marca como completada para ganar ${selectedRoutine.points_reward} puntos.`
                              : 'Marca como completada para registrar tu progreso.'}
                        </p>
                        <button
                          onClick={handleRegisterCompletion}
                          disabled={completionStatus === 'saving'}
                          className="mt-3 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                        >
                          {completionStatus === 'saving'
                            ? 'Guardando...'
                            : selectedRoutine.completed_by_me
                              ? 'Registrar nuevamente'
                              : 'Registrar rutina completada'}
                        </button>
                        {completionStatus === 'error' && (
                          <p className="mt-2 text-xs text-red-600">{completionMessage}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      </DashboardPage>
  )
}


