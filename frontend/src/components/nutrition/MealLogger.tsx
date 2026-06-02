'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Flame, Beef, Wheat, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { MealTemplate } from '@/lib/types'

interface MealLoggerProps {
  meals: MealTemplate[]
  date: string
  onToggle: () => void
  completedMeals: Set<string>
}

const mealIcons: Record<string, any> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function MealLogger({ meals, date, onToggle, completedMeals }: MealLoggerProps) {
  const [toggling, setToggling] = useState<string | null>(null)

  const handleToggle = async (mealId: string) => {
    setToggling(mealId)
    try {
      await api.post('/api/nutrition/meal-logs/toggle_complete/', {
        meal_template_id: mealId,
        date,
      })
      onToggle()
    } catch (err) {
      console.error('Error toggling meal', err)
    } finally {
      setToggling(null)
    }
  }

  const completed = meals.filter(m => completedMeals.has(m.id)).length
  const total = meals.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-3">
      {meals.map((meal) => {
        const isComplete = completedMeals.has(meal.id)
        return (
          <button
            key={meal.id}
            onClick={() => handleToggle(meal.id)}
            disabled={toggling === meal.id}
            className={cn(
              'w-full text-left border rounded-xl p-4 transition-all',
              isComplete
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-sm'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{mealIcons[meal.meal_type] || '🍽️'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{meal.name}</span>
                    <span className="text-xs text-slate-400">{meal.meal_type_display}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{meal.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" />{meal.calories} cal</span>
                    <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-red-500" />{meal.protein_g}g</span>
                    <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-500" />{meal.carbs_g}g</span>
                    <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500" />{meal.fats_g}g</span>
                  </div>
                </div>
              </div>
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-6 h-6 text-slate-300 shrink-0" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
