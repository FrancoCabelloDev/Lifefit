'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type MealTemplate = {
  id: string
  plan: string
  day_number: number
  meal_type: string
  meal_type_display: string
  name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  ingredients: string
  instructions: string
  order: number
}

type MealLog = {
  id: string
  user: string
  meal_template: string
  meal_detail?: MealTemplate
  date: string
  completed: boolean
  notes: string
}

type NutritionPlan = {
  id: string
  gym: string | number | null
  name: string
  description: string
  calories_per_day: number
  protein_g: number
  carbs_g: number
  fats_g: number
  duration_days: number
  status: string
  points_reward: number
  meal_templates?: MealTemplate[]
  meals_by_day?: Record<string, MealTemplate[]>
  total_meals?: number
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
}

const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: '☀️',
  lunch: '🍽️',
  dinner: '🌙',
  snack: '🍪',
}

export default function NutricionPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null)
  const [selectedDay, setSelectedDay] = useState(1)
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [selectedMeal, setSelectedMeal] = useState<MealTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    calories_per_day: 2000,
    protein_g: 150,
    carbs_g: 200,
    fats_g: 65,
    duration_days: 7,
    points_reward: 0,
    status: 'draft',
  })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const fetchPlans = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/nutrition/plans/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setPlans(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchPlanDetail = useCallback(
    async (planId: string) => {
      if (!token) return
      try {
        const response = await fetch(`${API_BASE_URL}/api/nutrition/plans/${planId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setSelectedPlan(data)
        }
      } catch (error) {
        console.error(error)
      }
    },
    [token]
  )

  const fetchTodayMealLogs = useCallback(async () => {
    if (!token) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`${API_BASE_URL}/api/nutrition/meal-logs/?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMealLogs(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (error) {
      console.error(error)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchPlans()
      fetchTodayMealLogs()
    }
  }, [token, fetchPlans, fetchTodayMealLogs])

  const userGymId = user?.gym === null || user?.gym === undefined || user?.gym === '' ? null : user?.gym
  const canManagePlans = user?.role && ['super_admin', 'gym_admin', 'coach'].includes(user.role)

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (userGymId === null) {
        return plan.gym === null
      }
      return plan.gym === null || String(plan.gym) === String(userGymId)
    })
  }, [plans, userGymId])

  const handleSelectPlan = async (plan: NutritionPlan) => {
    await fetchPlanDetail(plan.id)
    setSelectedDay(1)
  }

  const handleClosePlan = () => {
    setSelectedPlan(null)
    setSelectedDay(1)
    setSelectedMeal(null)
  }

  const handleToggleMeal = async (mealTemplate: MealTemplate) => {
    if (!token) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`${API_BASE_URL}/api/nutrition/meal-logs/toggle_complete/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meal_template_id: mealTemplate.id,
          date: today,
        }),
      })

      if (response.ok) {
        await fetchTodayMealLogs()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const isMealCompleted = (mealTemplateId: string) => {
    return mealLogs.some((log) => log.meal_template === mealTemplateId && log.completed)
  }

  const todayCalories = useMemo(() => {
    return mealLogs
      .filter((log) => log.completed && log.meal_detail)
      .reduce((sum, log) => sum + (log.meal_detail?.calories || 0), 0)
  }, [mealLogs])

  const todayMacros = useMemo(() => {
    const completed = mealLogs.filter((log) => log.completed && log.meal_detail)
    return {
      protein: completed.reduce((sum, log) => sum + (log.meal_detail?.protein_g || 0), 0),
      carbs: completed.reduce((sum, log) => sum + (log.meal_detail?.carbs_g || 0), 0),
      fats: completed.reduce((sum, log) => sum + (log.meal_detail?.fats_g || 0), 0),
    }
  }, [mealLogs])

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formSaving) return

    setFormError('')
    setFormSaving(true)

    try {
      const url = editingPlan
        ? `${API_BASE_URL}/api/nutrition/plans/${editingPlan.id}/`
        : `${API_BASE_URL}/api/nutrition/plans/`

      const response = await fetch(url, {
        method: editingPlan ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planForm),
      })

      if (response.ok) {
        await fetchPlans()
        handleCloseModal()
      } else {
        const errorData = await response.json()
        setFormError(errorData.detail || 'Error al guardar el plan')
      }
    } catch (error) {
      setFormError('Error de conexión')
    } finally {
      setFormSaving(false)
    }
  }

  const handleEditPlan = (plan: NutritionPlan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      description: plan.description,
      calories_per_day: plan.calories_per_day,
      protein_g: plan.protein_g,
      carbs_g: plan.carbs_g,
      fats_g: plan.fats_g,
      duration_days: plan.duration_days,
      points_reward: plan.points_reward || 0,
      status: plan.status,
    })
    setShowCreateModal(true)
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/nutrition/plans/${planId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        await fetchPlans()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingPlan(null)
    setPlanForm({
      name: '',
      description: '',
      calories_per_day: 2000,
      protein_g: 150,
      carbs_g: 200,
      fats_g: 65,
      duration_days: 7,
      points_reward: 0,
      status: 'draft',
    })
    setFormError('')
  }

  if (!user) {
    return <DashboardPage user={user} active="/nutricion" loading loadingLabel="Cargando..." />
  }

  const currentDayMeals = selectedPlan?.meals_by_day?.[selectedDay] || []

  return (
    <DashboardPage user={user} active="/nutricion" loading={authLoading || loading}>
      <>
        <section className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Nutrición Personalizada
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Planes disponibles para ti
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Accede al catálogo global de Lifefit y a los planes creados por tu gimnasio.
              </p>
            </div>
            {canManagePlans && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                + Agregar plan
              </button>
            )}
          </div>
        </section>

        {selectedPlan ? (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={handleClosePlan}
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                ← Volver
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedPlan.name}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{selectedPlan.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      🔥 {selectedPlan.calories_per_day} kcal/día
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      💪 {selectedPlan.protein_g}g proteína
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      🍞 {selectedPlan.carbs_g}g carbos
                    </span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      🥑 {selectedPlan.fats_g}g grasas
                    </span>
                  </div>
                </div>
                {selectedPlan.points_reward > 0 && (
                  <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {selectedPlan.points_reward} pts
                  </span>
                )}
              </div>

              {/* Selector de días */}
              <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: selectedPlan.duration_days }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      selectedDay === day
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-emerald-600'
                    }`}
                  >
                    Día {day}
                  </button>
                ))}
              </div>

              {/* Progreso del día */}
              {selectedDay === 1 && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Progreso de Hoy</p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      🔥 {todayCalories}/{selectedPlan.calories_per_day} kcal
                    </span>
                    <span className="text-blue-700 dark:text-blue-400">
                      💪 {todayMacros.protein}g/{selectedPlan.protein_g}g
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">
                      🍞 {todayMacros.carbs}g/{selectedPlan.carbs_g}g
                    </span>
                    <span className="text-purple-700 dark:text-purple-400">
                      🥑 {todayMacros.fats}g/{selectedPlan.fats_g}g
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-emerald-200 dark:bg-emerald-800">
                    <div
                      className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                      style={{
                        width: `${Math.min((todayCalories / selectedPlan.calories_per_day) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Comidas del día */}
              <div className="mt-6 space-y-3">
                {currentDayMeals.length > 0 ? (
                  currentDayMeals.map((meal) => {
                    const completed = selectedDay === 1 && isMealCompleted(meal.id)
                    return (
                      <div
                        key={meal.id}
                        className={`rounded-2xl border p-4 transition ${
                          completed
                            ? 'border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{MEAL_TYPE_ICONS[meal.meal_type] || '🍽️'}</span>
                              <div>
                                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                  {meal.meal_type_display}
                                </p>
                                <p
                                  className={`text-base font-bold ${
                                    completed
                                      ? 'text-emerald-800 dark:text-emerald-300'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {meal.name}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex gap-3 text-xs">
                              <span
                                className={
                                  completed
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }
                              >
                                {meal.calories} kcal
                              </span>
                              <span
                                className={
                                  completed
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }
                              >
                                P:{meal.protein_g}g
                              </span>
                              <span
                                className={
                                  completed
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }
                              >
                                C:{meal.carbs_g}g
                              </span>
                              <span
                                className={
                                  completed
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }
                              >
                                G:{meal.fats_g}g
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedMeal(meal)}
                              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              Ver receta
                            </button>
                            {selectedDay === 1 && (
                              <button
                                onClick={() => handleToggleMeal(meal)}
                                className="shrink-0"
                                title={completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                              >
                                {completed ? (
                                  <svg
                                    className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="h-7 w-7 text-slate-400 dark:text-slate-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay comidas registradas para este día
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.length > 0 ? (
                filteredPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                        {plan.points_reward > 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            {plan.points_reward} pts
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {plan.calories_per_day} kcal
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {plan.duration_days} días
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        P:{plan.protein_g}g C:{plan.carbs_g}g G:{plan.fats_g}g
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                      >
                        Ver plan
                      </button>
                      {canManagePlans && (
                        <>
                          <button
                            onClick={() => handleEditPlan(plan)}
                            className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="rounded-2xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="col-span-full py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay planes disponibles
                </p>
              )}
            </div>
          </section>
        )}

        {/* Modal Ver Receta */}
        {selectedMeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{MEAL_TYPE_ICONS[selectedMeal.meal_type] || '🍽️'}</span>
                    <div>
                      <p className="text-xs uppercase text-emerald-600 dark:text-emerald-400">
                        {selectedMeal.meal_type_display}
                      </p>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedMeal.name}</h3>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:hover:text-slate-100"
                >
                  Cerrar ✕
                </button>
              </div>

              <div className="mt-4 flex gap-3 text-sm">
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {selectedMeal.calories} kcal
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  P: {selectedMeal.protein_g}g
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  C: {selectedMeal.carbs_g}g
                </span>
                <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  G: {selectedMeal.fats_g}g
                </span>
              </div>

              {selectedMeal.description && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{selectedMeal.description}</p>
                </div>
              )}

              <div className="mt-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">📝 Ingredientes</h4>
                <div className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {selectedMeal.ingredients || 'No especificado'}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">👨‍🍳 Preparación</h4>
                <div className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {selectedMeal.instructions || 'No especificado'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Crear/Editar Plan */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-emerald-600 dark:text-emerald-400">
                    {editingPlan ? 'Editar plan' : 'Nuevo plan'}
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingPlan ? 'Modifica los datos del plan' : 'Crea un nuevo plan de nutrición'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:hover:text-slate-100"
                >
                  Cerrar ✕
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Ej: Plan Pérdida de Peso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                  <textarea
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Describe el objetivo del plan..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Calorías/día
                    </label>
                    <input
                      type="number"
                      required
                      min="800"
                      max="5000"
                      value={planForm.calories_per_day}
                      onChange={(e) => setPlanForm({ ...planForm, calories_per_day: parseInt(e.target.value) || 2000 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duración (días)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="90"
                      value={planForm.duration_days}
                      onChange={(e) => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) || 7 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Proteína (g)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={planForm.protein_g}
                      onChange={(e) => setPlanForm({ ...planForm, protein_g: parseInt(e.target.value) || 150 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Carbos (g)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={planForm.carbs_g}
                      onChange={(e) => setPlanForm({ ...planForm, carbs_g: parseInt(e.target.value) || 200 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Grasas (g)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={planForm.fats_g}
                      onChange={(e) => setPlanForm({ ...planForm, fats_g: parseInt(e.target.value) || 65 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Puntos de recompensa
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.points_reward}
                      onChange={(e) => setPlanForm({ ...planForm, points_reward: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                    <select
                      value={planForm.status}
                      onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="draft">Borrador</option>
                      <option value="active">Activo</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>

                {formError && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{formError}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-2xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {formSaving ? 'Guardando...' : editingPlan ? 'Actualizar plan' : 'Crear plan'}
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
