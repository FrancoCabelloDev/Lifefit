'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { FormEvent, useEffect, useState } from 'react'

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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    calories_per_day: 2000,
    status: 'draft',
  })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const fetchPlans = async () => {
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
    }
  }

  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const assignmentsResponse = await fetch(`${API_BASE_URL}/api/nutrition/assignments/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        await fetchPlans()
        
        if (assignmentsResponse.ok) {
          const data = await assignmentsResponse.json()
          setAssignments(Array.isArray(data) ? data : data.results ?? [])
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

  const canManagePlans = user?.role && ['super_admin', 'gym_admin', 'coach'].includes(user.role)

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setFormSaving(true)
    setFormError('')
    try {
      const url = editingPlan
        ? `${API_BASE_URL}/api/nutrition/plans/${editingPlan.id}/`
        : `${API_BASE_URL}/api/nutrition/plans/`
      const method = editingPlan ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planForm),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos guardar el plan.')
      }
      setShowCreateModal(false)
      setEditingPlan(null)
      setPlanForm({ name: '', description: '', calories_per_day: 2000, status: 'draft' })
      fetchPlans()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
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
      status: 'active',
    })
    setShowCreateModal(true)
    setFormError('')
  }

  const handleDeletePlan = async (planId: string) => {
    if (!token) return
    if (!confirm('¿Estás seguro de eliminar este plan?')) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/nutrition/plans/${planId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos eliminar el plan.')
      }
      fetchPlans()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error al eliminar.')
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingPlan(null)
    setPlanForm({ name: '', description: '', calories_per_day: 2000, status: 'draft' })
    setFormError('')
  }

  return (
    <DashboardPage user={user} active="/nutricion" loading={loadingState} loadingLabel="Cargando planes de nutrición...">
        <>
          <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-emerald-600">Nutricion personalizada</p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Planes disponibles para ti</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Accede al catalogo global de Lifefit y a los planes creados por tu gimnasio.
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-emerald-400">{plan.calories_per_day} kcal/dia</span>
                          {canManagePlans && (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditPlan(plan)
                                }}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                                title="Editar plan"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePlan(plan.id)
                                }}
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                title="Eliminar plan"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
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

          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-emerald-600">{editingPlan ? 'Editar plan' : 'Nuevo plan'}</p>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {editingPlan ? 'Modifica los datos del plan' : 'Crea un nuevo plan de nutrición'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Cerrar ✕
                  </button>
                </div>
                <form onSubmit={handleCreatePlan} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                      type="text"
                      required
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Ej: Plan balanceado 2000 kcal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Descripción</label>
                    <textarea
                      required
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      placeholder="Ej: Plan equilibrado para mantener peso"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Calorías/día</label>
                      <input
                        type="number"
                        required
                        min="500"
                        value={planForm.calories_per_day}
                        onChange={(e) => setPlanForm({ ...planForm, calories_per_day: parseInt(e.target.value) || 2000 })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Estado</label>
                      <select
                        value={planForm.status}
                        onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="draft">Borrador</option>
                        <option value="active">Activo</option>
                        <option value="archived">Archivado</option>
                      </select>
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
                      {formSaving ? 'Guardando...' : editingPlan ? 'Guardar cambios' : 'Crear plan'}
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
