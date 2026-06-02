'use client'

import { useEffect, useState, use } from 'react'
import { UtensilsCrossed, Loader2, CalendarDays, CheckCircle2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

import { api } from '@/lib/api'
import type { NutritionPlan, MealTemplate, UserNutritionPlan } from '@/lib/types'
import { showError } from '@/lib/toast'
import MealLogger from '@/components/nutrition/MealLogger'

export default function MiNutricionPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams

  const [assignment, setAssignment] = useState<UserNutritionPlan | null>(null)
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const todayLocal = new Date()
  const startDate = assignment?.start_date ? new Date(assignment.start_date) : null
  const dayNumber = startDate ? Math.floor((todayLocal.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const assignmentRes = await api.get<UserNutritionPlan>('/api/nutrition/assignments/my_active/')

      setAssignment(assignmentRes)
      const planData = assignmentRes.plan_detail
      if (planData) {
        setPlan(planData)
      } else if (assignmentRes.plan) {
        const planRes = await api.get<NutritionPlan>(`/api/nutrition/plans/${assignmentRes.plan}/`)
        setPlan(planRes)
      }

      const logsRes = await api.get<any>('/api/nutrition/meal-logs/', {
        params: { date: today }
      })
      const logs: any[] = Array.isArray(logsRes) ? logsRes : logsRes?.results || []
      setCompletedMeals(new Set(logs.filter((l: any) => l.completed).map((l: any) => l.meal_template)))
    } catch (err) {
      showError(err, 'Error al cargar datos de nutrición.')
      setAssignment(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const allMeals = plan?.meals_by_day ? Object.entries(plan.meals_by_day) : []
  const todayMeals: MealTemplate[] = plan?.meals_by_day?.[String(dayNumber)] || plan?.meals_by_day?.['1'] || []

  const totalMealsToday = todayMeals.length
  const completedToday = todayMeals.filter(m => completedMeals.has(m.id)).length
  const todayProgress = totalMealsToday > 0 ? Math.round((completedToday / totalMealsToday) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
          <p className="text-slate-500 mt-2 text-lg">Tu plan de alimentación personalizado</p>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <UtensilsCrossed className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Sin plan activo</h3>
            <p className="text-slate-500 mt-1">Tu coach o nutricionista aún no te ha asignado un plan nutricional.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Plan Nutricional</h1>
        <p className="text-slate-500 mt-2 text-lg">{plan.name}</p>
      </div>

      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Progreso del día</span>
            </div>
            <Badge className="bg-white/20 text-white border-0">{completedToday}/{totalMealsToday} comidas</Badge>
          </div>
          <Progress value={todayProgress} className="h-2.5 bg-white/20 [&>div]:bg-white" />
          <div className="flex items-center justify-between mt-4 text-sm text-white/80">
            <span>📅 Día {dayNumber} de {plan.duration_days}</span>
            <span>🔥 {plan.calories_per_day} cal/día</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-white/70">
            <span>Proteínas: {plan.protein_g}g</span>
            <span>Carbohidratos: {plan.carbs_g}g</span>
            <span>Grasas: {plan.fats_g}g</span>
          </div>
        </CardContent>
      </Card>

      {allMeals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allMeals.map(([day, meals]) => {
            const dayNum = parseInt(day)
            const isToday = dayNum === dayNumber
            return (
              <button
                key={day}
                className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isToday
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Día {day}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Comidas del Día {dayNumber}
          {todayProgress === 100 && <CheckCircle2 className="inline w-5 h-5 text-emerald-500 ml-2" />}
        </h2>
        {todayMeals.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay comidas configuradas para este día.</p>
        ) : (
          <MealLogger
            meals={todayMeals}
            date={today}
            onToggle={fetchData}
            completedMeals={completedMeals}
          />
        )}
      </div>
    </div>
  )
}
