'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, format, startOfWeek, subDays, isAfter, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface WeekSelectorProps {
  currentWeekStart: Date
  onChange: (weekStart: Date) => void
  label?: string
}

export default function WeekSelector({ currentWeekStart, onChange, label }: WeekSelectorProps) {
  const weekEnd   = addDays(currentWeekStart, 6)
  const todayMon  = startOfWeek(new Date(), { weekStartsOn: 1 })
  const isCurrentWeek = !isAfter(startOfDay(todayMon), startOfDay(currentWeekStart)) &&
                        !isAfter(startOfDay(currentWeekStart), startOfDay(todayMon))
  const isFuture  = isAfter(startOfDay(currentWeekStart), startOfDay(todayMon))

  const displayLabel = label ?? `${format(currentWeekStart, 'd MMM', { locale: es })} – ${format(weekEnd, 'd MMM yyyy', { locale: es })}`

  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
      <button
        onClick={() => onChange(subDays(currentWeekStart, 7))}
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        aria-label="Semana anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800 leading-none">{displayLabel}</p>
        {isCurrentWeek && (
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Semana actual</p>
        )}
        {isFuture && (
          <p className="text-[10px] text-slate-400 mt-0.5">Semana futura</p>
        )}
      </div>

      <button
        onClick={() => { if (!isCurrentWeek && !isFuture) onChange(addDays(currentWeekStart, 7)) }}
        disabled={isCurrentWeek || isFuture}
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        aria-label="Semana siguiente"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
