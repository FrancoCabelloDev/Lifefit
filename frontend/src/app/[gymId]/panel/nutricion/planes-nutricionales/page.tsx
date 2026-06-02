'use client'

import { useState, useEffect, use } from 'react'
import { UtensilsCrossed, Plus, Search, Loader2, Edit, Trash, Check, X, Apple, Beef, Wheat, Droplets, UserPlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { api } from '@/lib/api'
import type { NutritionPlan, MealTemplate, User, PaginatedResponse } from '@/lib/types'

const STATUES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archivado', color: 'bg-slate-100 text-slate-600' },
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

type MealEntry = {
  meal_type: string
  name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
}

type DayMeals = {
  day_number: number
  meals: MealEntry[]
}

export default function NutritionPlansPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [plans, setPlans] = useState<NutritionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState<'plan' | 'meals'>('plan')
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [caloriesPerDay, setCaloriesPerDay] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatsG, setFatsG] = useState('')
  const [durationDays, setDurationDays] = useState('')
  const [pointsReward, setPointsReward] = useState('')
  const [status, setStatus] = useState<string>('draft')

  const [dayMeals, setDayMeals] = useState<DayMeals[]>([])

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignPlan, setAssignPlan] = useState<NutritionPlan | null>(null)
  const [athletes, setAthletes] = useState<User[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const openAssignDialog = async (plan: NutritionPlan) => {
    setAssignPlan(plan)
    setSelectedAthleteId('')
    setAssignDialogOpen(true)
    try {
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'athlete' }
      })
      setAthletes(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching athletes:', error)
    }
  }

  const handleAssignPlan = async () => {
    if (!assignPlan || !selectedAthleteId) return
    try {
      setIsAssigning(true)
      await api.post(`/api/nutrition/plans/${assignPlan.id}/assign_to_user/`, {
        user_id: selectedAthleteId,
      })
      setAssignDialogOpen(false)
      setAssignPlan(null)
      setSelectedAthleteId('')
    } catch (error: any) {
      alert(error?.message || 'Error al asignar plan')
    } finally {
      setIsAssigning(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<any>('/api/nutrition/plans/')
      setPlans(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err) {
      console.error('Error fetching plans:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setCaloriesPerDay('')
    setProteinG('')
    setCarbsG('')
    setFatsG('')
    setDurationDays('')
    setPointsReward('')
    setStatus('draft')
    setDayMeals([])
    setCreatedPlanId(null)
    setStep('plan')
    setEditingPlan(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setShowModal(true)
  }

  const handleEdit = (plan: NutritionPlan) => {
    setEditingPlan(plan)
    setName(plan.name)
    setDescription(plan.description)
    setCaloriesPerDay(String(plan.calories_per_day))
    setProteinG(String(plan.protein_g))
    setCarbsG(String(plan.carbs_g))
    setFatsG(String(plan.fats_g))
    setDurationDays(String(plan.duration_days))
    setPointsReward(String(plan.points_reward))
    setStatus(plan.status)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan nutricional?')) return
    try {
      await api.delete(`/api/nutrition/plans/${id}/`)
      setPlans((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Error deleting plan:', err)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        calories_per_day: Number(caloriesPerDay),
        protein_g: Number(proteinG),
        carbs_g: Number(carbsG),
        fats_g: Number(fatsG),
        duration_days: Number(durationDays),
        points_reward: Number(pointsReward),
        status,
      }

      if (editingPlan) {
        await api.put(`/api/nutrition/plans/${editingPlan.id}/`, payload)
        setShowModal(false)
        resetForm()
        fetchPlans()
      } else {
        const created = await api.post<any>('/api/nutrition/plans/', payload)
        const planId = created.id || created
        setCreatedPlanId(planId)
        const days = Array.from({ length: Number(durationDays) }, (_, i) => ({
          day_number: i + 1,
          meals: [{ meal_type: 'breakfast', name: '', description: '', calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }],
        }))
        setDayMeals(days)
        setStep('meals')
      }
    } catch (err) {
      console.error('Error saving plan:', err)
    } finally {
      setSaving(false)
    }
  }

  const addMealToDay = (dayIndex: number) => {
    setDayMeals((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, meals: [...d.meals, { meal_type: 'breakfast', name: '', description: '', calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }] }
          : d,
      ),
    )
  }

  const removeMealFromDay = (dayIndex: number, mealIndex: number) => {
    setDayMeals((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, meals: d.meals.filter((_, mi) => mi !== mealIndex) } : d,
      ),
    )
  }

  const updateMeal = (dayIndex: number, mealIndex: number, field: keyof MealEntry, value: string | number) => {
    setDayMeals((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              meals: d.meals.map((m, mi) => (mi === mealIndex ? { ...m, [field]: value } : m)),
            }
          : d,
      ),
    )
  }

  const handleSaveMeals = async () => {
    if (!createdPlanId) return
    setSaving(true)
    try {
      for (const day of dayMeals) {
        for (const meal of day.meals) {
          if (!meal.name) continue
          await api.post('/api/nutrition/meal-templates/', {
            plan: createdPlanId,
            day_number: day.day_number,
            meal_type: meal.meal_type,
            name: meal.name,
            description: meal.description,
            calories: Number(meal.calories),
            protein_g: Number(meal.protein_g),
            carbs_g: Number(meal.carbs_g),
            fats_g: Number(meal.fats_g),
          })
        }
      }
      setShowModal(false)
      resetForm()
      fetchPlans()
    } catch (err) {
      console.error('Error saving meals:', err)
    } finally {
      setSaving(false)
    }
  }

  const filteredPlans = plans.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planes Nutricionales</h1>
          <p className="text-slate-500 mt-1">Crea y administra planes de alimentación para tus atletas</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar planes nutricionales..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 rounded-2xl border-slate-200"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No hay planes nutricionales</h3>
          <p className="text-slate-500 mt-1 mb-4">Crea tu primer plan para empezar.</p>
          <Button onClick={handleOpenNew} variant="outline" className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" /> Crear Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const statusInfo = STATUES[plan.status] || STATUES.draft
            return (
              <Card key={plan.id} className="border-slate-200 overflow-hidden rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-slate-900">{plan.name}</CardTitle>
                      <Badge className={`${statusInfo.color} border-none font-medium`}>{statusInfo.label}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssignDialog(plan)}>
                        <UserPlus className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(plan)}>
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(plan.id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {plan.description && (
                    <CardDescription className="text-sm text-slate-600 mt-2 line-clamp-2">{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Apple className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium text-slate-900">{plan.calories_per_day}</span> kcal
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Beef className="h-4 w-4 text-rose-500" />
                      <span className="font-medium text-slate-900">{plan.protein_g}g</span> proteínas
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Wheat className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-slate-900">{plan.carbs_g}g</span> carbohidratos
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-slate-900">{plan.fats_g}g</span> grasas
                    </div>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-100 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-slate-400" />
                      {plan.total_meals ?? 0} comidas
                    </span>
                    <span>{plan.duration_days} días</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); resetForm() } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl">
          {step === 'plan' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {editingPlan ? 'Editar Plan Nutricional' : 'Crear Plan Nutricional'}
                </DialogTitle>
                <DialogDescription>Define los macros y duración del plan.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre del Plan</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Volumen 3000 kcal" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el plan..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="calories">Calorías por día</Label>
                    <Input id="calories" type="number" value={caloriesPerDay} onChange={(e) => setCaloriesPerDay(e.target.value)} placeholder="2500" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="protein">Proteínas (g)</Label>
                    <Input id="protein" type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} placeholder="150" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="carbs">Carbohidratos (g)</Label>
                    <Input id="carbs" type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} placeholder="300" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fats">Grasas (g)</Label>
                    <Input id="fats" type="number" value={fatsG} onChange={(e) => setFatsG(e.target.value)} placeholder="65" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duración (días)</Label>
                    <Input id="duration" type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="30" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="points">Puntos reward</Label>
                    <Input id="points" type="number" value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} placeholder="100" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="archived">Archivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm() }}>Cancelar</Button>
                  <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {saving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                    ) : editingPlan ? (
                      'Actualizar'
                    ) : (
                      'Crear y agregar comidas'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {step === 'meals' && createdPlanId && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Agregar Comidas</DialogTitle>
                <DialogDescription>
                  Define las comidas para cada día del plan. Puedes omitir este paso y añadirlas después.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {dayMeals.map((day, dayIndex) => (
                  <div key={day.day_number} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">Día {day.day_number}</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => addMealToDay(dayIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Comida
                      </Button>
                    </div>
                    {day.meals.map((meal, mealIndex) => (
                      <div key={mealIndex} className="rounded-xl bg-slate-50 p-3 space-y-2 relative">
                        {day.meals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMealFromDay(dayIndex, mealIndex)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-500">Tipo</Label>
                            <Select
                              value={meal.meal_type}
                              onValueChange={(v) => updateMeal(dayIndex, mealIndex, 'meal_type', v)}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MEAL_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t === 'breakfast' ? 'Desayuno' : t === 'lunch' ? 'Almuerzo' : t === 'dinner' ? 'Cena' : 'Snack'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Nombre</Label>
                            <Input
                              value={meal.name}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'name', e.target.value)}
                              placeholder="Pollo con arroz"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Descripción</Label>
                          <Input
                            value={meal.description}
                            onChange={(e) => updateMeal(dayIndex, mealIndex, 'description', e.target.value)}
                            placeholder="Opcional"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs text-slate-500">Cal</Label>
                            <Input
                              type="number"
                              value={meal.calories || ''}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'calories', Number(e.target.value))}
                              className="h-9 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Prot</Label>
                            <Input
                              type="number"
                              value={meal.protein_g || ''}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'protein_g', Number(e.target.value))}
                              className="h-9 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Carbs</Label>
                            <Input
                              type="number"
                              value={meal.carbs_g || ''}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'carbs_g', Number(e.target.value))}
                              className="h-9 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Grasas</Label>
                            <Input
                              type="number"
                              value={meal.fats_g || ''}
                              onChange={(e) => updateMeal(dayIndex, mealIndex, 'fats_g', Number(e.target.value))}
                              className="h-9 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); fetchPlans() }}>
                  Saltar este paso
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveMeals}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    'Guardar comidas'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Asignar Plan Nutricional</DialogTitle>
            <DialogDescription>
              Asigna &quot;{assignPlan?.name}&quot; a un atleta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Atleta</Label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11">
                  <SelectValue placeholder="Seleccionar atleta..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                  {athletes.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-500">No hay atletas disponibles</div>
                  ) : (
                    athletes.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="rounded-xl py-3 cursor-pointer">
                        {a.first_name} {a.last_name} ({a.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={!selectedAthleteId || isAssigning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
