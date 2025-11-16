'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Routine = {
  id: string
  name: string
  objective: string
  level: string
  status: string
  duration_minutes: number
}

export default function RutinasPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

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

  if (authLoading || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Cargando rutinas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active="/rutinas" />
        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-xs uppercase text-emerald-600">Rutinas</p>
            <h1 className="text-2xl font-semibold text-slate-900">Programas de entrenamiento</h1>
            <p className="text-sm text-slate-500">Selecciona tu rutina y registra tus sesiones.</p>
          </header>
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Disponibles</h2>
              <span className="text-xs text-slate-500">{routines.length} rutinas</span>
            </div>
            <div className="mt-4 grid gap-4">
              {routines.length ? (
                routines.map((routine) => (
                  <div key={routine.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{routine.name}</p>
                        <p className="text-xs text-slate-500">{routine.objective}</p>
                      </div>
                      <span className="text-xs text-emerald-600 capitalize">{routine.level}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Duración aproximada {routine.duration_minutes} min — Estado {routine.status}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Tu gym aún no ha publicado rutinas.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
