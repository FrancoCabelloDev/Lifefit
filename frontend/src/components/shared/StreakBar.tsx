'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakBarProps {
  streakDays: number
  multiplier: number
  pointsYesterday: number | null
  className?: string
}

export default function StreakBar({ streakDays, multiplier, pointsYesterday, className }: StreakBarProps) {
  if (streakDays === 0) return null

  const nextMilestone = streakDays >= 30 ? null : streakDays >= 14 ? 30 : streakDays >= 7 ? 14 : 7
  const nextMultiplier = nextMilestone === 30 ? 3 : nextMilestone === 14 ? 2 : 1.5
  const daysLeft = nextMilestone ? nextMilestone - streakDays : null

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 px-5 py-3.5 flex items-center gap-5 flex-wrap', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Racha</p>
          <p className="text-base font-bold text-slate-800 leading-none">
            {streakDays} {streakDays === 1 ? 'día' : 'días'}
          </p>
        </div>
      </div>

      <div className="w-px h-8 bg-slate-100" />

      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Multiplicador</p>
          <p className="text-base font-bold text-amber-600 leading-none">×{multiplier}</p>
        </div>
      </div>

      {pointsYesterday !== null && pointsYesterday > 0 && (
        <>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex items-center gap-2">
            <span className="text-base">⭐</span>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">Ayer</p>
              <p className="text-base font-bold text-emerald-700 leading-none">+{pointsYesterday} pts</p>
            </div>
          </div>
        </>
      )}

      {daysLeft !== null && (
        <p className="ml-auto text-xs text-slate-400 hidden sm:block">
          {daysLeft} día{daysLeft > 1 ? 's' : ''} para ×{nextMultiplier}
        </p>
      )}
    </div>
  )
}
