'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Dumbbell, Apple, Target, Award, Zap,
  UserCheck, AlertTriangle, Activity, Ruler, Scale,
  Calendar, CalendarClock, CheckCircle2, Clock, Star, MessageSquare,
  UtensilsCrossed, Plus, Loader2, ChevronLeft, ChevronRight,
  Search, Trash2, X, Flame, Camera, Pencil, Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User } from '@/lib/types'
import { ProfileSkeleton } from '@/components/ui/skeletons'
import { showSuccess, showError } from '@/lib/toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: any, unit = '') {
  if (val === null || val === undefined) return '—'
  return `${val}${unit}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function TierBadge({ tier }: { tier: string | null }) {
  if (tier === 'premium') return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
      <Star className="w-3 h-3" /> Premium
    </span>
  )
  if (tier === 'basic') return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
      Basic
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-500 border border-rose-100 text-xs font-bold px-2.5 py-0.5 rounded-full">
      Sin membresía
    </span>
  )
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
    no_show: 'bg-rose-50 text-rose-600 border-rose-100',
  }
  const labels: Record<string, string> = {
    scheduled: 'Programada', completed: 'Completada',
    cancelled: 'Cancelada', no_show: 'No asistió',
  }
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {labels[status] || status}
    </span>
  )
}

const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}
const WEEKDAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast:       'Desayuno',
  mid_morning:     'Media mañana',
  lunch:           'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner:          'Cena',
  late_snack:      'Recena',
  snack:           'Snack',
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast:       'bg-amber-50 text-amber-700 border-amber-100',
  mid_morning:     'bg-lime-50 text-lime-700 border-lime-100',
  lunch:           'bg-emerald-50 text-emerald-700 border-emerald-100',
  afternoon_snack: 'bg-orange-50 text-orange-700 border-orange-100',
  dinner:          'bg-indigo-50 text-indigo-700 border-indigo-100',
  late_snack:      'bg-purple-50 text-purple-700 border-purple-100',
  snack:           'bg-rose-50 text-rose-700 border-rose-100',
}

// ─── Tab: Plan de Alimentación (interactivo estilo Nutrium) ──────────────────

function AddFoodModal({ mealId, gymId, onClose, onAdded }: {
  mealId: string; gymId: string; onClose: () => void; onAdded: () => void
}) {
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<any>(null)
  const [quantity, setQuantity] = useState('100')

  const foodsQuery = useQuery({
    queryKey: ['foods-search', gymId, search],
    queryFn: async () => {
      const params: any = {}
      if (search.trim()) params.search = search.trim()
      const res = await api.get<any>('/api/nutrition/foods/', { params })
      return Array.isArray(res) ? res : (res?.results ?? [])
    },
  })

  const addMutation = useMutation({
    mutationFn: () => api.post('/api/nutrition/meal-food-items/', {
      meal: mealId, food: selectedFood.id, quantity_g: parseFloat(quantity) || 100,
    }),
    onSuccess: () => { showSuccess('Alimento agregado'); onAdded(); onClose() },
    onError: (err) => showError(err, 'Error al agregar alimento'),
  })

  // Macros preview en tiempo real
  const factor = (parseFloat(quantity) || 0) / 100
  const preview = selectedFood ? {
    cal: (parseFloat(selectedFood.calories_per_100g) * factor).toFixed(1),
    p:   (parseFloat(selectedFood.protein_per_100g)  * factor).toFixed(1),
    c:   (parseFloat(selectedFood.carbs_per_100g)    * factor).toFixed(1),
    g:   (parseFloat(selectedFood.fats_per_100g)     * factor).toFixed(1),
  } : null

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Agregar alimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {!selectedFood ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar alimento..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {foodsQuery.isLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-emerald-600" /></div>
                ) : (foodsQuery.data || []).length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">Sin resultados</p>
                ) : (
                  (foodsQuery.data || []).map((food: any) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors group"
                    >
                      <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-700">{food.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {food.food_group_display} · {food.calories_per_100g} kcal/100g
                      </p>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2.5">
                <p className="text-sm font-semibold text-emerald-800 flex-1">{selectedFood.name}</p>
                <button onClick={() => setSelectedFood(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cantidad (gramos)</label>
                <input
                  autoFocus
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {preview && (
                <div className="grid grid-cols-4 gap-2 bg-slate-50 rounded-xl p-3">
                  {[
                    { label: 'Energía', value: preview.cal, unit: 'kcal', color: 'text-orange-600' },
                    { label: 'Proteína', value: preview.p, unit: 'g', color: 'text-blue-600' },
                    { label: 'H. Carbono', value: preview.c, unit: 'g', color: 'text-amber-600' },
                    { label: 'Grasa', value: preview.g, unit: 'g', color: 'text-rose-600' },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="text-center">
                      <p className={`text-sm font-bold ${color}`}>{value}</p>
                      <p className="text-[9px] text-slate-400">{unit}</p>
                      <p className="text-[9px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1"
                  disabled={addMutation.isPending || !quantity}
                  onClick={() => addMutation.mutate()}
                >
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Agregar</>}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MealBlock({ meal, gymId, onRefresh }: { meal: any; gymId: string; onRefresh: () => void }) {
  const queryClient = useQueryClient()
  const [addingFood, setAddingFood]         = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(false)

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/api/nutrition/meal-food-items/${itemId}/`),
    onSuccess: () => { onRefresh() },
    onError: (err) => showError(err, 'Error al eliminar'),
  })

  const deleteMealMutation = useMutation({
    mutationFn: () => api.delete(`/api/nutrition/meal-templates/${meal.id}/`),
    onSuccess: () => { showSuccess('Comida eliminada'); onRefresh() },
    onError: (err) => showError(err, 'Error al eliminar la comida'),
  })

  const items: any[] = meal.food_items || []
  const totalCal = items.reduce((s: number, i: any) => s + parseFloat(i.calories || 0), 0)
  const totalP   = items.reduce((s: number, i: any) => s + parseFloat(i.protein_g || 0), 0)
  const totalC   = items.reduce((s: number, i: any) => s + parseFloat(i.carbs_g || 0), 0)
  const totalG   = items.reduce((s: number, i: any) => s + parseFloat(i.fats_g || 0), 0)

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      {/* Header de la comida */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 bg-slate-50/60 group">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${MEAL_TYPE_COLORS[meal.meal_type] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
        </span>
        <p className="text-sm font-semibold text-slate-800 flex-1">{meal.name}</p>
        {items.length > 0 && (
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span className="font-medium text-orange-600">{totalCal.toFixed(0)} kcal</span>
            <span>P {totalP.toFixed(1)}g</span>
            <span>C {totalC.toFixed(1)}g</span>
            <span>G {totalG.toFixed(1)}g</span>
          </div>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
            title="Eliminar esta comida del día"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-150">
            <span className="text-[11px] text-slate-500">¿Eliminar?</span>
            <button
              onClick={() => deleteMealMutation.mutate()}
              disabled={deleteMealMutation.isPending}
              className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {deleteMealMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Lista de alimentos */}
      {items.length > 0 && (
        <div className="divide-y divide-slate-50">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{item.food_name}
                  <span className="text-slate-400 ml-1.5">({item.quantity_g}g)</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  {parseFloat(item.calories).toFixed(0)} kcal · P {parseFloat(item.protein_g).toFixed(1)}g · C {parseFloat(item.carbs_g).toFixed(1)}g · G {parseFloat(item.fats_g).toFixed(1)}g
                </p>
              </div>
              <button
                onClick={() => deleteItemMutation.mutate(item.id)}
                disabled={deleteItemMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón agregar alimento */}
      <button
        onClick={() => setAddingFood(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-50"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar alimento
      </button>

      {addingFood && (
        <AddFoodModal
          mealId={meal.id}
          gymId={gymId}
          onClose={() => setAddingFood(false)}
          onAdded={onRefresh}
        />
      )}
    </div>
  )
}

function NutritionPlanTab({ athleteId, gymId, membership_tier }: {
  athleteId: string; gymId: string; membership_tier: string | null
}) {
  const queryClient = useQueryClient()
  const [innerTab, setInnerTab]           = useState<'plan' | 'logs'>('plan')
  const [editingScheduled, setEditingScheduled] = useState(false)
  const [editingScheduledDate, setEditingScheduledDate] = useState(false)
  const [scheduledDateInput, setScheduledDateInput] = useState('')
  const [selectedDay, setSelectedDay]     = useState<string | number>(1)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [addDayOpen, setAddDayOpen]       = useState(false)
  const [addingDay, setAddingDay]         = useState(false)
  const [removeDayConfirm, setRemoveDayConfirm] = useState(false)
  const [removingDay, setRemovingDay]     = useState(false)
  const [lightbox, setLightbox]           = useState<string | null>(null)
  const [approveConfirm, setApproveConfirm] = useState(false)

  const nutritionQuery = useQuery({
    queryKey: ['athlete-nutrition', athleteId],
    queryFn: () => api.get<any>(`/api/nutrition/assignments/athlete_nutrition/?athlete_id=${athleteId}`),
  })

  const weekLogsQuery = useQuery({
    queryKey: ['athlete-week-logs', athleteId],
    queryFn: () => api.get<any>(`/api/nutrition/assignments/week-logs/?athlete_id=${athleteId}`),
  })

  const nutData2 = nutritionQuery.data
  const scheduledPlanMeta = nutData2?.scheduled_plan ?? null

  const scheduledPlanQuery = useQuery({
    queryKey: ['nutrition-plan-detail', scheduledPlanMeta?.plan_id],
    queryFn: () => api.get<any>(`/api/nutrition/plans/${scheduledPlanMeta!.plan_id}/`),
    enabled: !!scheduledPlanMeta?.plan_id,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ logId, approved, notes }: { logId: string; approved: boolean; notes?: string }) =>
      api.post(`/api/nutrition/meal-logs/${logId}/review/`, { approved, notes: notes ?? '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['athlete-week-logs', athleteId] }),
    onError: (err) => showError(err, 'Error al revisar'),
  })

  const approveWeekMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      api.post<any>(`/api/nutrition/assignments/${assignmentId}/approve-week/`),
    onSuccess: (data: any) => {
      showSuccess(data?.detail ?? `Semana aprobada. ${data?.points_awarded ?? 0} puntos otorgados.`)
      setApproveConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['athlete-nutrition', athleteId] })
      queryClient.invalidateQueries({ queryKey: ['athlete-week-logs', athleteId] })
      setAssignModalOpen(true)
    },
    onError: (err) => showError(err, 'Error al aprobar la semana'),
  })

  const updateScheduledDateMutation = useMutation({
    mutationFn: ({ assignmentId, start_date }: { assignmentId: string; start_date: string }) =>
      api.patch(`/api/nutrition/assignments/${assignmentId}/`, { start_date }),
    onSuccess: () => {
      showSuccess('Fecha actualizada')
      setEditingScheduledDate(false)
      queryClient.invalidateQueries({ queryKey: ['athlete-nutrition', athleteId] })
    },
    onError: (err) => showError(err, 'Error al actualizar la fecha'),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['athlete-nutrition', athleteId] })
    queryClient.invalidateQueries({ queryKey: ['athlete-week-logs', athleteId] })
  }

  if (nutritionQuery.isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
  }

  if (nutritionQuery.isError) {
    return (
      <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
        <p className="text-sm text-rose-800 font-medium">
          Error al cargar el plan nutricional. Intenta recargar la página.
        </p>
      </div>
    )
  }

  if (membership_tier !== 'premium') {
    return (
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Este atleta no tiene Plan Premium. No puede recibir un plan nutricional personalizado.
        </p>
      </div>
    )
  }

  const nutData = nutritionQuery.data
  const activePlan = nutData?.active_plan?.plan_detail ?? null
  const assignment = nutData?.active_plan ?? null
  const completedWeeks: number = nutData?.completed_weeks ?? 0
  const scheduledPlan = nutData?.scheduled_plan ?? null

  // Which plan is currently being edited
  const editingPlan = editingScheduled
    ? (scheduledPlanQuery.data ?? null)
    : activePlan

  if (!activePlan) {
    return (
      <>
        {/* Scheduled plan banner (even when no active plan) */}
        {scheduledPlan && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-4">
            <CalendarClock className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800">Próxima semana programada</p>
              <p className="text-xs text-blue-600 mt-0.5 truncate">
                <span className="font-medium">{scheduledPlan.plan_name}</span> · inicia el {fmtDate(scheduledPlan.start_date)}
              </p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Sin plan nutricional activo</p>
            <p className="text-xs text-slate-400 mt-1">
              {scheduledPlan ? 'El plan programado se activará automáticamente en su fecha.' : 'Asigna un plan para comenzar a construirlo.'}
            </p>
          </div>
          {!scheduledPlan && (
            <Button onClick={() => setAssignModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Asignar plan nutricional
            </Button>
          )}
        </div>
        {assignModalOpen && (
          <AssignPlanModal
            athleteId={athleteId}
            gymId={gymId}
            onAssigned={refresh}
            onClose={() => setAssignModalOpen(false)}
          />
        )}
      </>
    )
  }

  const currentPlan = editingPlan ?? activePlan
  const mealsByDay: Record<string, any[]> = currentPlan?.meals_by_day || {}
  const addedWeekdays = WEEKDAY_ORDER.filter(d => mealsByDay[d] && mealsByDay[d].length > 0)
  const remainingWeekdays = WEEKDAY_ORDER.filter(d => !addedWeekdays.includes(d))

  const effectiveKey = addedWeekdays.includes(String(selectedDay))
    ? String(selectedDay)
    : (addedWeekdays[0] ?? '')
  const dayMeals: any[] = mealsByDay[effectiveKey] || []

  const handleAddDay = async (weekday: string) => {
    setAddingDay(true)
    try {
      await api.post(`/api/nutrition/plans/${currentPlan.id}/add_day/`, { weekday })
      setSelectedDay(weekday as any)
      setAddDayOpen(false)
      if (editingScheduled) scheduledPlanQuery.refetch()
      else refresh()
      showSuccess(`${WEEKDAY_LABELS[weekday]} agregado`)
    } catch (err) { showError(err, 'Error al agregar día') }
    finally { setAddingDay(false) }
  }

  const handleRemoveDay = async () => {
    setRemovingDay(true)
    try {
      await api.post(`/api/nutrition/plans/${currentPlan.id}/remove_day/`, { weekday: effectiveKey })
      const remaining = addedWeekdays.filter(d => d !== effectiveKey)
      setSelectedDay(remaining[0] as any ?? '')
      setRemoveDayConfirm(false)
      if (editingScheduled) scheduledPlanQuery.refetch()
      else refresh()
      showSuccess('Día eliminado')
    } catch (err) { showError(err, 'Error al eliminar día') }
    finally { setRemovingDay(false) }
  }

  // Totales del día (desde food_items)
  const allItems = dayMeals.flatMap((m: any) => m.food_items || [])
  const totalCal = allItems.reduce((s: number, i: any) => s + parseFloat(i.calories || 0), 0)
  const totalP   = allItems.reduce((s: number, i: any) => s + parseFloat(i.protein_g || 0), 0)
  const totalC   = allItems.reduce((s: number, i: any) => s + parseFloat(i.carbs_g || 0), 0)
  const totalG   = allItems.reduce((s: number, i: any) => s + parseFloat(i.fats_g || 0), 0)
  const targetCal = currentPlan?.calories_per_day || 0

  const weekLogs: any[] = weekLogsQuery.data?.logs ?? []
  const weekSummary     = weekLogsQuery.data?.summary
  const assignmentId    = weekLogsQuery.data?.assignment_id ?? assignment?.id

  const pendingPhotos = weekLogs.filter(
    (l: any) => l.photo_url && l.nutritionist_approved === null
  ).length

  // Agrupar logs por fecha
  const logsByDate: Record<string, any[]> = {}
  for (const log of weekLogs) {
    if (!logsByDate[log.date]) logsByDate[log.date] = []
    logsByDate[log.date].push(log)
  }

  return (
    <div className="space-y-4">

      {/* Tabs internas: Plan / Evidencias */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Plan switcher: semana actual vs siguiente */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => { setEditingScheduled(false); setInnerTab('plan'); setSelectedDay(1) }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !editingScheduled && innerTab === 'plan' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Esta semana
          </button>
          {scheduledPlan && (
            <button
              onClick={() => { setEditingScheduled(true); setInnerTab('plan'); setSelectedDay(1) }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                editingScheduled ? 'bg-blue-600 shadow-sm text-white' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Siguiente semana
            </button>
          )}
          {!editingScheduled && (
            <button onClick={() => setInnerTab('logs')}
              className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                innerTab === 'logs' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Evidencias
              {pendingPhotos > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {pendingPhotos}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Semanas completadas */}
        {completedWeeks > 0 && !editingScheduled && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
            <Flame className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">
              Semana {completedWeeks + 1} <span className="font-normal text-emerald-500">de cumplimiento</span>
            </span>
          </div>
        )}

        {/* Botón programar siguiente semana (cuando no hay scheduled) */}
        {!scheduledPlan && !editingScheduled && (
          <button
            onClick={() => setAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Programar siguiente semana
          </button>
        )}

        {/* Botón aprobar semana (solo cuando edita la semana actual) */}
        {assignment && !editingScheduled && (
          <button
            onClick={() => setApproveConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            Aprobar semana · +{activePlan.points_reward ?? 0} pts
          </button>
        )}

        {/* Banner cuando edita el plan programado */}
        {editingScheduled && scheduledPlan && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <CalendarClock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            {editingScheduledDate ? (
              <>
                <input
                  type="date"
                  defaultValue={scheduledPlan.start_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setScheduledDateInput(e.target.value)}
                  className="text-xs border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (scheduledDateInput)
                      updateScheduledDateMutation.mutate({ assignmentId: scheduledPlan.id, start_date: scheduledDateInput })
                  }}
                  className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={updateScheduledDateMutation.isPending || !scheduledDateInput}
                >
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingScheduledDate(false)} className="p-1 rounded-lg hover:bg-blue-100">
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <span>Inicia el <strong>{fmtDate(scheduledPlan.start_date)}</strong></span>
                <button
                  onClick={() => { setScheduledDateInput(scheduledPlan.start_date); setEditingScheduledDate(true) }}
                  className="p-1 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Cambiar fecha"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── TAB: Evidencias de la semana ── */}
      {innerTab === 'logs' && (
        <div className="space-y-4">
          {weekLogsQuery.isLoading && (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          )}

          {!weekLogsQuery.isLoading && weekLogs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center">
              <p className="text-sm text-slate-400">El atleta aún no ha registrado comidas esta semana.</p>
            </div>
          )}

          {weekSummary && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Registradas', value: weekSummary.completed, color: 'text-slate-700' },
                { label: 'Con foto', value: weekSummary.with_photo, color: 'text-blue-600' },
                { label: 'Aprobadas', value: weekSummary.approved, color: 'text-emerald-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {Object.entries(logsByDate).sort(([a], [b]) => a < b ? -1 : 1).map(([date, logs]) => (
            <div key={date} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-600">
                  {new Date(date + 'T12:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Foto thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                      {log.photo_url ? (
                        <button onClick={() => setLightbox(log.photo_url)} className="w-full h-full">
                          <img src={log.photo_url} alt="evidencia" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                        </button>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{log.meal_name}</p>
                      <p className="text-xs text-slate-400">{MEAL_TYPE_LABELS[log.meal_type] ?? log.meal_type}</p>
                    </div>

                    {/* Estado aprobación */}
                    {log.photo_url && (
                      <div className="flex items-center gap-1.5">
                        {log.nutritionist_approved === true && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Aprobado
                          </span>
                        )}
                        {log.nutritionist_approved === false && (
                          <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Rechazado
                          </span>
                        )}
                        {log.nutritionist_approved === null && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => reviewMutation.mutate({ logId: log.id, approved: true })}
                              disabled={reviewMutation.isPending}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Aprobar"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => reviewMutation.mutate({ logId: log.id, approved: false })}
                              disabled={reviewMutation.isPending}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                              title="Rechazar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Editor del plan ── */}
      {innerTab === 'plan' && (
      <div className="flex gap-5">
      {/* Panel izquierdo — plan */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Selector de días + añadir/eliminar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {addedWeekdays.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day as any)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                effectiveKey === day
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {WEEKDAY_LABELS[day]}
            </button>
          ))}

          {/* Botón añadir día */}
          {remainingWeekdays.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setAddDayOpen(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all"
              >
                <Plus className="w-3 h-3" /> Añadir día
              </button>
              {addDayOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 min-w-[130px] overflow-hidden">
                  {remainingWeekdays.map(d => (
                    <button
                      key={d}
                      disabled={addingDay}
                      onClick={() => handleAddDay(d)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-1.5"
                    >
                      {addingDay ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {WEEKDAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botón eliminar día actual */}
          {effectiveKey && (
            <button
              onClick={() => setRemoveDayConfirm(true)}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-3 h-3" /> Eliminar {WEEKDAY_LABELS[effectiveKey]}
            </button>
          )}
        </div>

        {/* Comidas del día */}
        {addedWeekdays.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <UtensilsCrossed className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin días configurados</p>
            <p className="text-xs text-slate-300 mt-1">Haz clic en "Añadir día" para comenzar.</p>
          </div>
        ) : dayMeals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 py-10 text-center">
            <p className="text-sm text-slate-400">Sin comidas para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayMeals.map((meal: any) => (
              <MealBlock key={meal.id} meal={meal} gymId={gymId} onRefresh={editingScheduled ? () => scheduledPlanQuery.refetch() : refresh} />
            ))}
          </div>
        )}

        <button
          onClick={() => setAssignModalOpen(true)}
          className="text-xs text-slate-400 hover:text-emerald-600 transition-colors hover:underline underline-offset-2"
        >
          Cambiar plan nutricional
        </button>

        {/* Confirm remove day */}
        <Dialog open={removeDayConfirm} onOpenChange={setRemoveDayConfirm}>
          <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>¿Eliminar {WEEKDAY_LABELS[effectiveKey]}?</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-500">Se eliminarán todas las comidas y alimentos del {WEEKDAY_LABELS[effectiveKey]}.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveDayConfirm(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRemoveDay} disabled={removingDay}>
                {removingDay ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Panel derecho — análisis */}
      <div className="w-56 shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4 sticky top-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Análisis del día</p>

          {/* Energía con barra */}
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs text-slate-500">Energía</span>
              <span className="text-xs font-bold text-slate-700">
                {totalCal.toFixed(0)}<span className="text-slate-400 font-normal">/{targetCal} kcal</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${Math.min((totalCal / (targetCal || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Macros */}
          {[
            { label: 'Grasa', value: totalG, target: currentPlan?.fats_g, color: 'bg-yellow-400', unit: 'g' },
            { label: 'H. Carbono', value: totalC, target: currentPlan?.carbs_g, color: 'bg-red-400', unit: 'g' },
            { label: 'Proteína', value: totalP, target: currentPlan?.protein_g, color: 'bg-blue-400', unit: 'g' },
          ].map(({ label, value, target, color, unit }) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs font-bold text-slate-700">
                  {value.toFixed(1)}<span className="text-slate-400 font-normal">/{target}{unit}</span>
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all`}
                  style={{ width: `${Math.min((value / (target || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}

          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">
              {editingScheduled
                ? `Inicia ${fmtDate(scheduledPlan?.start_date)}`
                : `Desde ${fmtDate(assignment?.start_date)}`}
            </p>
          </div>
        </div>
      </div>

      </div>
      )} {/* end innerTab === 'plan' */}

      {/* Modal confirmar aprobar semana */}
      <Dialog open={approveConfirm} onOpenChange={setApproveConfirm}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>¿Aprobar semana?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Se otorgarán <span className="font-bold text-emerald-700">{activePlan.points_reward} puntos</span> al atleta
            y el plan se marcará como completado. Podrás asignar uno nuevo después.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveConfirm(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveWeekMutation.isPending}
              onClick={() => assignmentId && approveWeekMutation.mutate(assignmentId)}
            >
              {approveWeekMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Aprobar y otorgar puntos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox fotos */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Evidencia" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
        </div>
      )}

      {assignModalOpen && (
        <AssignPlanModal
          athleteId={athleteId}
          gymId={gymId}
          hasActivePlan={!!activePlan}
          onAssigned={refresh}
          onClose={() => setAssignModalOpen(false)}
        />
      )}
    </div>
  )
}

function nextMonday(): string {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + daysUntilMonday)
  return d.toISOString().split('T')[0]
}

function AssignPlanModal({ onClose, athleteId, gymId, onAssigned, hasActivePlan = false }: {
  onClose: () => void; athleteId: string; gymId: string; onAssigned: () => void; hasActivePlan?: boolean
}) {
  const [tab, setTab]           = useState<'existing' | 'new'>('existing')
  const [selectedPlanId, setSel] = useState('')
  const [startDate, setStartDate] = useState(hasActivePlan ? nextMonday() : new Date().toISOString().split('T')[0])
  // New plan fields
  const [newName, setNewName]           = useState('')
  const [newPoints, setNewPoints]       = useState('100')
  const [newCal, setNewCal]             = useState('2000')
  const [newDuration, setNewDuration]   = useState('7')

  const today = new Date().toISOString().split('T')[0]
  const isScheduled = startDate > today

  const plansQuery = useQuery({
    queryKey: ['nutrition-plans-list', gymId],
    queryFn: async () => {
      const res = await api.get<any>('/api/nutrition/plans/')
      return Array.isArray(res) ? res : (res?.results ?? [])
    },
  })

  const assignMutation = useMutation({
    mutationFn: (planId: string) => api.post('/api/nutrition/assignments/', {
      user: athleteId, plan: planId, start_date: startDate,
    }),
    onSuccess: () => {
      showSuccess(isScheduled ? 'Plan programado para ' + startDate : 'Plan asignado')
      onAssigned(); onClose()
    },
    onError: (err) => showError(err, 'Error al asignar el plan'),
  })

  const createAndAssignMutation = useMutation({
    mutationFn: async () => {
      const plan = await api.post<any>('/api/nutrition/plans/', {
        name: newName,
        points_reward: parseInt(newPoints) || 100,
        calories_per_day: parseInt(newCal) || 2000,
        duration_days: parseInt(newDuration) || 7,
        status: 'active',
        created_for: athleteId,
      })
      await api.post('/api/nutrition/assignments/', {
        user: athleteId, plan: plan.id, start_date: startDate,
      })
    },
    onSuccess: () => {
      showSuccess(isScheduled ? 'Plan creado y programado' : 'Plan creado y asignado')
      onAssigned(); onClose()
    },
    onError: (err) => showError(err, 'Error al crear el plan'),
  })

  const saving = assignMutation.isPending || createAndAssignMutation.isPending

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Asignar plan nutricional</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mt-1">
          {(['existing', 'new'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'existing' ? 'Plan existente' : 'Crear nuevo plan'}
            </button>
          ))}
        </div>

        <div className="space-y-4 mt-1">
          {/* Date picker */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={e => setStartDate(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {isScheduled ? (
              <p className="mt-1 text-xs text-blue-600 font-medium">
                El plan se activará automáticamente el {startDate}
              </p>
            ) : (
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                El plan iniciará hoy
              </p>
            )}
          </div>

          {tab === 'existing' ? (
            plansQuery.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {(plansQuery.data ?? []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSel(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedPlanId === p.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.calories_per_day} kcal/día · {p.duration_days} días · <span className="text-amber-600 font-medium">{p.points_reward} pts</span>
                    </p>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre del plan</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Plan pérdida de peso semana 2"
                  className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Puntos</label>
                  <input type="number" value={newPoints} onChange={e => setNewPoints(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kcal/día</label>
                  <input type="number" value={newCal} onChange={e => setNewCal(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Días</label>
                  <input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400">Después de crear el plan podrás agregar los días y comidas desde el editor.</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className={`flex-1 ${isScheduled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              disabled={saving || (tab === 'existing' && !selectedPlanId) || (tab === 'new' && !newName.trim())}
              onClick={() => tab === 'existing' ? assignMutation.mutate(selectedPlanId) : createAndAssignMutation.mutate()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isScheduled
                ? (tab === 'existing' ? 'Programar' : 'Crear y programar')
                : (tab === 'existing' ? 'Asignar' : 'Crear y asignar')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab: Medidas ─────────────────────────────────────────────────────────────

function MeasurementsTab({ measurements }: { measurements: any[] }) {
  if (!measurements || measurements.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
          <Ruler className="w-7 h-7 text-slate-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">Sin medidas registradas</p>
          <p className="text-xs text-slate-400 mt-1">Registra las primeras medidas desde la agenda.</p>
        </div>
      </div>
    )
  }

  const latest = measurements[0]
  const statItems = [
    { label: 'Peso', value: fmt(latest.weight_kg, ' kg') },
    { label: 'Talla', value: fmt(latest.height_cm, ' cm') },
    { label: 'IMC', value: fmt(latest.bmi) },
    { label: '% Grasa', value: fmt(latest.body_fat_pct, '%') },
    { label: 'Masa muscular', value: fmt(latest.muscle_mass_kg, ' kg') },
    { label: 'Cintura', value: fmt(latest.waist_cm, ' cm') },
    { label: 'Cadera', value: fmt(latest.hip_cm, ' cm') },
    { label: 'Brazo', value: fmt(latest.arm_cm, ' cm') },
    { label: 'Grasa visceral', value: fmt(latest.visceral_fat) },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">Última medición</CardTitle>
            <span className="text-xs text-slate-400">{fmtDate(latest.measured_at)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-3 gap-3">
            {statItems.map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wide">{label}</p>
                <p className="font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          {latest.notes && (
            <p className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-3 italic">"{latest.notes}"</p>
          )}
        </CardContent>
      </Card>

      {measurements.length > 1 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">
              Historial <span className="text-slate-400 font-normal text-sm">({measurements.length} registros)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Fecha', 'Peso', 'IMC', '% Grasa', 'Músculo', 'Cintura'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {measurements.map((m: any, i: number) => (
                    <tr key={m.id} className={`hover:bg-slate-50/80 ${i === 0 ? 'font-semibold' : ''}`}>
                      <td className="px-4 py-3 text-slate-700">{fmtDate(m.measured_at)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.weight_kg, ' kg')}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.bmi)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.body_fat_pct, '%')}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.muscle_mass_kg, ' kg')}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(m.waist_cm, ' cm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function AthleteProfilePage({ params }: { params: Promise<{ gymId: string; id: string }> }) {
  const { gymId, id } = use(params)
  const router = useRouter()
  const storedUser = getStoredUser<User>()
  const isNutritionist = storedUser?.role === 'nutritionist'
  const isAdmin = storedUser?.role === 'gym_admin' || storedUser?.role === 'super_admin'

  const { data, isLoading } = useQuery({
    queryKey: ['athlete-profile', id],
    queryFn: () => api.get<any>(`/api/gyms/athlete-profile/${id}/`),
  })

  if (isLoading) return <ProfileSkeleton />

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Atleta no encontrado</h2>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>Volver</Button>
      </div>
    )
  }

  const { athlete: a, stats: s, routine, nutrition_plan, points_history, measurements, appointments, membership_tier } = data

  const initials = `${a.first_name?.[0] || ''}${a.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="space-y-6">
      {/* Header tipo Nutrium */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{a.first_name} {a.last_name}</h1>
              <TierBadge tier={membership_tier} />
              <Badge className={`text-[10px] hidden sm:inline-flex ${a.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                {a.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">{a.email}</p>
          </div>
          {isNutritionist && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={() => router.push(`/${gymId}/panel/mensajes?athlete=${id}`)}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Mensajes</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats rápidos — solo para admin/coach */}
      {!isNutritionist && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Sesiones semana', value: s.sessions_week, sub: `${s.sessions_month} este mes`, icon: Dumbbell, color: 'bg-blue-100 text-blue-600' },
            { label: 'Comidas (7d)', value: s.meals_week, sub: `${s.meals_today} hoy`, icon: Apple, color: 'bg-amber-100 text-amber-600' },
            { label: 'Retos activos', value: s.active_challenges, sub: 'En progreso', icon: Target, color: 'bg-indigo-100 text-indigo-600' },
            { label: 'Insignias', value: s.badges_earned, sub: 'Logros', icon: Award, color: 'bg-rose-100 text-rose-600' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="p-5 text-center">
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-[10px] text-slate-400">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      {isNutritionist ? (
        // Vista nutricionista — tabs dedicados
        <Tabs defaultValue="plan">
          <TabsList className="bg-slate-100 rounded-xl p-1 h-auto w-full grid grid-cols-4">
            <TabsTrigger value="info" className="rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Info
            </TabsTrigger>
            <TabsTrigger value="medidas" className="rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Medidas
            </TabsTrigger>
            <TabsTrigger value="plan" className="rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <span className="hidden sm:inline">Plan de Alimentación</span>
              <span className="sm:hidden">Nutrición</span>
            </TabsTrigger>
            <TabsTrigger value="citas" className="rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Citas
            </TabsTrigger>
          </TabsList>

          {/* Info */}
          <TabsContent value="info" className="mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6 grid grid-cols-2 gap-5">
                {[
                  { label: 'DNI', value: a.dni },
                  { label: 'Celular', value: a.phone },
                  { label: 'Miembro desde', value: fmtDate(a.date_joined) },
                  { label: 'Nivel', value: `Nivel ${a.nivel}` },
                  { label: 'Objetivo fitness', value: a.fitness_goal?.replace(/_/g, ' ') },
                  { label: 'Check-ins totales', value: s.checkins_total },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{value || '—'}</p>
                  </div>
                ))}
                {a.goal_notes && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Notas del atleta</p>
                    <p className="text-sm text-slate-600 mt-0.5 italic">"{a.goal_notes}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medidas */}
          <TabsContent value="medidas" className="mt-4">
            <MeasurementsTab measurements={measurements || []} />
          </TabsContent>

          {/* Plan de Alimentación */}
          <TabsContent value="plan" className="mt-4">
            <NutritionPlanTab athleteId={id} gymId={gymId} membership_tier={membership_tier} />
          </TabsContent>

          {/* Citas */}
          <TabsContent value="citas" className="mt-4">
            {appointments && appointments.length > 0 ? (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Historial de citas <span className="text-slate-400 font-normal text-sm">({appointments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-50">
                  {appointments.map((apt: any) => (
                    <div key={apt.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {apt.status === 'completed'
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Clock className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{apt.appointment_type_display || apt.appointment_type}</p>
                          <p className="text-xs text-slate-500">{fmtDateTime(apt.scheduled_at)} · {apt.duration_minutes} min</p>
                        </div>
                      </div>
                      <AppointmentStatusBadge status={apt.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-center">
                <Calendar className="w-10 h-10 text-slate-200" />
                <p className="text-sm text-slate-500">Sin citas registradas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        // Vista admin/coach — tabs originales
        <Tabs defaultValue="general">
          <TabsList className="bg-slate-100 rounded-xl p-1 h-auto">
            <TabsTrigger value="general" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              General
            </TabsTrigger>
            <TabsTrigger value="nutricion" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Nutrición
            </TabsTrigger>
            <TabsTrigger value="puntos" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Puntos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold text-slate-800">Información personal</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2 gap-4">
                  {[
                    { label: 'DNI', value: a.dni },
                    { label: 'Celular', value: a.phone },
                    { label: 'Miembro desde', value: fmtDate(a.date_joined) },
                    { label: 'Check-ins totales', value: s.checkins_total },
                    { label: 'Check-ins este mes', value: s.checkins_month },
                    { label: 'Nivel', value: `Nivel ${a.nivel}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="font-medium text-slate-700 mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold text-slate-800">Staff asignado</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {data.coach ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Coach</p>
                        <p className="font-semibold text-slate-800">{data.coach.name}</p>
                      </div>
                    </div>
                  ) : <p className="text-sm text-slate-400">Sin coach asignado</p>}
                  {data.nutritionist ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Apple className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Nutricionista</p>
                        <p className="font-semibold text-slate-800">{data.nutritionist.name}</p>
                      </div>
                    </div>
                  ) : <p className="text-sm text-slate-400">Sin nutricionista asignado</p>}
                </CardContent>
              </Card>
            </div>

            {nutrition_plan && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Apple className="w-5 h-5 text-amber-600" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-800">Plan Nutricional Activo</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="font-bold text-slate-900">{nutrition_plan.name}</p>
                  <p className="text-sm text-slate-500 mb-3">Inicio: {fmtDate(nutrition_plan.start_date)}</p>
                  <Progress value={nutrition_plan.compliance_percentage} className="h-2" />
                  <p className="text-xs text-slate-400 mt-1">{nutrition_plan.compliance_percentage}% cumplimiento</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nutricion" className="mt-4">
            <MeasurementsTab measurements={measurements || []} />
          </TabsContent>

          <TabsContent value="puntos" className="mt-4">
            {points_history && points_history.length > 0 ? (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-800">Historial de Puntos</CardTitle>
                      <CardDescription>Total: {s.total_points_earned} pts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          {['Fecha', 'Descripción', 'Fuente', 'Puntos'].map(h => (
                            <th key={h} className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase last:text-right">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {points_history.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4 text-sm text-slate-600">{fmtDate(p.created_at)}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.description || '—'}</td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-[10px] capitalize border-slate-200 text-slate-500">
                                {p.source?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">+{p.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400">
                  <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Sin historial de puntos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
