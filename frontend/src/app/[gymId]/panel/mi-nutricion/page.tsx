'use client'

import { useEffect, useRef, useState, use } from 'react'
import { UtensilsCrossed, Loader2, AlertTriangle, Flame, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { api } from '@/lib/api'
import type { NutritionPlan, UserNutritionPlan } from '@/lib/types'
import { showError } from '@/lib/toast'
import MealLogger, { type MealLogEntry } from '@/components/nutrition/MealLogger'
import { useSubscriptionTier } from '@/lib/hooks'
import MacroProgress from '@/components/shared/MacroProgress'

// ── Constants ──────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { value: 'monday',    short: 'Lun', label: 'Lunes' },
  { value: 'tuesday',   short: 'Mar', label: 'Martes' },
  { value: 'wednesday', short: 'Mié', label: 'Miércoles' },
  { value: 'thursday',  short: 'Jue', label: 'Jueves' },
  { value: 'friday',    short: 'Vie', label: 'Viernes' },
  { value: 'saturday',  short: 'Sáb', label: 'Sábado' },
  { value: 'sunday',    short: 'Dom', label: 'Domingo' },
]

const JS_DAY_TO_WEEKDAY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

// ── Page ───────────────────────────────────────────────────────────────────

export default function MiNutricionPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const { tier }  = useSubscriptionTier()
  const isBasic   = tier !== 'premium'

  const [assignment, setAssignment] = useState<UserNutritionPlan | null>(null)
  const [plan, setPlan]             = useState<NutritionPlan | null>(null)
  const [logs, setLogs]             = useState<MealLogEntry[]>([])
  const [isLoading, setIsLoading]   = useState(true)

  const todayWeekday = JS_DAY_TO_WEEKDAY[new Date().getDay()]
  const today        = new Date().toISOString().split('T')[0]

  const [selectedWeekday, setSelectedWeekday] = useState<string>(todayWeekday)

  const wasFullyLoggedRef = useRef(false)
  const planRef           = useRef<NutritionPlan | null>(null)

  // ── Fetches ──────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const assignmentRes = await api.get<any>('/api/nutrition/assignments/my_active/')
      setAssignment(assignmentRes)

      let loadedPlan: NutritionPlan | null = null
      if (assignmentRes.plan_detail) {
        loadedPlan = assignmentRes.plan_detail as NutritionPlan
      } else if (assignmentRes.plan) {
        loadedPlan = await api.get<NutritionPlan>(`/api/nutrition/plans/${assignmentRes.plan}/`)
      }
      setPlan(loadedPlan)
      planRef.current = loadedPlan

      await fetchLogs(false)
    } catch {
      setAssignment(null)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLogs = async (checkAchievement = false) => {
    try {
      const res = await api.get<any>('/api/nutrition/meal-logs/', { params: { date: today } })
      const arr: any[] = Array.isArray(res) ? res : res?.results ?? []
      const mapped = arr.map(l => ({
        id:                    l.id,
        meal_template:         l.meal_template,
        status:                l.status ?? (l.completed ? 'completed' : null),
        alternative_food_text: l.alternative_food_text ?? '',
        photo_url:             l.photo_url ?? null,
        nutritionist_approved: l.nutritionist_approved ?? null,
        nutritionist_notes:    l.nutritionist_notes ?? '',
      })).filter(l => l.status) as MealLogEntry[]
      setLogs(mapped)
      if (checkAchievement) maybeCheckDayCompletion(mapped)
    } catch (err) {
      showError(err, 'Error al cargar registros')
    }
  }

  useEffect(() => { fetchData() }, [])

  const maybeCheckDayCompletion = (currentLogs: MealLogEntry[]) => {
    const currentPlan = planRef.current
    if (!currentPlan) return
    const todayMealIds: string[] = Object.values((currentPlan as any).meals_by_day ?? {})
      .flat()
      .map((m: any) => m.id)
    if (todayMealIds.length === 0) return
    const allCompleted = todayMealIds.every(
      id => currentLogs.find(l => l.meal_template === id)?.status === 'completed',
    )
    if (allCompleted && !wasFullyLoggedRef.current) {
      wasFullyLoggedRef.current = true
    } else if (!allCompleted) {
      wasFullyLoggedRef.current = false
    }
  }

  const handleRefresh = () => fetchLogs(true)

  // ── Derived ───────────────────────────────────────────────────────────────

  const mealsByDay: Record<string, any[]> = (plan as any)?.meals_by_day ?? {}
  const addedWeekdays = WEEKDAYS.filter(d => mealsByDay[d.value]?.length > 0)

  const effectiveDay = addedWeekdays.find(d => d.value === selectedWeekday)
    ? selectedWeekday
    : (addedWeekdays[0]?.value ?? todayWeekday)

  const dayMeals: any[] = mealsByDay[effectiveDay] ?? []
  const selectedLabel   = WEEKDAYS.find(d => d.value === effectiveDay)?.label ?? effectiveDay

  const completedToday = logs.filter(l => l.status === 'completed').length
  const totalLoggable  = dayMeals.length
  const progressPct    = totalLoggable > 0 ? Math.min(Math.round((completedToday / totalLoggable) * 100), 100) : 0

  const dayItems = dayMeals.flatMap(m => (m.food_items ?? []))
  const dayTotals = {
    cal:   dayItems.reduce((s: number, i: any) => s + parseFloat(i.calories  ?? 0), 0),
    prot:  dayItems.reduce((s: number, i: any) => s + parseFloat(i.protein_g ?? 0), 0),
    carbs: dayItems.reduce((s: number, i: any) => s + parseFloat(i.carbs_g   ?? 0), 0),
    fats:  dayItems.reduce((s: number, i: any) => s + parseFloat(i.fats_g    ?? 0), 0),
  }

  const completedWeeks: number  = (assignment as any)?.completed_weeks ?? 0
  const rejectedCount: number   = logs.filter(l => l.nutritionist_approved === false).length
  const sinceDate = assignment?.start_date
    ? new Date(assignment.start_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  )

  if (!plan) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-12 text-center">
          <UtensilsCrossed className="w-14 h-14 mx-auto text-slate-300 mb-4" />
          <h3 className="text-base font-semibold text-slate-700">Sin plan activo</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            {isBasic
              ? 'Con el Plan Básico puedes solicitar un plan general a tu gimnasio.'
              : 'Tu nutricionista aún no te ha asignado un plan nutricional.'}
          </p>
          {isBasic && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left max-w-xs mx-auto">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consejos generales</p>
              <ul className="text-sm text-slate-600 space-y-1.5">
                <li>• Consume al menos 3 comidas principales al día</li>
                <li>• Bebe 2L de agua diarios</li>
                <li>• Incluye proteínas en cada comida</li>
                <li>• Evita ultraprocesados y azúcares añadidos</li>
              </ul>
              <p className="text-xs text-amber-600 font-medium mt-3">
                Actualiza a Premium para obtener un plan personalizado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Banner: foto rechazada */}
      {rejectedCount > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">
              {rejectedCount === 1
                ? 'Tu nutricionista rechazó 1 foto de evidencia'
                : `Tu nutricionista rechazó ${rejectedCount} fotos de evidencia`}
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              Revisa las comidas marcadas y vuelve a subir la foto correcta.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
          <p className="text-sm text-slate-500">{plan.name}</p>
          {completedWeeks > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Flame className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">
                Semana {completedWeeks + 1} de cumplimiento
              </span>
            </div>
          )}
        </div>

        {/* Progreso del día — compacto en el header */}
        {totalLoggable > 0 && (
          <div className="shrink-0 flex flex-col items-end gap-1.5 min-w-[120px]">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">
                {completedToday}/{totalLoggable} hoy
              </span>
              <span className="text-xs font-bold text-emerald-700">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5 w-[120px] bg-slate-100 [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-500" />
          </div>
        )}
      </div>

      {/* Tabs de días */}
      {addedWeekdays.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {addedWeekdays.map(d => {
            const isToday    = d.value === todayWeekday
            const isSelected = d.value === effectiveDay
            return (
              <button
                key={d.value}
                onClick={() => setSelectedWeekday(d.value)}
                className={[
                  'shrink-0 flex flex-col items-center px-5 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150',
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <span>{d.short}</span>
                {isToday && (
                  <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`}>
                    HOY
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Contenido: comidas + macros */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-5 items-start">

        {/* Lista de comidas */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            {selectedLabel}
            {effectiveDay === todayWeekday && (
              <span className="ml-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Hoy</span>
            )}
          </p>

          {dayMeals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-14 text-center">
              <UtensilsCrossed className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin comidas para {selectedLabel}</p>
            </div>
          ) : (
            <MealLogger meals={dayMeals} date={today} onRefresh={handleRefresh} logs={logs} />
          )}
        </div>

        {/* Panel de macros */}
        <MacroProgress
          title={`Análisis del ${selectedLabel}`}
          calories={{ current: dayTotals.cal,   target: plan.calories_per_day }}
          protein={  { current: dayTotals.prot,  target: plan.protein_g }}
          carbs={    { current: dayTotals.carbs, target: plan.carbs_g }}
          fats={     { current: dayTotals.fats,  target: plan.fats_g }}
          sinceDate={sinceDate}
        />
      </div>
    </div>
  )
}
