'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type RoutineExercise = {
  id: string
  order: number
  sets: number
  reps: number
  rest_seconds: number
  exercise: string
  exercise_detail?: {
    id: string
    name: string
    category?: string
  }
}

type Exercise = {
  id: string
  name: string
  category: string
  equipment: string
  muscle_group: string
  description: string
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
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('todas')
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, boolean>>({})
  const [completionStatus, setCompletionStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [completionMessage, setCompletionMessage] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [routineForm, setRoutineForm] = useState({
    name: '',
    objective: '',
    level: 'beginner',
    duration_minutes: 30,
    points_reward: 0,
    status: 'draft',
  })
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    category: 'strength',
    equipment: '',
    muscle_group: '',
    description: '',
  })
  const [addExerciseForm, setAddExerciseForm] = useState({
    routine: '',
    exercise: '',
    order: 1,
    sets: 3,
    reps: 10,
    rest_seconds: 60,
  })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPauseTimer = () => {
    setIsTimerRunning(!isTimerRunning)
  }

  const handleResetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
  }

  const fetchRoutines = useCallback(async () => {
    if (!token) return
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
  }, [token])

  const fetchExercises = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/workouts/exercises/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setExercises(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (error) {
      console.error(error)
    }
  }, [token])

  useEffect(() => {
    fetchRoutines()
    fetchExercises()
  }, [fetchRoutines, fetchExercises])

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
    setTimerSeconds(0)
    setIsTimerRunning(false)
  }

  const toggleExerciseProgress = (exerciseId: string) => {
    setExerciseProgress((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }))
  }

  const handleCreateRoutine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setFormSaving(true)
    setFormError('')
    try {
      const url = editingRoutine
        ? `${API_BASE_URL}/api/workouts/routines/${editingRoutine.id}/`
        : `${API_BASE_URL}/api/workouts/routines/`
      const method = editingRoutine ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: routineForm.name,
          objective: routineForm.objective,
          level: routineForm.level,
          duration_minutes: routineForm.duration_minutes,
          status: routineForm.status,
          points_reward: routineForm.points_reward,
        }),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos guardar la rutina.')
      }
      setShowCreateModal(false)
      setEditingRoutine(null)
      setRoutineForm({ name: '', objective: '', level: 'beginner', duration_minutes: 30, points_reward: 0, status: 'draft' })
      fetchRoutines()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine)
    setRoutineForm({
      name: routine.name,
      objective: routine.objective,
      level: routine.level,
      duration_minutes: routine.duration_minutes,
      points_reward: routine.points_reward || 0,
      status: routine.status,
    })
    setShowCreateModal(true)
    setFormError('')
  }

  const handleDeleteRoutine = async (routineId: string) => {
    if (!token) return
    if (!confirm('¿Estás seguro de eliminar esta rutina?')) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/workouts/routines/${routineId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos eliminar la rutina.')
      }
      fetchRoutines()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error al eliminar.')
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingRoutine(null)
    setRoutineForm({ name: '', objective: '', level: 'beginner', duration_minutes: 30, points_reward: 0, status: 'draft' })
    setFormError('')
  }

  const handleCreateExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setFormSaving(true)
    setFormError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/workouts/exercises/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exerciseForm),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos crear el ejercicio.')
      }
      setShowExerciseModal(false)
      setExerciseForm({ name: '', category: 'strength', equipment: '', muscle_group: '', description: '' })
      fetchExercises()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleAddExerciseToRoutine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setFormSaving(true)
    setFormError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/workouts/routine-exercises/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addExerciseForm),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos agregar el ejercicio a la rutina.')
      }
      setShowAddExerciseModal(false)
      setAddExerciseForm({ routine: '', exercise: '', order: 1, sets: 3, reps: 10, rest_seconds: 60 })
      fetchRoutines()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleOpenAddExercise = (routineId: string) => {
    setAddExerciseForm({ ...addExerciseForm, routine: routineId })
    setShowAddExerciseModal(true)
    setFormError('')
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

  const canManageRoutines = user?.role && ['super_admin', 'gym_admin', 'coach'].includes(user.role)

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-emerald-600">Rutinas</p>
                <h1 className="text-2xl font-semibold text-slate-900">Entrena con rutinas personalizadas</h1>
                <p className="text-sm text-slate-500">Accede al catálogo global de Lifefit y a los planes creados por tu gym.</p>
              </div>
              {canManageRoutines && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExerciseModal(true)}
                    className="rounded-2xl border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
                  >
                    + Crear ejercicio
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    + Agregar rutina
                  </button>
                </div>
              )}
            </div>
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
                Tu gym aún no ha publicado rutinas propias. Estás viendo las rutinas globales de Lifefit.
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
                            <p className="mt-1 text-xs font-semibold text-emerald-600">Rutina completada ✓</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-slate-400">
                            {routine.gym ? 'Plan de tu gym' : 'Plan global Lifefit'}
                          </span>
                          {canManageRoutines && (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditRoutine(routine)
                                }}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                title="Editar rutina"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteRoutine(routine.id)
                                }}
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                title="Eliminar rutina"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                        <span>⏱️ {routine.duration_minutes} min</span>
                        <span>💪 {exerciseCount} ejercicios</span>
                        {routine.points_reward ? <span>⭐ {routine.points_reward} pts</span> : null}
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
                      {canManageRoutines && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenAddExercise(routine.id)
                          }}
                          className="mt-2 w-full rounded-2xl border border-emerald-500 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
                        >
                          + Agregar ejercicio
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500">
                  {activeCategory === 'todas'
                    ? userGymId !== null
                      ? 'Aún no hay rutinas disponibles para tu cuenta.'
                      : 'Aún no hay rutinas globales disponibles.'
                    : 'No hay rutinas en esta categoría.'}
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
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-slate-600 dark:text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatTime(timerSeconds)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePlayPauseTimer}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                      title={isTimerRunning ? 'Pausar' : 'Iniciar'}
                    >
                      {isTimerRunning ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={handleResetTimer}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      title="Reiniciar"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
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
                            completed
                              ? 'border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30'
                              : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800/50'
                          }`}
                        >
                          <div>
                            <p className={`font-semibold ${completed ? 'text-emerald-800 dark:text-emerald-300' : 'dark:text-slate-100'}`}>
                              {exercise.exercise_detail?.name ?? 'Ejercicio'}
                            </p>
                            <p className={`text-xs ${completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {exercise.sets} series x {exercise.reps} repeticiones · Descanso {exercise.rest_seconds} seg
                            </p>
                          </div>
                          <div className="shrink-0">
                            {completed ? (
                              <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg className="h-6 w-6 text-slate-400 dark:text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  {!selectedRoutine.routine_exercises?.length && (
                    <p className="text-sm text-slate-500">Aún no se han agregado ejercicios a esta rutina.</p>
                  )}
                </div>
                {isRoutineCompleted && (
                  <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-100 p-4 text-center dark:border-emerald-700 dark:bg-emerald-900/30">
                    {completionStatus === 'success' ? (
                      <>
                        <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">Rutina completada</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                          {completionMessage ||
                            (selectedRoutine.points_reward
                              ? `Has ganado ${selectedRoutine.points_reward} puntos.`
                              : 'Rutina registrada.')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300">
                          {selectedRoutine.completed_by_me
                            ? 'Ya registraste esta rutina. Si la repetiste hoy, vuelve a registrarla para sumar de nuevo.'
                            : selectedRoutine.points_reward && selectedRoutine.points_reward > 0
                              ? `Marca como completada para ganar ${selectedRoutine.points_reward} puntos.`
                              : 'Marca como completada para registrar tu progreso.'}
                        </p>
                        <button
                          onClick={handleRegisterCompletion}
                          disabled={completionStatus === 'saving'}
                          className="mt-3 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-700"
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
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">{editingRoutine ? 'Editar rutina' : 'Nueva rutina'}</p>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {editingRoutine ? 'Modifica los datos de la rutina' : 'Crea una nueva rutina'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cerrar ✕
                  </button>
                </div>
                <form onSubmit={handleCreateRoutine} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                      type="text"
                      required
                      value={routineForm.name}
                      onChange={(e) => setRoutineForm({ ...routineForm, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Ej: Rutina de fuerza completa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Objetivo</label>
                    <textarea
                      required
                      value={routineForm.objective}
                      onChange={(e) => setRoutineForm({ ...routineForm, objective: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Ej: Mejorar fuerza y resistencia muscular"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Nivel</label>
                      <select
                        value={routineForm.level}
                        onChange={(e) => setRoutineForm({ ...routineForm, level: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Estado</label>
                      <select
                        value={routineForm.status}
                        onChange={(e) => setRoutineForm({ ...routineForm, status: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="draft">Borrador</option>
                        <option value="published">Publicada</option>
                        <option value="archived">Archivada</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Duración (min)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={routineForm.duration_minutes}
                        onChange={(e) => setRoutineForm({ ...routineForm, duration_minutes: parseInt(e.target.value) || 0 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Puntos</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={routineForm.points_reward}
                        onChange={(e) => setRoutineForm({ ...routineForm, points_reward: parseInt(e.target.value) || 0 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {formError && (
                    <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 rounded-2xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {formSaving ? 'Guardando...' : editingRoutine ? 'Guardar cambios' : 'Crear rutina'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {showExerciseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">Nuevo ejercicio</p>
                    <h3 className="text-xl font-semibold text-slate-900">Crea un nuevo ejercicio</h3>
                  </div>
                  <button
                    onClick={() => setShowExerciseModal(false)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cerrar ✕
                  </button>
                </div>
                <form onSubmit={handleCreateExercise} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                      type="text"
                      required
                      value={exerciseForm.name}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Ej: Press de banca"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Categoría</label>
                      <select
                        value={exerciseForm.category}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="strength">Fuerza</option>
                        <option value="cardio">Cardio</option>
                        <option value="mobility">Movilidad</option>
                        <option value="flexibility">Flexibilidad</option>
                        <option value="hiit">HIIT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Grupo muscular</label>
                      <input
                        type="text"
                        value={exerciseForm.muscle_group}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, muscle_group: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="Ej: Pecho"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Equipo</label>
                    <input
                      type="text"
                      value={exerciseForm.equipment}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, equipment: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Ej: Barra, Mancuernas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Descripción</label>
                    <textarea
                      value={exerciseForm.description}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Describe el ejercicio..."
                      rows={3}
                    />
                  </div>
                  {formError && (
                    <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowExerciseModal(false)}
                      className="flex-1 rounded-2xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {formSaving ? 'Guardando...' : 'Crear ejercicio'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {showAddExerciseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">Agregar ejercicio</p>
                    <h3 className="text-xl font-semibold text-slate-900">Añade un ejercicio a la rutina</h3>
                  </div>
                  <button
                    onClick={() => setShowAddExerciseModal(false)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cerrar ✕
                  </button>
                </div>
                <form onSubmit={handleAddExerciseToRoutine} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ejercicio</label>
                    <select
                      required
                      value={addExerciseForm.exercise}
                      onChange={(e) => setAddExerciseForm({ ...addExerciseForm, exercise: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">Selecciona un ejercicio</option>
                      {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Orden</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={addExerciseForm.order}
                        onChange={(e) => setAddExerciseForm({ ...addExerciseForm, order: parseInt(e.target.value) || 1 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Series</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={addExerciseForm.sets}
                        onChange={(e) => setAddExerciseForm({ ...addExerciseForm, sets: parseInt(e.target.value) || 3 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Repeticiones</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={addExerciseForm.reps}
                        onChange={(e) => setAddExerciseForm({ ...addExerciseForm, reps: parseInt(e.target.value) || 10 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Descanso (seg)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={addExerciseForm.rest_seconds}
                        onChange={(e) => setAddExerciseForm({ ...addExerciseForm, rest_seconds: parseInt(e.target.value) || 60 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {formError && (
                    <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddExerciseModal(false)}
                      className="flex-1 rounded-2xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {formSaving ? 'Guardando...' : 'Agregar ejercicio'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      </DashboardPage>
  )
}


