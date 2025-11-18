'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Gym = {
  id: string
  name: string
  slug: string
  location: string
  status: string
  brand_color: string
  website?: string
  contact_email?: string
}

type Routine = {
  id: string
  name: string
  status: string
  level: string
  gym: string
  points_reward?: number
}

type Exercise = {
  id: string
  name: string
  category: string
  muscle_group: string
  gym: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [gyms, setGyms] = useState<Gym[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [gymForm, setGymForm] = useState({
    name: '',
    slug: '',
    description: '',
    location: '',
    brand_color: '#10b981',
    website: '',
    contact_email: '',
  })

  const [branchForm, setBranchForm] = useState({
    gym: '',
    name: '',
    slug: '',
    address: '',
    city: '',
  })

  const [exerciseForm, setExerciseForm] = useState({
    gym: '',
    name: '',
    category: 'strength',
    equipment: '',
    muscle_group: '',
  })

  const [routineForm, setRoutineForm] = useState({
    gym: '',
    name: '',
    objective: '',
    level: 'beginner',
    duration_minutes: 30,
    status: 'published',
    points_reward: 0,
  })

  const [routineExerciseForm, setRoutineExerciseForm] = useState({
    routine: '',
    exercise: '',
    order: 1,
    sets: 3,
    reps: 10,
    rest_seconds: 60,
  })
  const [challengeForm, setChallengeForm] = useState({
    gym: '',
    name: '',
    description: '',
    type: 'workouts',
    start_date: '',
    end_date: '',
    reward_points: 100,
    goal_value: 10,
    status: 'active',
  })
  const [nutritionPlanForm, setNutritionPlanForm] = useState({
    gym: '',
    name: '',
    description: '',
    calories_per_day: 2000,
    status: 'active',
  })
  const [subscriptionPlanForm, setSubscriptionPlanForm] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    billing_cycle: 'monthly',
  })

  const baseFieldClass =
    'w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    if (!token) return undefined
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [token])

  useEffect(() => {
    if (authLoading) return
    if (!user) return
    if (user.role !== 'super_admin') {
      router.replace('/resumen')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!token || user?.role !== 'super_admin') return
    const fetchData = async () => {
      try {
        setLoading(true)
        const [gymsRes, exercisesRes, routinesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/gyms/gyms/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/workouts/exercises/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/workouts/routines/`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (!gymsRes.ok || !exercisesRes.ok || !routinesRes.ok) {
          throw new Error('Error obteniendo datos iniciales.')
        }
        const gymsJson = await gymsRes.json()
        const normalizedGyms = Array.isArray(gymsJson) ? gymsJson : gymsJson.results ?? []
        setGyms(normalizedGyms)

        const exercisesJson = await exercisesRes.json()
        setExercises(Array.isArray(exercisesJson) ? exercisesJson : exercisesJson.results ?? [])

        const routinesJson = await routinesRes.json()
        setRoutines(Array.isArray(routinesJson) ? routinesJson : routinesJson.results ?? [])
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando dashboard admin.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token, user?.role])

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>, url: string, payload: unknown, reset: () => void) => {
    event.preventDefault()
    try {
      setError('')
      const response = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'No fue posible guardar la información.')
      }
      reset()
      if (url.includes('/api/gyms/gyms/')) {
        setGyms((prev) => [...prev, data])
      }
      if (url.includes('/api/gyms/branches/')) {
        // refresh gyms to reflect branch count (or ignore)
      }
      if (url.includes('/api/workouts/exercises/')) {
        setExercises((prev) => [...prev, data])
      }
      if (url.includes('/api/workouts/routines/')) {
        setRoutines((prev) => [...prev, data])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando datos.')
    }
  }

  if (authLoading || !user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Cargando panel administrativo...</p>
        </div>
      </div>
    )
  }

  if (user.role !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Redirigiendo a tu panel personal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active="/admin" />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 text-center shadow-lg">
            <p className="text-xs uppercase text-emerald-600 tracking-widest">Panel administrativo</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Configura gimnasios, sucursales y rutinas</h1>
            <p className="mt-1 text-sm text-slate-500">Los cambios impactan en lo que ven los atletas dentro de Lifefit.</p>
          </header>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading && (
            <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow">
              Cargando datos iniciales...
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Crear gimnasio</h2>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) =>
                  handleFormSubmit(event, `${API_BASE_URL}/api/gyms/gyms/`, gymForm, () =>
                    setGymForm({
                      name: '',
                      slug: '',
                      description: '',
                      location: '',
                      brand_color: '#10b981',
                      website: '',
                      contact_email: '',
                    }),
                  )
                }
              >
              {[
                { id: 'name', label: 'Nombre' },
                { id: 'slug', label: 'Slug' },
                { id: 'description', label: 'Descripción' },
                { id: 'location', label: 'Ubicación' },
                { id: 'website', label: 'Sitio web' },
                { id: 'contact_email', label: 'Email de contacto' },
              ].map((field) => (
                <div key={field.id}>
                  <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                  <input
                    type="text"
                    value={(gymForm as Record<string, string>)[field.id]}
                    required={field.id === 'name' || field.id === 'slug'}
                    className={`mt-1 ${baseFieldClass}`}
                    onChange={(event) =>
                      setGymForm((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <input
                type="color"
                value={gymForm.brand_color}
                onChange={(event) => setGymForm((prev) => ({ ...prev, brand_color: event.target.value }))}
                className="h-10 w-full rounded-2xl border border-slate-200"
              />
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar gimnasio
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Crear sucursal</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                handleFormSubmit(event, `${API_BASE_URL}/api/gyms/branches/`, branchForm, () =>
                  setBranchForm({ gym: '', name: '', slug: '', address: '', city: '' }),
                )
              }
            >
              <select
                required
                value={branchForm.gym}
                onChange={(event) => setBranchForm((prev) => ({ ...prev, gym: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="">Selecciona un gimnasio</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
              {[
                { id: 'name', label: 'Nombre' },
                { id: 'slug', label: 'Slug' },
                { id: 'address', label: 'Dirección' },
                { id: 'city', label: 'Ciudad' },
              ].map((field) => (
                <div key={field.id}>
                  <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                  <input
                    type="text"
                    required
                    value={(branchForm as Record<string, string>)[field.id]}
                    className={`mt-1 ${baseFieldClass}`}
                    onChange={(event) =>
                      setBranchForm((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar sucursal
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Crear ejercicio</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                handleFormSubmit(
                  event,
                  `${API_BASE_URL}/api/workouts/exercises/`,
                  { ...exerciseForm, gym: exerciseForm.gym || null },
                  () => setExerciseForm({ gym: '', name: '', category: 'strength', equipment: '', muscle_group: '' }),
                )
              }
            >
              <select
                value={exerciseForm.gym}
                onChange={(event) => setExerciseForm((prev) => ({ ...prev, gym: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="">Contenido global (sin gym)</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <div>
                <label className="text-xs font-semibold text-slate-600">Nombre</label>
                <input
                  type="text"
                  required
                  value={exerciseForm.name}
                  onChange={(event) => setExerciseForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <select
                value={exerciseForm.category}
                onChange={(event) => setExerciseForm((prev) => ({ ...prev, category: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="strength">Fuerza</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Movilidad</option>
                <option value="flexibility">Flexibilidad</option>
                <option value="hiit">HIIT</option>
              </select>
              <div>
                <label className="text-xs font-semibold text-slate-600">Equipo</label>
                <input
                  type="text"
                  value={exerciseForm.equipment}
                  onChange={(event) => setExerciseForm((prev) => ({ ...prev, equipment: event.target.value }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Grupo muscular</label>
                <input
                  type="text"
                  value={exerciseForm.muscle_group}
                  onChange={(event) => setExerciseForm((prev) => ({ ...prev, muscle_group: event.target.value }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar ejercicio
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Crear rutina</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                handleFormSubmit(
                  event,
                  `${API_BASE_URL}/api/workouts/routines/`,
                  { ...routineForm, gym: routineForm.gym || null },
                  () =>
                    setRoutineForm({
                      gym: '',
                      name: '',
                      objective: '',
                      level: 'beginner',
                      duration_minutes: 30,
                      status: 'published',
                      points_reward: 0,
                    }),
                )
              }
            >
              <select
                value={routineForm.gym}
                onChange={(event) => setRoutineForm((prev) => ({ ...prev, gym: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="">Contenido global (sin gym)</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <div>
                <label className="text-xs font-semibold text-slate-600">Nombre</label>
                <input
                  type="text"
                  required
                  value={routineForm.name}
                  onChange={(event) => setRoutineForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Objetivo</label>
                <textarea
                  value={routineForm.objective}
                  onChange={(event) => setRoutineForm((prev) => ({ ...prev, objective: event.target.value }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={routineForm.level}
                  onChange={(event) => setRoutineForm((prev) => ({ ...prev, level: event.target.value }))}
                  className={`flex-1 ${baseFieldClass}`}
                >
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
                <select
                  value={routineForm.status}
                  onChange={(event) => setRoutineForm((prev) => ({ ...prev, status: event.target.value }))}
                  className={`flex-1 ${baseFieldClass}`}
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Duración (minutos)</label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={routineForm.duration_minutes}
                  onChange={(event) => setRoutineForm((prev) => ({ ...prev, duration_minutes: Number(event.target.value) }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Puntos por completar</label>
                <input
                  type="number"
                  min={0}
                  value={routineForm.points_reward}
                  onChange={(event) => setRoutineForm((prev) => ({ ...prev, points_reward: Number(event.target.value) }))}
                  className={`mt-1 ${baseFieldClass}`}
                />
              </div>
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar rutina
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900">Agregar ejercicio a rutina</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={(event) =>
              handleFormSubmit(event, `${API_BASE_URL}/api/workouts/routine-exercises/`, routineExerciseForm, () =>
                setRoutineExerciseForm({ routine: '', exercise: '', order: 1, sets: 3, reps: 10, rest_seconds: 60 }),
              )
            }
          >
            <select
              required
              value={routineExerciseForm.routine}
              onChange={(event) => setRoutineExerciseForm((prev) => ({ ...prev, routine: event.target.value }))}
              className={baseFieldClass}
            >
              <option value="">Selecciona rutina</option>
              {routines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.name}
                </option>
              ))}
            </select>
            <select
              required
              value={routineExerciseForm.exercise}
              onChange={(event) => setRoutineExerciseForm((prev) => ({ ...prev, exercise: event.target.value }))}
              className={baseFieldClass}
            >
              <option value="">Selecciona ejercicio</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <div>
              <label className="text-xs font-semibold text-slate-600">Orden en la rutina</label>
              <input
                type="number"
                min={1}
                placeholder="1"
                value={routineExerciseForm.order}
                onChange={(event) => setRoutineExerciseForm((prev) => ({ ...prev, order: Number(event.target.value) }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Sets</label>
              <input
                type="number"
                min={1}
                placeholder="3"
                value={routineExerciseForm.sets}
                onChange={(event) => setRoutineExerciseForm((prev) => ({ ...prev, sets: Number(event.target.value) }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Repeticiones por set</label>
              <input
                type="number"
                min={1}
                placeholder="10"
                value={routineExerciseForm.reps}
                onChange={(event) => setRoutineExerciseForm((prev) => ({ ...prev, reps: Number(event.target.value) }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Descanso (segundos)</label>
              <input
                type="number"
                min={15}
                placeholder="60"
                value={routineExerciseForm.rest_seconds}
                onChange={(event) =>
                  setRoutineExerciseForm((prev) => ({ ...prev, rest_seconds: Number(event.target.value) }))
                }
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <button type="submit" className="md:col-span-2 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
              Añadir a rutina
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900">Crear reto</h2>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={(event) =>
              handleFormSubmit(
                event,
                `${API_BASE_URL}/api/challenges/challenges/`,
                { ...challengeForm, gym: challengeForm.gym || null },
                () =>
                  setChallengeForm({
                    gym: '',
                    name: '',
                    description: '',
                    type: 'workouts',
                    start_date: '',
                    end_date: '',
                    reward_points: 100,
                    goal_value: 10,
                    status: 'active',
                  }),
              )
            }
          >
            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
              <select
                value={challengeForm.gym}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, gym: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="">Contenido global (sin gym)</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <select
                value={challengeForm.type}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, type: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="attendance">Asistencia</option>
                <option value="distance">Distancia</option>
                <option value="workouts">Entrenamientos</option>
                <option value="nutrition">Nutrición</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Nombre</label>
              <input
                type="text"
                required
                value={challengeForm.name}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, name: event.target.value }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Descripción</label>
              <textarea
                value={challengeForm.description}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, description: event.target.value }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Fecha inicio</label>
              <input
                type="date"
                required
                value={challengeForm.start_date}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, start_date: event.target.value }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Fecha fin</label>
              <input
                type="date"
                required
                value={challengeForm.end_date}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, end_date: event.target.value }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Puntos</label>
              <input
                type="number"
                min={10}
                value={challengeForm.reward_points}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, reward_points: Number(event.target.value) }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Meta</label>
              <input
                type="number"
                min={1}
                value={challengeForm.goal_value}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, goal_value: Number(event.target.value) }))}
                className={`mt-1 ${baseFieldClass}`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Estado</label>
              <select
                value={challengeForm.status}
                onChange={(event) => setChallengeForm((prev) => ({ ...prev, status: event.target.value }))}
                className={`mt-1 ${baseFieldClass}`}
              >
                <option value="active">Activo</option>
                <option value="draft">Borrador</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar reto
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Crear plan de nutrición</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                handleFormSubmit(
                  event,
                  `${API_BASE_URL}/api/nutrition/plans/`,
                  { ...nutritionPlanForm, gym: nutritionPlanForm.gym || null },
                  () =>
                    setNutritionPlanForm({ gym: '', name: '', description: '', calories_per_day: 2000, status: 'active' }),
                )
              }
            >
              <select
                value={nutritionPlanForm.gym}
                onChange={(event) => setNutritionPlanForm((prev) => ({ ...prev, gym: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="">Contenido global (sin gym)</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nombre"
                required
                value={nutritionPlanForm.name}
                onChange={(event) => setNutritionPlanForm((prev) => ({ ...prev, name: event.target.value }))}
                className={baseFieldClass}
              />
              <textarea
                placeholder="Descripción"
                value={nutritionPlanForm.description}
                onChange={(event) => setNutritionPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                className={baseFieldClass}
              />
              <input
                type="number"
                min={1000}
                max={4000}
                placeholder="Calorías/día"
                value={nutritionPlanForm.calories_per_day}
                onChange={(event) => setNutritionPlanForm((prev) => ({ ...prev, calories_per_day: Number(event.target.value) }))}
                className={baseFieldClass}
              />
              <select
                value={nutritionPlanForm.status}
                onChange={(event) => setNutritionPlanForm((prev) => ({ ...prev, status: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="active">Activo</option>
                <option value="draft">Borrador</option>
                <option value="archived">Archivado</option>
              </select>
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar plan
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Crear plan de suscripción</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                handleFormSubmit(event, `${API_BASE_URL}/api/subscriptions/plans/`, subscriptionPlanForm, () =>
                  setSubscriptionPlanForm({ name: '', price: 0, currency: 'USD', billing_cycle: 'monthly', description: '' }),
                )
              }
            >
              <input
                type="text"
                placeholder="Nombre"
                required
                value={subscriptionPlanForm.name}
                onChange={(event) => setSubscriptionPlanForm((prev) => ({ ...prev, name: event.target.value }))}
                className={baseFieldClass}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="Precio"
                value={subscriptionPlanForm.price}
                onChange={(event) => setSubscriptionPlanForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                className={baseFieldClass}
              />
              <select
                value={subscriptionPlanForm.billing_cycle}
                onChange={(event) => setSubscriptionPlanForm((prev) => ({ ...prev, billing_cycle: event.target.value }))}
                className={baseFieldClass}
              >
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
                <option value="custom">Personalizado</option>
              </select>
              <textarea
                placeholder="Descripción"
                value={subscriptionPlanForm.description}
                onChange={(event) => setSubscriptionPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                className={baseFieldClass}
              />
              <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white">
                Guardar plan de suscripción
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  </div>
  )
}
