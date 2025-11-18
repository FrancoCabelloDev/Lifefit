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
  const [showMealModal, setShowMealModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealTemplate | null>(null)
  const [mealForm, setMealForm] = useState({
    plan: '',
    day_number: 1,
    meal_type: 'breakfast',
    name: '',
    description: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    ingredients: '',
    instructions: '',
    order: 1,
  })

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

  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mealForm.plan || !mealForm.name) {
      setFormError('Debes completar los campos obligatorios')
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nutrition/meal-templates/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(mealForm),
      })

      if (response.ok) {
        await fetchPlans()
        if (selectedPlan) {
          const updated = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nutrition/plans/${selectedPlan.id}/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          })
          const data = await updated.json()
          setSelectedPlan(data)
        }
        handleCloseMealModal()
      } else {
        const errorData = await response.json()
        setFormError(errorData.detail || 'Error al crear la comida')
      }
    } catch (error) {
      setFormError('Error al crear la comida')
      console.error(error)
    }
  }

  const handleEditMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMeal || !mealForm.name) {
      setFormError('Debes completar los campos obligatorios')
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nutrition/meal-templates/${editingMeal.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(mealForm),
      })

      if (response.ok) {
        await fetchPlans()
        if (selectedPlan) {
          const updated = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nutrition/plans/${selectedPlan.id}/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          })
          const data = await updated.json()
          setSelectedPlan(data)
        }
        handleCloseMealModal()
      } else {
        const errorData = await response.json()
        setFormError(errorData.detail || 'Error al actualizar la comida')
      }
    } catch (error) {
      setFormError('Error al actualizar la comida')
      console.error(error)
    }
  }

  const handleDeleteMeal = async (mealId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta comida?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nutrition/meal-templates/${mealId}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        await fetchPlans()
        if (selectedPlan) {
          const updated = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/nutrition/plans/${selectedPlan.id}/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          })
          const data = await updated.json()
          setSelectedPlan(data)
        }
      }
    } catch (error) {
      console.error('Error al eliminar la comida:', error)
    }
  }

  const handleCloseMealModal = () => {
    setShowMealModal(false)
    setEditingMeal(null)
    setMealForm({
      plan: selectedPlan?.id.toString() || '',
      day_number: selectedDay,
      meal_type: 'breakfast',
      name: '',
      description: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
      ingredients: '',
      instructions: '',
      order: 1,
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
                {canManagePlans ? 'Gestiona tus planes de nutrición' : 'Planes disponibles para ti'}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {canManagePlans 
                  ? 'Crea planes personalizados y agrega comidas para cada día del plan.'
                  : 'Accede al catálogo global de Lifefit y a los planes creados por tu gimnasio.'}
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
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  📅 Días del plan ({selectedPlan.duration_days} días)
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {Array.from({ length: selectedPlan.duration_days }, (_, i) => i + 1).map((day) => {
                    const dayMealsCount = selectedPlan.meals_by_day?.[day]?.length || 0
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          selectedDay === day
                            ? 'bg-emerald-500 text-white'
                            : 'border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-emerald-600'
                        }`}
                      >
                        <div>Día {day}</div>
                        {dayMealsCount > 0 && (
                          <div className="mt-0.5 text-[10px] opacity-75">
                            {dayMealsCount} comida{dayMealsCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {canManagePlans && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setMealForm({
                        plan: selectedPlan.id.toString(),
                        day_number: selectedDay,
                        meal_type: 'breakfast',
                        name: '',
                        description: '',
                        calories: 0,
                        protein_g: 0,
                        carbs_g: 0,
                        fats_g: 0,
                        ingredients: '',
                        instructions: '',
                        order: currentDayMeals.length + 1,
                      })
                      setShowMealModal(true)
                    }}
                    className="rounded-2xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    + Agregar comida al Día {selectedDay}
                  </button>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Selecciona un día arriba y agrega las comidas que desees (desayuno, snack, almuerzo, cena, etc.)
                  </p>
                </div>
              )}

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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    🍽️ Comidas del Día {selectedDay}
                  </h4>
                  {currentDayMeals.length > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {currentDayMeals.length} comida{currentDayMeals.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
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
                            {canManagePlans && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingMeal(meal)
                                    setMealForm({
                                      plan: meal.plan.toString(),
                                      day_number: meal.day_number,
                                      meal_type: meal.meal_type,
                                      name: meal.name,
                                      description: meal.description || '',
                                      calories: meal.calories,
                                      protein_g: meal.protein_g,
                                      carbs_g: meal.carbs_g,
                                      fats_g: meal.fats_g,
                                      ingredients: meal.ingredients || '',
                                      instructions: meal.instructions || '',
                                      order: meal.order,
                                    })
                                    setShowMealModal(true)
                                  }}
                                  className="rounded-lg border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteMeal(meal.id)}
                                  className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                  title="Eliminar comida"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
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
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No hay comidas registradas para el Día {selectedDay}
                    </p>
                    {canManagePlans && (
                      <button
                        onClick={() => {
                          setMealForm({
                            plan: selectedPlan.id.toString(),
                            day_number: selectedDay,
                            meal_type: 'breakfast',
                            name: '',
                            description: '',
                            calories: 0,
                            protein_g: 0,
                            carbs_g: 0,
                            fats_g: 0,
                            ingredients: '',
                            instructions: '',
                            order: 1,
                          })
                          setShowMealModal(true)
                        }}
                        className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
                      >
                        + Agregar primera comida
                      </button>
                    )}
                  </div>
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
                    {editingPlan ? 'Modifica los datos del plan' : 'Paso 1: Crea el plan base'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {editingPlan 
                      ? 'Actualiza la información del plan de nutrición'
                      : 'Define el nombre, objetivos nutricionales y duración. Después podrás agregar comidas para cada día.'}
                  </p>
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
                      Calorías/día *
                    </label>
                    <input
                      type="number"
                      required
                      min="800"
                      max="5000"
                      value={planForm.calories_per_day}
                      onChange={(e) => setPlanForm({ ...planForm, calories_per_day: parseInt(e.target.value) || 2000 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duración (días) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="90"
                      value={planForm.duration_days}
                      onChange={(e) => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) || 7 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="7"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Podrás agregar comidas para cada día después de crear el plan
                    </p>
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
                    {formSaving 
                      ? 'Guardando...' 
                      : editingPlan 
                        ? 'Actualizar plan' 
                        : 'Crear plan y comenzar a agregar comidas'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Crear/Editar Comida */}
        {showMealModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-emerald-600 dark:text-emerald-400">
                    {editingMeal ? 'Editar comida' : `Agregar comida - Día ${mealForm.day_number}`}
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingMeal 
                      ? 'Modifica los datos de la comida' 
                      : `Paso 2: Agrega una comida al Día ${mealForm.day_number}`}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {editingMeal
                      ? 'Actualiza la información nutricional, ingredientes e instrucciones'
                      : 'Define el tipo de comida, información nutricional, ingredientes y preparación'}
                  </p>
                </div>
                <button
                  onClick={handleCloseMealModal}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:hover:text-slate-100"
                >
                  Cerrar ✕
                </button>
              </div>

              <form onSubmit={editingMeal ? handleEditMeal : handleCreateMeal} className="mt-4 space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-900/20">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    💡 Tip: Puedes agregar múltiples comidas por día (desayuno, snack, almuerzo, cena, etc.)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tipo de comida *
                    </label>
                    <select
                      required
                      value={mealForm.meal_type}
                      onChange={(e) => setMealForm({ ...mealForm, meal_type: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="breakfast">🍳 Desayuno</option>
                      <option value="snack">🥤 Snack</option>
                      <option value="lunch">🍽️ Almuerzo</option>
                      <option value="dinner">🌙 Cena</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Orden</label>
                    <input
                      type="number"
                      min="1"
                      value={mealForm.order}
                      onChange={(e) => setMealForm({ ...mealForm, order: parseInt(e.target.value) || 1 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={mealForm.name}
                    onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Ej: Avena con frutas y nueces"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                  <input
                    type="text"
                    value={mealForm.description}
                    onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Ej: Rica en fibra y energía sostenida"
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Calorías *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={mealForm.calories}
                      onChange={(e) => setMealForm({ ...mealForm, calories: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="450"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Proteína (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={mealForm.protein_g}
                      onChange={(e) => setMealForm({ ...mealForm, protein_g: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Carbos (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={mealForm.carbs_g}
                      onChange={(e) => setMealForm({ ...mealForm, carbs_g: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="55"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Grasas (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={mealForm.fats_g}
                      onChange={(e) => setMealForm({ ...mealForm, fats_g: parseFloat(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    🛒 Ingredientes
                  </label>
                  <textarea
                    value={mealForm.ingredients}
                    onChange={(e) => setMealForm({ ...mealForm, ingredients: e.target.value })}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="- 50g de avena integral&#10;- 1 plátano maduro&#10;- 30g de nueces&#10;- 1 cucharada de miel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    👨‍🍳 Preparación
                  </label>
                  <textarea
                    value={mealForm.instructions}
                    onChange={(e) => setMealForm({ ...mealForm, instructions: e.target.value })}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="1. Cocina la avena en agua o leche durante 5 minutos&#10;2. Agrega el plátano cortado en rodajas&#10;3. Espolvorea las nueces picadas&#10;4. Añade la miel al gusto"
                  />
                </div>

                {formError && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">{formError}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseMealModal}
                    className="flex-1 rounded-2xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {formSaving ? 'Guardando...' : editingMeal ? 'Actualizar comida' : 'Crear comida'}
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
