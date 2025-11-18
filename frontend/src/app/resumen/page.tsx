'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type WorkoutRoutine = {
  id: string
  name: string
  objective: string
  level: string
  duration_minutes: number
  routine_exercises?: Array<{
    id: string
    order: number
    exercise_detail?: { name: string }
    sets: number
    reps: number
  }>
}

type WorkoutSession = {
  id: string
  performed_at: string
  completion_percentage: number
  duration_minutes: number
  status: string
  routine?: string
  points_awarded?: number
}

export default function ResumenPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const [routinesResponse, sessionsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/workouts/routines/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/workouts/sessions/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (routinesResponse.ok) {
          const routinesJson = await routinesResponse.json()
          const normalizedRoutines = Array.isArray(routinesJson) ? routinesJson : routinesJson.results ?? []
          setRoutines(normalizedRoutines)
        }
        if (sessionsResponse.ok) {
          const sessionsJson = await sessionsResponse.json()
          const normalizedSessions = Array.isArray(sessionsJson) ? sessionsJson : sessionsJson.results ?? []
          setSessions(normalizedSessions)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  if (!user) {
    return <DashboardPage user={user} active="/resumen" loading loadingLabel="Sincronizando tu cuenta..." />
  }

  const loadingState = authLoading || loading

  const quickStats = [
    { label: 'Nivel', value: user.nivel },
    { label: 'Puntos', value: user.puntos },
    { label: 'Rol', value: user.role.replace('_', ' ') },
  ]

  const nextRoutine = routines[0]
  const latestSessions = sessions.slice(0, 3)

  return (
    <DashboardPage user={user} active="/resumen" loading={loadingState} loadingLabel="Sincronizando tu cuenta...">
        <>
          <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-emerald-600">Hola de nuevo</p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {user.first_name}, tu progreso esta en marcha
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">Manten tu racha de entrenamiento y desbloquea nuevas insignias.</p>
              </div>
              <div className="flex gap-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-slate-100 px-4 py-3 text-center dark:bg-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Proxima rutina recomendada</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">{nextRoutine ? nextRoutine.duration_minutes + ' min' : 'Pendiente'}</span>
              </div>
              {nextRoutine ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{nextRoutine.objective}</p>
                  <ul className="space-y-2">
                    {nextRoutine.routine_exercises?.map((step) => (
                      <li key={step.id} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        #{step.order} {step.exercise_detail?.name} - {step.sets}x{step.reps}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Todavia no hay rutinas disponibles para ti.</p>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ultimas sesiones registradas</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">{latestSessions.length} sesiones</span>
              </div>
              <ul className="mt-4 space-y-3">
                {latestSessions.length ? (
                  latestSessions.map((session) => (
                    <li key={session.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm transition-colors dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white">{new Date(session.performed_at).toLocaleString()}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Completado: {session.completion_percentage}% - {session.duration_minutes} min - {session.status}
                        {session.points_awarded ? ` - ${session.points_awarded} pts` : ''}
                      </p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Registra tu primera sesion desde el panel de rutinas.</p>
                )}
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Estado general</h2>
              <span className="text-xs text-slate-500 dark:text-slate-300">Actualizado al dia de hoy</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                <p className="text-xs uppercase text-slate-400 dark:text-slate-500">Rutinas activas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{routines.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Disponibles para ti</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                <p className="text-xs uppercase text-slate-400 dark:text-slate-500">Sesiones registradas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{sessions.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Historial reciente</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                <p className="text-xs uppercase text-slate-400 dark:text-slate-500">Proxima accion</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {nextRoutine ? `Completar ${nextRoutine.name}` : 'Explora las rutinas disponibles'}
                </p>
              </div>
            </div>
          </section>
        </>
    </DashboardPage>
  )
}
