'use client'

import { useEffect, useRef, useState, use } from 'react'
import { UtensilsCrossed, Loader2, Target } from 'lucide-react'
import { startOfWeek } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { NutritionPlan, UserNutritionPlan } from '@/lib/types'
import { showError } from '@/lib/toast'
import MealLogger, { type MealLogEntry } from '@/components/nutrition/MealLogger'
import { useSubscriptionTier } from '@/lib/hooks'
import WeekSelector from '@/components/shared/WeekSelector'
import StreakBar from '@/components/shared/StreakBar'
import WeeklyMiniCalendar from '@/components/shared/WeeklyMiniCalendar'
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

type WeeklyCompliance = {
  daily: ({ total: number; compliance_pct: number } | null)[]
  avg_compliance: number
  perfect_week: boolean
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MiNutricionPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const { tier }  = useSubscriptionTier()
  const isBasic   = tier !== 'premium'

  const [assignment, setAssignment]   = useState<UserNutritionPlan | null>(null)
  const [plan, setPlan]               = useState<NutritionPlan | null>(null)
  const [logs, setLogs]               = useState<MealLogEntry[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [streakDays, setStreakDays]   = useState(0)
  const [multiplier, setMultiplier]   = useState(1.0)
  const [pointsYesterday, setPointsYesterday] = useState<number | null>(null)
  const [weekly, setWeekly]           = useState<WeeklyCompliance | null>(null)

  const todayWeekday    = JS_DAY_TO_WEEKDAY[new Date().getDay()]
  const today           = new Date().toISOString().split('T')[0]
  const yesterday       = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] })()

  const [selectedWeekday,   setSelectedWeekday]   = useState<string>(todayWeekday)
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const wasFullyLoggedRef = useRef(false)
  const planRef = useRef<NutritionPlan | null>(null)

  // ── Fetches ──────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const assignmentRes = await api.get<UserNutritionPlan>('/api/nutrition/assignments/my_active/')
      setAssignment(assignmentRes)

      let loadedPlan: NutritionPlan | null = null
      if (assignmentRes.plan_detail) {
        loadedPlan = assignmentRes.plan_detail as NutritionPlan
      } else if (assignmentRes.plan) {
        loadedPlan = await api.get<NutritionPlan>(`/api/nutrition/plans/${assignmentRes.plan}/`)
      }
      setPlan(loadedPlan)
      planRef.current = loadedPlan

      await Promise.all([fetchLogs(false), fetchGamification(), fetchWeekly()])
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
      if (checkAchievement) maybeToastAchievement(mapped)
    } catch (err) {
      showError(err, 'Error al cargar registros')
    }
  }

  const fetchGamification = async () => {
    try {
      const streakRes = await api.get<any>('/api/gamification/my-streak/', { params: { gym: gymId } })
      setStreakDays(streakRes.current_streak ?? 0)

      const awardRes = await api.post<any>('/api/nutrition/meal-logs/award_daily/', { date: yesterday })
      if (awardRes.awarded && awardRes.points_awarded) setPointsYesterday(awardRes.points_awarded)
      if (awardRes.multiplier) setMultiplier(awardRes.multiplier)
    } catch { /* non-critical */ }
  }

  const fetchWeekly = async () => {
    try {
      const res = await api.get<WeeklyCompliance>('/api/nutrition/meal-logs/weekly_compliance/')
      setWeekly(res)
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchData() }, [])

  // ── Achievement toast ─────────────────────────────────────────────────────

  const maybeToastAchievement = (currentLogs: MealLogEntry[]) => {
    const currentPlan = planRef.current
    const todayMealIds: string[] = currentPlan
      ? Object.values((currentPlan as any).meals_by_day ?? {}).flat().map((m: any) => m.id)
      : []
    if (todayMealIds.length === 0) return

    const loggedIds = new Set(currentLogs.map(l => l.meal_template))
    const allCompleted = todayMealIds.every(
      id => currentLogs.find(l => l.meal_template === id)?.status === 'completed',
    )
    if (allCompleted && todayMealIds.every(id => loggedIds.has(id)) && !wasFullyLoggedRef.current) {
      wasFullyLoggedRef.current = true
      const pts = multiplier > 1 ? `+${Math.round(15 * multiplier)} pts (×${multiplier})` : '+15 pts'
      toast.success(`¡Día perfecto! ${pts}`, {
        description: 'Completaste todas las comidas del día.',
        duration: 5000,
      })
      fetchWeekly()
    } else if (!allCompleted) {
      wasFullyLoggedRef.current = false
    }
  }

  const handleRefresh = () => fetchLogs(true)

  // ── Derived ───────────────────────────────────────────────────────────────

  const mealsByDay: Record<string, any[]> = (plan as any)?.meals_by_day ?? {}
  const addedWeekdays = WEEKDAYS.filter(d => mealsByDay[d.value]?.length > 0)
  const dayMeals: any[] = mealsByDay[selectedWeekday] ?? []

  const completedToday = logs.filter(l => l.status === 'completed').length
  const totalLoggable  = dayMeals.length
  const progressPct    = totalLoggable > 0 ? Math.round((completedToday / totalLoggable) * 100) : 0

  const dayItems = dayMeals.flatMap(m => (m.food_items ?? []))
  const dayTotals = {
    cal:   dayItems.reduce((s: number, i: any) => s + parseFloat(i.calories  ?? 0), 0),
    prot:  dayItems.reduce((s: number, i: any) => s + parseFloat(i.protein_g ?? 0), 0),
    carbs: dayItems.reduce((s: number, i: any) => s + parseFloat(i.carbs_g   ?? 0), 0),
    fats:  dayItems.reduce((s: number, i: any) => s + parseFloat(i.fats_g    ?? 0), 0),
  }

  // Build dailyCompliance array (Mon→Sun) for WeeklyMiniCalendar
  const dailyComplianceForCalendar = weekly
    ? (() => {
        const today_ = new Date()
        return WEEKDAYS.map(d => {
          const entry = weekly.daily.find((_, i) => {
            const dt = new Date(today_)
            dt.setDate(today_.getDate() - (6 - i))
            return JS_DAY_TO_WEEKDAY[dt.getDay()] === d.value
          })
          if (!entry) return null
          return { weekday: d.value, compliance_pct: entry.compliance_pct, total: entry.total }
        })
      })()
    : []

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
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-12 text-center">
          <UtensilsCrossed className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Sin plan activo</h3>
          <p className="text-slate-500 mt-1">
            {isBasic
              ? 'Con el Plan Básico puedes solicitar un plan general a tu gimnasio.'
              : 'Tu nutricionista aún no te ha asignado un plan nutricional.'}
          </p>
          {isBasic && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left max-w-sm mx-auto">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consejos generales</p>
              <ul className="text-sm text-slate-600 space-y-1">
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

  const selectedLabel = WEEKDAYS.find(d => d.value === selectedWeekday)?.label ?? selectedWeekday

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
          <p className="text-slate-500 mt-0.5">{plan.name}</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 border-none font-medium shrink-0">
          {completedToday} / {totalLoggable} comidas hoy
        </Badge>
      </div>

      {/* Week selector */}
      <WeekSelector
        currentWeekStart={selectedWeekStart}
        onChange={w => setSelectedWeekStart(w)}
      />

      {/* Streak bar */}
      <StreakBar streakDays={streakDays} multiplier={multiplier} pointsYesterday={pointsYesterday} />

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-500" /> Progreso del día
          </span>
          <span className="text-xs font-bold text-emerald-700">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
      </div>

      {/* Weekly mini calendar */}
      {weekly && (
        <WeeklyMiniCalendar
          dailyCompliance={dailyComplianceForCalendar}
          todayWeekday={todayWeekday}
          avgCompliance={weekly.avg_compliance}
          perfectWeek={weekly.perfect_week}
        />
      )}

      {/* Weekday tabs */}
      {addedWeekdays.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {addedWeekdays.map(d => {
            const isToday    = d.value === todayWeekday
            const isSelected = d.value === selectedWeekday
            return (
              <button
                key={d.value}
                onClick={() => setSelectedWeekday(d.value)}
                className={[
                  'shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border text-xs font-semibold transition-all',
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-5">
        {/* Meal list */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">
            Comidas del {selectedLabel}
            {selectedWeekday === todayWeekday && (
              <span className="ml-2 text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Hoy</span>
            )}
          </h2>
          {dayMeals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
              <UtensilsCrossed className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin comidas para {selectedLabel}</p>
            </div>
          ) : (
            <MealLogger meals={dayMeals} date={today} onRefresh={handleRefresh} logs={logs} />
          )}
        </div>

        {/* Macro sidebar */}
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
