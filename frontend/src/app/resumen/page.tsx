'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
            Lf
          </div>
          <p className="text-lg font-semibold text-slate-900">Sincronizando tu cuenta</p>
          <p className="mt-2 text-sm text-slate-500">Obteniendo tu progreso y tus métricas...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const quickStats = [
    { label: 'Nivel', value: user.nivel },
    { label: 'Puntos', value: user.puntos },
    { label: 'Rol', value: user.role.replace('_', ' ') },
  ]

  const nextRoutine = routines[0]
  const latestSessions = sessions.slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active="/resumen" />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-emerald-600">Hola de nuevo</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {user.first_name}, tu progreso está en marcha
                </h1>
                <p className="text-sm text-slate-500">Mantén tu racha de entrenamiento y desbloquea nuevas insignias.</p>
              </div>
              <div className="flex gap-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Próxima rutina recomendada</h2>
                <span className="text-xs text-slate-500">{nextRoutine ? nextRoutine.duration_minutes + ' min' : 'Pendiente'}</span>
              </div>
              {nextRoutine ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-600">{nextRoutine.objective}</p>
                  <ul className="space-y-2">
                    {nextRoutine.routine_exercises?.map((step) => (
                      <li key={step.id} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700">
                        #{step.order} {step.exercise_detail?.name} — {step.sets}x{step.reps}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Tu coach todavía no ha publicado rutinas.</p>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Últimas sesiones registradas</h2>
                <span className="text-xs text-slate-500">{latestSessions.length} sesiones</span>
              </div>
              <ul className="mt-4 space-y-3">
                {latestSessions.length ? (
                  latestSessions.map((session) => (
                    <li key={session.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
                      <p className="font-semibold text-slate-900">{new Date(session.performed_at).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">
                        Completado: {session.completion_percentage}% — {session.duration_minutes} min — {session.status}
                      </p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Registra tu primera sesión desde el panel de rutinas.</p>
                )}
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Estado general</h2>
              <span className="text-xs text-slate-500">Actualizado al día de hoy</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase text-slate-400">Rutinas activas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{routines.length}</p>
                <p className="text-xs text-slate-500">Publicadas por tu gym</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase text-slate-400">Sesiones registradas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{sessions.length}</p>
                <p className="text-xs text-slate-500">Historial reciente</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase text-slate-400">Próxima acción</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {nextRoutine ? `Completar ${nextRoutine.name}` : 'Contacta a tu coach'}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
