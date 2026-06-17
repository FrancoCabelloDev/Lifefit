'use client'

import { cn } from '@/lib/utils'

const WEEKDAYS = [
  { value: 'monday',    short: 'Lu' },
  { value: 'tuesday',   short: 'Ma' },
  { value: 'wednesday', short: 'Mi' },
  { value: 'thursday',  short: 'Ju' },
  { value: 'friday',    short: 'Vi' },
  { value: 'saturday',  short: 'Sa' },
  { value: 'sunday',    short: 'Do' },
]

type DayData = {
  weekday: string
  compliance_pct: number | null
  total: number
} | null

interface WeeklyMiniCalendarProps {
  dailyCompliance: DayData[]
  todayWeekday: string
  avgCompliance: number
  perfectWeek: boolean
  className?: string
}

export default function WeeklyMiniCalendar({
  dailyCompliance,
  todayWeekday,
  avgCompliance,
  perfectWeek,
  className,
}: WeeklyMiniCalendarProps) {
  // Build a map keyed by weekday string
  const compMap: Record<string, DayData> = {}
  dailyCompliance.forEach(d => {
    if (d) compMap[d.weekday] = d
  })

  const hasAny = Object.values(compMap).some(d => d && d.total > 0)
  if (!hasAny) return null

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 px-5 py-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Esta semana</p>
        <p className="text-xs font-semibold text-slate-700">{avgCompliance}% promedio</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map(d => {
          const data      = compMap[d.value]
          const pct       = data?.compliance_pct ?? null
          const hasData   = !!(data && data.total > 0)
          const isPerfect = hasData && pct !== null && pct >= 80
          const isPartial = hasData && pct !== null && pct > 0 && pct < 80
          const isZero    = hasData && pct === 0
          const isToday   = d.value === todayWeekday

          return (
            <div key={d.value} className="flex flex-col items-center gap-1">
              <span className={cn(
                'text-[10px] font-semibold',
                isToday ? 'text-emerald-600' : 'text-slate-400',
              )}>
                {d.short}
              </span>
              <div className={cn(
                'w-full h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                !hasData   && 'bg-slate-50 text-slate-300 border border-slate-100',
                isPerfect  && 'bg-emerald-100 text-emerald-700 border border-emerald-200',
                isPartial  && 'bg-amber-50 text-amber-600 border border-amber-200',
                isZero     && 'bg-red-50 text-red-400 border border-red-100',
              )}>
                {hasData ? `${Math.round(pct!)}%` : '—'}
              </div>
              {isToday && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
            </div>
          )
        })}
      </div>
      {perfectWeek && (
        <p className="text-center text-xs font-semibold text-emerald-700 mt-3 bg-emerald-50 rounded-xl py-1.5">
          ¡Semana perfecta! +25 pts extra
        </p>
      )}
    </div>
  )
}
