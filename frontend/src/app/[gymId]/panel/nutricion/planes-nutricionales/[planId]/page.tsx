'use client'

import { useState, useEffect, useRef, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Loader2, UserPlus, Flame, Beef,
  Wheat, Droplets, Search, X, ChevronDown, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import type { NutritionPlan, MealTemplate, User, PaginatedResponse } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { value: 'monday',    label: 'Lunes' },
  { value: 'tuesday',   label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday',  label: 'Jueves' },
  { value: 'friday',    label: 'Viernes' },
  { value: 'saturday',  label: 'Sábado' },
  { value: 'sunday',    label: 'Domingo' },
]

const MEAL_TYPES = [
  { value: 'breakfast',       label: 'Desayuno',      icon: '🌅', time: '7:00' },
  { value: 'mid_morning',     label: 'Media mañana',  icon: '🍎', time: '10:00' },
  { value: 'lunch',           label: 'Almuerzo',      icon: '☀️', time: '13:00' },
  { value: 'afternoon_snack', label: 'Merienda',      icon: '🍪', time: '16:00' },
  { value: 'dinner',          label: 'Cena',          icon: '🌙', time: '19:00' },
  { value: 'late_snack',      label: 'Recena',        icon: '🥛', time: '21:00' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  active:   { label: 'Activo',   color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archivado', color: 'bg-slate-100 text-slate-500' },
}

type FoodResult = {
  id: string
  name: string
  food_group: string
  calories_per_100g: string
  protein_per_100g: string
  carbs_per_100g: string
  fats_per_100g: string
  fiber_per_100g: string
}

type FoodItem = {
  id: string
  food: string
  food_name: string
  food_group: string
  quantity_g: string
  calories: string
  protein_g: string
  carbs_g: string
  fats_g: string
  fiber_g: string
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ gymId: string; planId: string }>
}) {
  const { gymId, planId } = use(params)
  const router = useRouter()

  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [meals, setMeals] = useState<MealTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWeekday, setSelectedWeekday] = useState<string>('')

  // Add day state
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [addingDay, setAddingDay] = useState(false)

  // Remove day
  const [removeDayConfirm, setRemoveDayConfirm] = useState(false)
  const [removingDay, setRemovingDay] = useState(false)

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [athletes, setAthletes] = useState<User[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [planData, mealsData] = await Promise.all([
        api.get<NutritionPlan>(`/api/nutrition/plans/${planId}/`),
        api.get<any>(`/api/nutrition/meal-templates/?plan=${planId}`),
      ])
      setPlan(planData)
      const arr: MealTemplate[] = Array.isArray(mealsData) ? mealsData : mealsData?.results ?? []
      setMeals(arr)

      // Select first available weekday
      const days = getAddedDays(arr)
      if (days.length > 0) {
        setSelectedWeekday(prev => days.includes(prev) ? prev : days[0])
      }
    } catch {
      showError(null, 'Error al cargar el plan')
    } finally {
      setIsLoading(false)
    }
  }, [planId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const getAddedDays = (mealList: MealTemplate[]) => {
    const set = new Set(mealList.map(m => m.weekday).filter(Boolean) as string[])
    return WEEKDAYS.map(d => d.value).filter(d => set.has(d))
  }

  const addedDays = getAddedDays(meals)
  const availableDays = WEEKDAYS.filter(d => !addedDays.includes(d.value))

  const mealsForDay = meals.filter(m => m.weekday === selectedWeekday)

  const dayTotals = mealsForDay.reduce(
    (acc, m) => ({
      cal: acc.cal + (m.calories || 0),
      prot: acc.prot + (m.protein_g || 0),
      carbs: acc.carbs + (m.carbs_g || 0),
      fats: acc.fats + (m.fats_g || 0),
    }),
    { cal: 0, prot: 0, carbs: 0, fats: 0 },
  )

  // ── Add day ──────────────────────────────────────────────────────────────

  const handleAddDay = async (weekday: string) => {
    setAddingDay(true)
    try {
      await api.post(`/api/nutrition/plans/${planId}/add_day/`, { weekday })
      setSelectedWeekday(weekday)
      setAddDayOpen(false)
      await fetchAll()
      showSuccess(`${WEEKDAYS.find(d => d.value === weekday)?.label} agregado`)
    } catch (err) {
      showError(err, 'Error al agregar día')
    } finally {
      setAddingDay(false)
    }
  }

  // ── Remove day ───────────────────────────────────────────────────────────

  const handleRemoveDay = async () => {
    setRemovingDay(true)
    try {
      await api.post(`/api/nutrition/plans/${planId}/remove_day/`, { weekday: selectedWeekday })
      const remaining = addedDays.filter(d => d !== selectedWeekday)
      setSelectedWeekday(remaining[0] ?? '')
      setRemoveDayConfirm(false)
      await fetchAll()
      showSuccess('Día eliminado')
    } catch (err) {
      showError(err, 'Error al eliminar día')
    } finally {
      setRemovingDay(false)
    }
  }

  // ── Assign ───────────────────────────────────────────────────────────────

  const openAssign = async () => {
    setSelectedAthleteId('')
    setAssignOpen(true)
    try {
      const data = await api.get<PaginatedResponse<User>>('/api/auth/gym-members/', { params: { role: 'athlete' } })
      setAthletes(Array.isArray(data) ? data : data.results || [])
    } catch { }
  }

  const handleAssign = async () => {
    if (!selectedAthleteId) return
    setIsAssigning(true)
    try {
      await api.post(`/api/nutrition/plans/${planId}/assign_to_user/`, { user_id: selectedAthleteId })
      showSuccess('Plan asignado al atleta')
      setAssignOpen(false)
    } catch (err) {
      showError(err, 'Error al asignar plan')
    } finally {
      setIsAssigning(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Plan no encontrado.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[plan.status] ?? STATUS_LABELS.draft
  const selectedDayLabel = WEEKDAYS.find(d => d.value === selectedWeekday)?.label ?? ''

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push(`/${gymId}/panel/nutricion/planes-nutricionales`)}
            className="mt-1 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{plan.name}</h1>
              <Badge className={`${statusInfo.color} border-none`}>{statusInfo.label}</Badge>
            </div>
            {plan.description && (
              <p className="text-sm text-slate-500 mt-0.5">{plan.description}</p>
            )}
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                {plan.calories_per_day} kcal/día objetivo
              </span>
              <span>{addedDays.length} días configurados</span>
            </div>
          </div>
        </div>
        <Button onClick={openAssign} className="bg-emerald-600 hover:bg-emerald-700 shrink-0" size="sm">
          <UserPlus className="w-4 h-4 mr-1" /> Asignar a atleta
        </Button>
      </div>

      {/* ── Day tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {addedDays.map(day => {
          const d = WEEKDAYS.find(w => w.value === day)!
          return (
            <button
              key={day}
              onClick={() => setSelectedWeekday(day)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedWeekday === day
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          )
        })}

        {availableDays.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setAddDayOpen(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir día
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {addDayOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-10 min-w-[140px] overflow-hidden">
                {availableDays.map(d => (
                  <button
                    key={d.value}
                    disabled={addingDay}
                    onClick={() => handleAddDay(d.value)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2"
                  >
                    {addingDay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedWeekday && (
          <button
            onClick={() => setRemoveDayConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar {selectedDayLabel}
          </button>
        )}
      </div>

      {/* ── No days added yet ── */}
      {addedDays.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
          <span className="text-4xl mb-3 block">📅</span>
          <h3 className="text-lg font-semibold text-slate-800">Sin días configurados</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Haz clic en "Añadir día" para comenzar a planificar la semana.
          </p>
        </div>
      )}

      {/* ── Day content ── */}
      {selectedWeekday && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
          {/* Meal sections */}
          <div className="space-y-4">
            {MEAL_TYPES.map(mt => {
              const meal = mealsForDay.find(m => m.meal_type === mt.value)
              return (
                <MealSection
                  key={mt.value}
                  mealType={mt}
                  meal={meal}
                  planId={planId}
                  onRefresh={fetchAll}
                />
              )
            })}
          </div>

          {/* Analysis sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Análisis del {selectedDayLabel}
              </p>
              {[
                { label: 'Energía',   val: dayTotals.cal,   target: plan.calories_per_day, unit: 'kcal', color: 'bg-orange-400', icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
                { label: 'Proteínas', val: dayTotals.prot,  target: plan.protein_g,        unit: 'g',    color: 'bg-rose-400',   icon: <Beef className="w-3.5 h-3.5 text-rose-500" /> },
                { label: 'H. Carbono',val: dayTotals.carbs, target: plan.carbs_g,          unit: 'g',    color: 'bg-amber-400',  icon: <Wheat className="w-3.5 h-3.5 text-amber-500" /> },
                { label: 'Grasa',     val: dayTotals.fats,  target: plan.fats_g,           unit: 'g',    color: 'bg-blue-400',   icon: <Droplets className="w-3.5 h-3.5 text-blue-500" /> },
              ].map(({ label, val, target, unit, color, icon }) => {
                const pct = target > 0 ? Math.min(100, Math.round((val / target) * 100)) : 0
                const valRounded = typeof val === 'number' ? Math.round(val * 10) / 10 : val
                return (
                  <div key={label} className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        {icon}{label}
                      </span>
                      <span className="text-xs text-slate-700">
                        <span className="font-semibold">{valRounded}</span>
                        <span className="text-slate-400">/{target}{unit}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-right text-[10px] text-slate-400 mt-0.5">{pct}%</p>
                  </div>
                )
              })}
              <div className="border-t border-slate-100 pt-3 mt-1">
                <p className="text-[11px] text-slate-400 text-center">
                  Desde {new Date(plan.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove day dialog ── */}
      <Dialog open={removeDayConfirm} onOpenChange={setRemoveDayConfirm}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>¿Eliminar {selectedDayLabel}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Se eliminarán todas las comidas y alimentos del {selectedDayLabel}. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDayConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemoveDay} disabled={removingDay}>
              {removingDay ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign dialog ── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Asignar plan a atleta</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">Atleta</Label>
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un atleta..." /></SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.first_name} {a.last_name} — {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!selectedAthleteId || isAssigning} className="bg-emerald-600 hover:bg-emerald-700">
              {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── MealSection ────────────────────────────────────────────────────────────

function MealSection({
  mealType, meal, planId, onRefresh,
}: {
  mealType: { value: string; label: string; icon: string; time: string }
  meal: MealTemplate | undefined
  planId: string
  onRefresh: () => Promise<void>
}) {
  const foodItems: FoodItem[] = (meal as any)?.food_items ?? []
  const totalCal = foodItems.reduce((s, fi) => s + parseFloat(fi.calories || '0'), 0)

  const [addingFood, setAddingFood] = useState(false)

  const handleRemoveItem = async (itemId: string) => {
    try {
      await api.delete(`/api/nutrition/meal-food-items/${itemId}/`)
      await onRefresh()
    } catch (err) {
      showError(err, 'Error al eliminar alimento')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{mealType.icon}</span>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{mealType.label}</p>
            <p className="text-[11px] text-slate-400">{mealType.time}</p>
          </div>
          {foodItems.length > 0 && (
            <span className="text-xs text-slate-400 ml-1">
              · {Math.round(totalCal)} kcal
            </span>
          )}
        </div>
        {meal && (
          <button
            onClick={() => setAddingFood(v => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              addingFood
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {addingFood ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Plus className="w-3.5 h-3.5" /> Agregar nuevo alimento</>}
          </button>
        )}
      </div>

      {/* Food items list */}
      {foodItems.length > 0 && (
        <div className="divide-y divide-slate-50">
          {foodItems.map(item => (
            <FoodItemRow key={item.id} item={item} onRemove={() => handleRemoveItem(item.id)} />
          ))}
        </div>
      )}

      {/* Macro summary bar */}
      {foodItems.length > 0 && (
        <MacroBar items={foodItems} />
      )}

      {/* Add food search */}
      {addingFood && meal && (
        <FoodSearch
          mealId={meal.id}
          onAdded={async () => { setAddingFood(false); await onRefresh() }}
          onCancel={() => setAddingFood(false)}
        />
      )}

      {/* Empty */}
      {foodItems.length === 0 && !addingFood && (
        <div className="px-5 py-4 text-xs text-slate-400 italic">
          Sin alimentos configurados
        </div>
      )}

      {/* No meal template yet */}
      {!meal && (
        <div className="px-5 py-3 text-xs text-slate-400 italic">
          Cargando...
        </div>
      )}
    </div>
  )
}

// ── FoodItemRow ────────────────────────────────────────────────────────────

function FoodItemRow({ item, onRemove }: { item: FoodItem; onRemove: () => void }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/60">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{item.food_name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
          <span>{parseFloat(item.quantity_g).toFixed(0)}g</span>
          <span className="text-orange-500 font-medium">{Math.round(parseFloat(item.calories))} kcal</span>
          <span>P: {parseFloat(item.protein_g).toFixed(1)}g</span>
          <span>C: {parseFloat(item.carbs_g).toFixed(1)}g</span>
          <span>G: {parseFloat(item.fats_g).toFixed(1)}g</span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── MacroBar ───────────────────────────────────────────────────────────────

function MacroBar({ items }: { items: FoodItem[] }) {
  const totals = items.reduce(
    (acc, i) => ({
      cal:   acc.cal   + parseFloat(i.calories  || '0'),
      prot:  acc.prot  + parseFloat(i.protein_g || '0'),
      carbs: acc.carbs + parseFloat(i.carbs_g   || '0'),
      fats:  acc.fats  + parseFloat(i.fats_g    || '0'),
      fiber: acc.fiber + parseFloat((i as any).fiber_g || '0'),
    }),
    { cal: 0, prot: 0, carbs: 0, fats: 0, fiber: 0 },
  )
  return (
    <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-[11px]">
      <span className="flex items-center gap-1 text-orange-600 font-semibold">
        <Flame className="w-3 h-3" />{Math.round(totals.cal)} kcal
      </span>
      <span className="text-slate-500">Prot: <b>{totals.prot.toFixed(1)}g</b></span>
      <span className="text-slate-500">Carbs: <b>{totals.carbs.toFixed(1)}g</b></span>
      <span className="text-slate-500">Grasas: <b>{totals.fats.toFixed(1)}g</b></span>
      <span className="text-slate-500">Fibra: <b>{totals.fiber.toFixed(1)}g</b></span>
    </div>
  )
}

// ── FoodSearch ─────────────────────────────────────────────────────────────

function FoodSearch({
  mealId, onAdded, onCancel,
}: {
  mealId: string
  onAdded: () => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [quantity, setQuantity] = useState('')
  const [adding, setAdding] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = (val: string) => {
    setQuery(val)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.get<any>(`/api/nutrition/foods/?search=${encodeURIComponent(val)}`)
        setResults(Array.isArray(data) ? data : data?.results ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const handleSelect = (food: FoodResult) => {
    setSelected(food)
    setQuery(food.name)
    setResults([])
  }

  const handleAdd = async () => {
    if (!selected || !quantity || parseFloat(quantity) <= 0) return
    setAdding(true)
    try {
      await api.post('/api/nutrition/meal-food-items/', {
        meal: mealId,
        food: selected.id,
        quantity_g: parseFloat(quantity),
      })
      onAdded()
    } catch (err) {
      showError(err, 'Error al agregar alimento')
    } finally {
      setAdding(false)
    }
  }

  // Preview macros for entered quantity
  const preview = selected && quantity && parseFloat(quantity) > 0
    ? {
        cal:   Math.round(parseFloat(selected.calories_per_100g)  * parseFloat(quantity) / 100),
        prot:  (parseFloat(selected.protein_per_100g)  * parseFloat(quantity) / 100).toFixed(1),
        carbs: (parseFloat(selected.carbs_per_100g)    * parseFloat(quantity) / 100).toFixed(1),
        fats:  (parseFloat(selected.fats_per_100g)     * parseFloat(quantity) / 100).toFixed(1),
      }
    : null

  return (
    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agregar alimento</p>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar alimento (ej: avena, pollo, leche...)"
          className="pl-9 h-9 text-sm"
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
        )}

        {/* Results dropdown */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-48 overflow-y-auto">
            {results.map(food => (
              <button
                key={food.id}
                onClick={() => handleSelect(food)}
                className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors"
              >
                <p className="text-sm font-medium text-slate-800">{food.name}</p>
                <p className="text-[11px] text-slate-400">
                  {Math.round(parseFloat(food.calories_per_100g))} kcal · {food.food_group} · por 100g
                </p>
              </button>
            ))}
          </div>
        )}

        {query.length > 2 && !searching && results.length === 0 && !selected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 px-4 py-3 text-sm text-slate-400">
            No se encontró "{query}"
          </div>
        )}
      </div>

      {/* Quantity + preview */}
      {selected && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Cantidad (gramos)</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="100"
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            {preview && (
              <div className="flex gap-2 text-[11px] text-slate-500 pt-5">
                <span className="text-orange-600 font-semibold">{preview.cal} kcal</span>
                <span>P:{preview.prot}g</span>
                <span>C:{preview.carbs}g</span>
                <span>G:{preview.fats}g</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!selected || !quantity || parseFloat(quantity) <= 0 || adding}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Añadir
        </Button>
      </div>
    </div>
  )
}
