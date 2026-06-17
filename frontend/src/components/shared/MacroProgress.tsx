'use client'

import { Flame, Beef, Wheat, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MacroValue {
  current: number
  target: number
}

interface MacroProgressProps {
  calories: MacroValue
  protein:  MacroValue
  carbs:    MacroValue
  fats:     MacroValue
  title?:   string
  sinceDate?: string
  className?: string
}

const MACROS = [
  { key: 'calories', label: 'Energía',    unit: 'kcal', barColor: 'bg-orange-400', icon: <Flame    className="w-3.5 h-3.5 text-orange-500" /> },
  { key: 'protein',  label: 'Proteínas',  unit: 'g',    barColor: 'bg-rose-400',   icon: <Beef     className="w-3.5 h-3.5 text-rose-500" /> },
  { key: 'carbs',    label: 'H. Carbono', unit: 'g',    barColor: 'bg-amber-400',  icon: <Wheat    className="w-3.5 h-3.5 text-amber-500" /> },
  { key: 'fats',     label: 'Grasa',      unit: 'g',    barColor: 'bg-blue-400',   icon: <Droplets className="w-3.5 h-3.5 text-blue-500" /> },
] as const

export default function MacroProgress({ calories, protein, carbs, fats, title, sinceDate, className }: MacroProgressProps) {
  const values: Record<string, MacroValue> = { calories, protein, carbs, fats }

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 p-5 h-fit sm:sticky sm:top-4', className)}>
      {title && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">{title}</p>
      )}
      {MACROS.map(({ key, label, unit, barColor, icon }) => {
        const { current, target } = values[key]
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
        return (
          <div key={key} className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs text-slate-600">{icon}{label}</span>
              <span className="text-xs text-slate-700">
                <span className="font-semibold">{Math.round(current * 10) / 10}</span>
                <span className="text-slate-400">/{target}{unit}</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      {sinceDate && (
        <p className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-100">
          Desde {sinceDate}
        </p>
      )}
    </div>
  )
}
