'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type NutritionAssignment = {
  id: string
  status: string
  compliance_percentage: string
  plan_detail?: NutritionPlan
}

type NutritionPlan = {
  id: string
  gym: string | number | null
  name: string
  description: string
  calories_per_day: number
  macros?: Record<string, number | string>
  meals?: Array<{
    id: string
    order: number
    name: string
    meal_time: string
    items?: Array<{ id: string; food: string; portion: string }>
  }>
}

export default function NutricionPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [assignments, setAssignments] = useState<NutritionAssignment[]>([])
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const [assignmentsResponse, plansResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/nutrition/assignments/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/nutrition/plans/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (assignmentsResponse.ok) {
          const data = await assignmentsResponse.json()
          setAssignments(Array.isArray(data) ? data : data.results ?? [])
        }
        if (plansResponse.ok) {
          const data = await plansResponse.json()
          setPlans(Array.isArray(data) ? data : data.results ?? [])
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
    return <DashboardPage user={user} active="/nutricion" loading loadingLabel="Cargando planes de nutrición..." />
  }

  const loadingState = authLoading || loading

  const activePlan = assignments[0]
  const userGymId = user.gym === null || user.gym === undefined || user.gym === '' ? null : user.gym
  const hasGymSpecificPlans =
    userGymId !== null && plans.some((plan) => plan.gym !== null && String(plan.gym) === String(userGymId))
  const showGymEmptyMessage = userGymId !== null && !hasGymSpecificPlans && plans.length > 0

  return (
    <DashboardPage user={user} active="/nutricion" loading={loadingState} loadingLabel="Cargando planes de nutrición...">
        <>
          <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <p className="text-xs uppercase text-emerald-600">Nutricion personalizada</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Planes disponibles para ti</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Accede al catalogo global de Lifefit y a los planes creados por tu gimnasio.
            </p>
          </header>

          {activePlan && activePlan.plan_detail ? (
            <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{activePlan.plan_detail.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{activePlan.plan_detail.description}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-emerald-400">{activePlan.plan_detail.calories_per_day} kcal/dia</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cumplimiento {activePlan.compliance_percentage}%</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                {activePlan.plan_detail.meals?.map((meal) => (
                  <div key={meal.id} className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      #{meal.order} {meal.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize dark:text-slate-400">{meal.meal_time}</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      {meal.items?.map((item) => (
                        <li key={item.id}>
                          {item.food} - <span className="text-xs text-slate-500 dark:text-slate-400">{item.portion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-300">
              No tienes un plan personalizado asignado todavia.
            </section>
          )}

          <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Planes disponibles</h2>
              <span className="text-xs text-slate-500 dark:text-slate-300">{plans.length} planes</span>
            </div>
            <div className="mt-4 grid gap-4">
              {showGymEmptyMessage && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tu gym aun no ha publicado planes propios. Explora los planes globales de Lifefit disponibles para ti.
                </p>
              )}
              {plans.length ? (
                plans.map((plan) => {
                  const macroEntries = Object.entries(plan.macros ?? {})
                  return (
                    <div key={plan.id} className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                        </div>
                        <span className="text-xs text-emerald-400">{plan.calories_per_day} kcal/dia</span>
                      </div>
                      {macroEntries.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
                          {macroEntries.map(([macro, value]) => (
                            <span key={macro} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                              {macro}: {value}g
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{plan.gym ? 'Plan de tu gym' : 'Plan global Lifefit'}</p>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {userGymId !== null
                    ? 'Aun no hay planes disponibles para tu cuenta.'
                    : 'Aun no hay planes globales disponibles.'}
                </p>
              )}
            </div>
          </section>
        </>
    </DashboardPage>
  )
}
