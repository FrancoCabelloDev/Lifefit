'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type NutritionAssignment = {
  id: string
  status: string
  compliance_percentage: string
  plan_detail?: {
    name: string
    description: string
    calories_per_day: number
    macros?: Record<string, number>
    meals?: Array<{
      id: string
      order: number
      name: string
      meal_time: string
      items?: Array<{ id: string; food: string; portion: string }>
    }>
  }
}

export default function NutricionPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [assignments, setAssignments] = useState<NutritionAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchAssignments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/nutrition/assignments/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setAssignments(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchAssignments()
  }, [token])

  if (authLoading || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Cargando planes de nutrición...</p>
        </div>
      </div>
    )
  }

  const activePlan = assignments[0]

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active="/nutricion" />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-xs uppercase text-emerald-600">Nutrición personalizada</p>
            <h1 className="text-2xl font-semibold text-slate-900">Plan asignado por tu coach</h1>
            <p className="text-sm text-slate-500">Sigue tus comidas para mejorar tu rendimiento.</p>
          </header>

          {activePlan && activePlan.plan_detail ? (
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{activePlan.plan_detail.name}</h2>
                  <p className="text-sm text-slate-500">{activePlan.plan_detail.description}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-emerald-600">{activePlan.plan_detail.calories_per_day} kcal/día</p>
                  <p className="text-xs text-slate-500">Cumplimiento {activePlan.compliance_percentage}%</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                {activePlan.plan_detail.meals?.map((meal) => (
                  <div key={meal.id} className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      #{meal.order} {meal.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{meal.meal_time}</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {meal.items?.map((item) => (
                        <li key={item.id}>
                          {item.food} — <span className="text-xs text-slate-500">{item.portion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-lg">
              No tienes planes asignados todavía.
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
