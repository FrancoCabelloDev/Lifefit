'use client'

import { useEffect, useRef, useState, use } from 'react'
import {
  UtensilsCrossed, Loader2, AlertTriangle, Flame, Target, CalendarClock,
  SendHorizonal, CheckCircle2, Lock, Clock, ChevronDown, X, Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { NutritionPlan } from '@/lib/types'
import { showError, showSuccess } from '@/lib/toast'
import MealLogger, { type MealLogEntry } from '@/components/nutrition/MealLogger'
import { useSubscriptionTier } from '@/lib/hooks'
import MacroProgress from '@/components/shared/MacroProgress'
import { useRoleGuard } from '@/hooks/useRoleGuard'

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

const WEEKDAY_ORDER: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, saturday_end: 5, sunday: 6,
}

const JS_DAY_TO_WEEKDAY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

// ── NutritionistPickerModal (Estado A → 2.5) ──────────────────────────────

function NutritionistPickerModal({
  gymId,
  onClose,
  onAssigned,
}: {
  gymId: string
  onClose: () => void
  onAssigned: () => void
}) {
  const [nutritionists, setNutritionists] = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [assigning, setAssigning]         = useState<string | null>(null)

  useEffect(() => {
    api.get<any>(`/api/gyms/nutritionists/?gym_id=${gymId}`)
      .then(res => {
        const arr = Array.isArray(res) ? res : res?.results ?? []
        setNutritionists(arr)
      })
      .catch(() => setNutritionists([]))
      .finally(() => setLoading(false))
  }, [gymId])

  const handleChoose = async (nutritionistId: string) => {
    setAssigning(nutritionistId)
    try {
      await api.post('/api/gyms/nutritionist-assignments/self_assign/', {
        nutritionist_id: nutritionistId,
      })
      showSuccess('Nutricionista asignado. Ya puedes escribirle.')
      onAssigned()
    } catch (err) {
      showError(err, 'No se pudo asignar el nutricionista')
    } finally {
      setAssigning(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-900">Elige tu nutricionista</p>
            <p className="text-xs text-slate-500 mt-0.5">Podrás cambiar de nutricionista en cualquier momento</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : nutritionists.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No hay nutricionistas disponibles en este gimnasio.</p>
            </div>
          ) : (
            nutritionists.map((n: any) => (
              <div
                key={n.id}
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  {n.photo_url ? (
                    <img src={n.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <span className="text-sm font-bold text-emerald-700">
                      {(n.first_name?.[0] ?? n.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {n.first_name && n.last_name ? `${n.first_name} ${n.last_name}` : n.email}
                  </p>
                  {n.athletes_count !== undefined && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {n.athletes_count} atleta{n.athletes_count !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Acción */}
                <button
                  onClick={() => handleChoose(n.id)}
                  disabled={!!assigning}
                  className="shrink-0 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {assigning === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Elegir'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── MiniCalendar (2.3) ─────────────────────────────────────────────────────

type DayStatus = 'completed' | 'partial' | 'pending' | 'future' | 'none'

function DayDot({ status }: { status: DayStatus }) {
  if (status === 'completed') return (
    <span className="w-2 h-2 rounded-full bg-emerald-500 block" title="Completado" />
  )
  if (status === 'partial') return (
    <span className="relative w-2 h-2 block" title="Parcial">
      <span className="absolute inset-0 rounded-full border border-emerald-500" />
      <span className="absolute inset-0 rounded-full overflow-hidden">
        <span className="absolute left-0 top-0 bottom-0 w-1/2 bg-emerald-500" />
      </span>
    </span>
  )
  if (status === 'pending') return (
    <span className="w-2 h-2 rounded-full border border-slate-300 block" title="Pendiente" />
  )
  return <span className="w-1 h-0.5 rounded-full bg-slate-200 block" title="Futuro" />
}

function MiniCalendar({
  mealsByDay,
  allWeekLogs,
  todayWeekday,
  todayOrder,
  selectedWeekday,
  onSelectDay,
}: {
  mealsByDay: Record<string, any[]>
  allWeekLogs: any[]
  todayWeekday: string
  todayOrder: number
  selectedWeekday: string
  onSelectDay: (d: string) => void
}) {
  const loggedMealIds = new Set(allWeekLogs.map((l: any) => l.meal_template))

  return (
    <div className="flex gap-1 w-full">
      {WEEKDAYS.map(d => {
        const order    = WEEKDAY_ORDER[d.value]
        const isToday  = d.value === todayWeekday
        const isFuture = order > todayOrder
        const isSelected = d.value === selectedWeekday
        const meals    = mealsByDay[d.value] ?? []
        const hasMeals = meals.length > 0

        let status: DayStatus = 'none'
        if (hasMeals) {
          if (isFuture) {
            status = 'future'
          } else {
            const mealIds = meals.map((m: any) => m.id)
            const completedCount = mealIds.filter((id: string) => loggedMealIds.has(id)).length
            if (completedCount === 0) status = 'pending'
            else if (completedCount < mealIds.length) status = 'partial'
            else status = 'completed'
          }
        } else {
          status = isFuture ? 'future' : 'none'
        }

        const canClick = hasMeals

        return (
          <button
            key={d.value}
            onClick={() => canClick && onSelectDay(d.value)}
            disabled={!canClick}
            className={[
              'flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-150',
              isSelected
                ? 'bg-emerald-600 shadow-sm'
                : isToday
                  ? 'bg-emerald-50 border border-emerald-200'
                  : canClick
                    ? 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                    : 'border border-transparent opacity-40',
            ].join(' ')}
          >
            <span className={`text-[11px] font-bold tracking-wide ${
              isSelected ? 'text-emerald-100' : isToday ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {d.short}
            </span>

            {/* Dot indicador */}
            <div className="flex items-center justify-center h-2">
              {isSelected ? (
                <span className={`w-2 h-2 rounded-full ${
                  status === 'completed' ? 'bg-white' :
                  status === 'partial'   ? 'bg-emerald-200' :
                  status === 'pending'   ? 'border-2 border-emerald-200 rounded-full' :
                  'bg-emerald-400/50'
                } block`} />
              ) : (
                <DayDot status={status} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MiNutricionPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['athlete'])
  const router    = useRouter()
  const { tier }  = useSubscriptionTier()
  const isBasic   = tier !== 'premium'

  const [assignment, setAssignment]           = useState<any | null>(null)
  const [historyChain, setHistoryChain]       = useState<any[]>([])
  const [plan, setPlan]                       = useState<NutritionPlan | null>(null)
  const [logs, setLogs]                       = useState<MealLogEntry[]>([])
  const [allWeekLogs, setAllWeekLogs]         = useState<any[]>([])
  const [isLoading, setIsLoading]             = useState(true)
  const [sendingReview, setSendingReview]     = useState(false)
  const [nutriAssignment, setNutriAssignment] = useState<any | null>(null)
  const [showNextWeek, setShowNextWeek]       = useState(false)
  const [showNutriModal, setShowNutriModal]   = useState(false)

  const todayWeekday = JS_DAY_TO_WEEKDAY[new Date().getDay()]
  const today        = new Date().toISOString().split('T')[0]
  const todayOrder   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const [selectedWeekday, setSelectedWeekday] = useState<string>(todayWeekday)

  const wasFullyLoggedRef = useRef(false)
  const planRef           = useRef<NutritionPlan | null>(null)

  // ── Fetches ──────────────────────────────────────────────────────────────

  const loadNutriAssignment = async () => {
    const res = await api.get<any>('/api/gyms/nutritionist-assignments/').catch(() => null)
    const arr = Array.isArray(res) ? res : res?.results ?? []
    setNutriAssignment(arr.find((a: any) => a.is_active) ?? null)
    return arr.find((a: any) => a.is_active) ?? null
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Always load nutritionist assignment — needed for states A and B
      await loadNutriAssignment()

      const assignmentRes = await api.get<any>('/api/nutrition/assignments/my_active/')

      // El endpoint devuelve chain aunque no haya plan activo
      const chain: any[] = assignmentRes?.chain ?? []
      setHistoryChain(chain)

      // Si hay plan activo, cargarlo normalmente
      if (assignmentRes?.id || assignmentRes?.plan) {
        setAssignment(assignmentRes)
        let loadedPlan: NutritionPlan | null = null
        if (assignmentRes.plan_detail) {
          loadedPlan = assignmentRes.plan_detail as NutritionPlan
        } else if (assignmentRes.plan) {
          loadedPlan = await api.get<NutritionPlan>(`/api/nutrition/plans/${assignmentRes.plan}/`)
        }
        setPlan(loadedPlan)
        planRef.current = loadedPlan
        await Promise.all([fetchLogs(false), fetchWeekLogs()])
      } else {
        // No hay plan activo pero puede haber historial en el chain
        setAssignment(null)
        setPlan(null)
      }
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

  const fetchWeekLogs = async () => {
    try {
      const monday = (() => {
        const d = new Date()
        const day = d.getDay() === 0 ? 6 : d.getDay() - 1
        d.setDate(d.getDate() - day)
        return d.toISOString().split('T')[0]
      })()
      const res = await api.get<any>('/api/nutrition/meal-logs/', {
        params: { date_from: monday, date_to: today },
      })
      const arr: any[] = Array.isArray(res) ? res : res?.results ?? []
      setAllWeekLogs(arr)
    } catch (err) {
      console.error('[mi-nutricion] fetchWeekLogs error:', err)
      setAllWeekLogs([])
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

  const weekNumber: number          = assignment?.week_number ?? 1
  const totalWeeks: number          = assignment?.total_weeks ?? 0
  const scheduledPlan               = assignment?.scheduled_plan ?? null
  const scheduledPlanDetail: any    = assignment?.scheduled_plan_detail ?? null
  const reviewRequestedAt           = assignment?.review_requested_at ?? null
  const isOverdue: boolean          = assignment?.is_overdue ?? false
  const weekDeadline: string | null = assignment?.week_deadline ?? null
  const rejectedCount: number       = logs.filter(l => l.nutritionist_approved === false).length
  const nutriName: string | null    = assignment?.assigned_by_name ?? nutriAssignment?.nutritionist_name ?? null

  const sinceDate = assignment?.start_date
    ? new Date(assignment.start_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined

  // Día X de Y basado en start_date del plan activo
  const planDuration = (plan?.duration_days ?? 7) || 7
  const dayInWeek = assignment?.start_date
    ? Math.min(
        Math.max(Math.floor((Date.now() - new Date(assignment.start_date).getTime()) / 86400000) + 1, 1),
        planDuration,
      )
    : null

  // Cumplimiento semanal (comidas de días pasados loggeadas)
  const loggedMealIds = new Set(allWeekLogs.map((l: any) => l.meal_template))
  const dueMealIds: string[] = addedWeekdays
    .filter(d => WEEKDAY_ORDER[d.value] <= todayOrder)
    .flatMap(d => (mealsByDay[d.value] ?? []).map((m: any) => m.id as string))

  const weekCompliancePct = dueMealIds.length > 0
    ? Math.round((dueMealIds.filter(id => loggedMealIds.has(id)).length / dueMealIds.length) * 100)
    : 0

  const missingCount  = dueMealIds.filter(id => !loggedMealIds.has(id)).length
  const canRequestReview = dueMealIds.length > 0 && missingCount === 0 && !reviewRequestedAt

  const reviewButtonTooltip = reviewRequestedAt
    ? `Enviado el ${new Date(reviewRequestedAt).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
    : missingCount > 0
      ? `Te faltan ${missingCount} comida${missingCount !== 1 ? 's' : ''} por registrar`
      : dueMealIds.length === 0
        ? 'No hay comidas asignadas esta semana aún'
        : ''

  const handleRequestReview = async () => {
    if (!assignment?.id || !canRequestReview) return
    setSendingReview(true)
    try {
      const res = await api.post<any>(`/api/nutrition/assignments/${assignment.id}/request-review/`)
      setAssignment((prev: any) => ({ ...prev, review_requested_at: res.review_requested_at }))
      showSuccess('Solicitud enviada. Tu nutricionista recibirá una notificación.')
    } catch (err) {
      showError(err, 'No se pudo enviar la solicitud')
    } finally {
      setSendingReview(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  )

  // ── Estado A — sin nutricionista ──────────────────────────────────────────

  if (!plan && !nutriAssignment) return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-10 sm:p-14 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-slate-300" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">Sin nutricionista asignado</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {isBasic
                  ? 'Actualiza a Premium para recibir un plan nutricional personalizado de un experto.'
                  : 'Elige a tu nutricionista para recibir un plan personalizado.'}
              </p>
            </div>
            {!isBasic && (
              <button
                onClick={() => setShowNutriModal(true)}
                className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
              >
                Ver nutricionistas disponibles →
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {showNutriModal && (
        <NutritionistPickerModal
          gymId={gymId}
          onClose={() => setShowNutriModal(false)}
          onAssigned={() => {
            setShowNutriModal(false)
            fetchData()
          }}
        />
      )}
    </>
  )

  // ── Estado B — nutricionista asignado, sin plan activo ──────────────────
  if (!plan) {
    const completedChain = historyChain.filter((w: any) => w.status === 'completed')
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>

        {completedChain.length > 0 ? (
          <>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CalendarClock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Tu semana actual fue completada</p>
                    <p className="text-xs text-slate-500">
                      {nutriName ? `${nutriName} te asignará el siguiente plan pronto.` : 'Tu nutricionista te asignará el siguiente plan pronto.'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {completedChain.map((w: any, i: number) => (
                    <div key={w.assignment_id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-5">S{i + 1}</span>
                        <p className="text-sm font-semibold text-slate-700">{w.plan_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{w.start_date ? new Date(w.start_date + 'T12:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : ''}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Completada</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-center">
              <button
                onClick={() => router.push(`/${gymId}/panel/mensajes-nutricionista`)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all"
              >
                <SendHorizonal className="w-4 h-4" />
                {nutriName ? `Escribir a ${nutriName}` : 'Escribir a mi nutricionista'}
              </button>
            </div>
          </>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-10 sm:p-14 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <CalendarClock className="w-8 h-8 text-blue-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-800">
                  {nutriName
                    ? `${nutriName} aún no te ha asignado un plan`
                    : 'Tu nutricionista aún no te ha asignado un plan'}
                </h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Puedes escribirle directamente para coordinar el inicio de tu programa.
                </p>
              </div>
              <button
                onClick={() => router.push(`/${gymId}/panel/mensajes-nutricionista`)}
                className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
              >
                <SendHorizonal className="w-4 h-4" />
                {nutriName ? `Escribir a ${nutriName} →` : 'Escribir a mi nutricionista →'}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ── Estado D / C — plan activo ────────────────────────────────────────────

  const hasNextWeek  = !!scheduledPlan
  const hasFullChain = totalWeeks > 0

  return (
    <div className="space-y-4">

      {/* ── Banners de alerta ─────────────────────────────────────────────── */}

      {/* Semana vencida, sin revisión */}
      {isOverdue && !reviewRequestedAt && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Tu semana venció</p>
            <p className="text-xs text-amber-700 mt-0.5">
              El plazo era el{' '}
              <span className="font-semibold">
                {weekDeadline
                  ? new Date(weekDeadline + 'T12:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
                  : '—'}
              </span>
              . Registra las comidas pendientes y envía la semana.
            </p>
          </div>
        </div>
      )}

      {/* Semana vencida + ya enviada */}
      {isOverdue && reviewRequestedAt && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-amber-800">Semana vencida — esperando aprobación del nutricionista</p>
        </div>
      )}

      {/* Semana enviada para revisión */}
      {reviewRequestedAt && !isOverdue && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Semana enviada para revisión</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Enviada el {new Date(reviewRequestedAt).toLocaleDateString('es-PE', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Fotos rechazadas */}
      {rejectedCount > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">
              {rejectedCount === 1 ? 'Tu nutricionista rechazó 1 foto' : `Tu nutricionista rechazó ${rejectedCount} fotos`}
            </p>
            <p className="text-xs text-rose-600 mt-0.5">Revisa las comidas marcadas y vuelve a subir la evidencia.</p>
          </div>
        </div>
      )}

      {/* ── Header del plan ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">

        {/* Título + badge semana */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Plan Nutricional
                {hasFullChain
                  ? ` — Semana ${weekNumber} de ${totalWeeks}`
                  : ` — Semana ${weekNumber} de ?`}
              </h1>
            </div>
            <p className="text-sm text-slate-400 truncate">{plan.name}</p>
          </div>

          {/* Botón enviar semana */}
          <div className="relative group shrink-0">
            <button
              onClick={handleRequestReview}
              disabled={!canRequestReview || sendingReview}
              className={[
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                reviewRequestedAt
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default'
                  : canRequestReview
                    ? 'bg-slate-900 text-white hover:bg-slate-700 active:scale-95 shadow-sm'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed',
              ].join(' ')}
            >
              {sendingReview ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : reviewRequestedAt ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : !canRequestReview ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <SendHorizonal className="w-3.5 h-3.5" />
              )}
              {reviewRequestedAt ? 'Semana enviada' : 'Enviar semana'}
            </button>

            {!canRequestReview && !reviewRequestedAt && reviewButtonTooltip && (
              <div className="absolute right-0 top-full mt-2 z-10 w-52 px-3 py-2 bg-slate-800 text-white text-xs rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                {reviewButtonTooltip}
                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-slate-800 rotate-45" />
              </div>
            )}
          </div>
        </div>

        {/* Día X de Y + cumplimiento semanal */}
        <div className="grid grid-cols-2 gap-3">
          {/* Día en la semana */}
          {dayInWeek !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Día</span>
                <span className="text-xs font-bold text-slate-700">{dayInWeek} / {plan.duration_days ?? 7}</span>
              </div>
              <Progress
                value={Math.round((dayInWeek / (plan.duration_days ?? 7)) * 100)}
                className="h-1.5 bg-slate-100 [&>div]:bg-slate-400 [&>div]:transition-all [&>div]:duration-500"
              />
            </div>
          )}

          {/* Cumplimiento semanal */}
          {dueMealIds.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Target className="w-3 h-3" /> Cumplimiento
                </span>
                <span className={`text-xs font-bold ${weekCompliancePct >= 80 ? 'text-emerald-600' : weekCompliancePct >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {weekCompliancePct}%
                </span>
              </div>
              <Progress
                value={weekCompliancePct}
                className={`h-1.5 bg-slate-100 [&>div]:transition-all [&>div]:duration-500 ${
                  weekCompliancePct >= 80 ? '[&>div]:bg-emerald-500' :
                  weekCompliancePct >= 50 ? '[&>div]:bg-amber-400' : '[&>div]:bg-slate-400'
                }`}
              />
            </div>
          )}
        </div>

        {/* Mini-calendario semanal (2.3) */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Esta semana</p>
          <MiniCalendar
            mealsByDay={mealsByDay}
            allWeekLogs={allWeekLogs}
            todayWeekday={todayWeekday}
            todayOrder={todayOrder}
            selectedWeekday={effectiveDay}
            onSelectDay={setSelectedWeekday}
          />

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-2.5 px-0.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Completado
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="relative w-1.5 h-1.5 inline-flex">
                <span className="absolute inset-0 rounded-full border border-emerald-500" />
                <span className="absolute left-0 top-0 bottom-0 w-1/2 bg-emerald-500 rounded-l-full" />
              </span>
              Parcial
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full border border-slate-300 inline-block" /> Pendiente
            </span>
          </div>
        </div>
      </div>

      {/* ── Comidas del día seleccionado ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-4 items-start">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            {selectedLabel}
            {effectiveDay === todayWeekday && (
              <span className="ml-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Hoy</span>
            )}
            {totalLoggable > 0 && (
              <span className="ml-2 text-[11px] font-medium text-slate-400">
                {completedToday}/{totalLoggable} registradas
              </span>
            )}
          </p>

          {dayMeals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
              <UtensilsCrossed className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Sin comidas para {selectedLabel}</p>
            </div>
          ) : (
            <MealLogger meals={dayMeals} date={today} onRefresh={handleRefresh} logs={logs} />
          )}
        </div>

        <MacroProgress
          title={`Análisis del ${selectedLabel}`}
          calories={{ current: dayTotals.cal,   target: plan.calories_per_day }}
          protein={  { current: dayTotals.prot,  target: plan.protein_g }}
          carbs={    { current: dayTotals.carbs, target: plan.carbs_g }}
          fats={     { current: dayTotals.fats,  target: plan.fats_g }}
          sinceDate={sinceDate}
        />
      </div>

      {/* ── Próxima semana / Estado C ─────────────────────────────────────── */}
      {hasNextWeek ? (
        /* Estado D — hay próxima semana programada */
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowNextWeek(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">
                  {hasFullChain ? `Semana ${weekNumber + 1}` : 'Próxima semana'} · {scheduledPlan.plan_name}
                </p>
                <p className="text-xs text-slate-500">
                  Comienza el {new Date(scheduledPlan.start_date + 'T12:00').toLocaleDateString('es-PE', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showNextWeek ? 'rotate-180' : ''}`} />
          </button>

          {showNextWeek && (
            <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vista previa · solo lectura</p>

              {!scheduledPlanDetail ? (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">Tu nutricionista está terminando de preparar el menú.</p>
                  <button
                    onClick={() => router.push(`/${gymId}/panel/mensajes-nutricionista`)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    <SendHorizonal className="w-3.5 h-3.5" />
                    {nutriName ? `Escribir a ${nutriName}` : 'Escribir a mi nutricionista'}
                  </button>
                </div>
              ) : (() => {
                const nextMealsByDay: Record<string, any[]> = scheduledPlanDetail?.meals_by_day ?? {}
                const nextWeekdays = WEEKDAYS.filter(d => nextMealsByDay[d.value]?.length > 0)
                if (nextWeekdays.length === 0) return (
                  <p className="text-sm text-slate-400">El menú de la próxima semana aún está en preparación.</p>
                )
                return (
                  <div className="space-y-3">
                    {nextWeekdays.map(d => (
                      <div key={d.value}>
                        <p className="text-xs font-bold text-slate-600 mb-1.5">{d.label}</p>
                        <div className="space-y-1">
                          {(nextMealsByDay[d.value] ?? []).map((meal: any) => (
                            <div key={meal.id} className="flex items-center gap-2.5 px-3.5 py-2 bg-white rounded-xl border border-slate-100 text-xs">
                              <span className="font-semibold text-slate-700">{meal.name}</span>
                              <span className="text-slate-200">·</span>
                              <span className="text-slate-500">{meal.calories} kcal</span>
                              {meal.protein_g > 0 && (
                                <span className="text-slate-400">{Math.round(meal.protein_g)}g prot</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      ) : (
        /* Estado C — sin próxima semana */
        <div className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-100 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700">
              {nutriName
                ? `${nutriName} está preparando tu próxima semana`
                : 'Tu nutricionista está preparando tu próxima semana'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Semana {weekNumber} de ? · {sinceDate && `desde el ${sinceDate}`}
            </p>
          </div>
          <button
            onClick={() => router.push(`/${gymId}/panel/mensajes-nutricionista`)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
          >
            <SendHorizonal className="w-3.5 h-3.5" />
            {nutriName ? `Escribir a ${nutriName} →` : 'Escribir al nutricionista →'}
          </button>
        </div>
      )}
    </div>
  )
}
