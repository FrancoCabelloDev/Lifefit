'use client'

import { useState, useEffect, use } from 'react'
import { Trophy, Medal, Award, Crown, Loader2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { api } from '@/lib/api'
import type { UserProgress } from '@/lib/types'

const MEDAL_ICONS = ['🥇', '🥈', '🥉']

const TOP_COLORS = [
  { bg: 'bg-amber-50 border-amber-200 ring-4 ring-amber-100/50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
  { bg: 'bg-slate-50 border-slate-300 ring-4 ring-slate-100/50', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-700', icon: 'text-slate-400' },
  { bg: 'bg-orange-50 border-orange-200 ring-4 ring-orange-100/50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
]

export default function RankingPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<any>('/api/challenges/progress/leaderboard/')
      setProgress(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getXpPercent = (current: number, next: number) => {
    if (!next) return 0
    return Math.min(Math.round((current / next) * 100), 100)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ranking de Atletas</h1>
        <p className="text-slate-500 mt-1">Clasificación general basada en puntos y experiencia.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : progress.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Trophy className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Sin datos de ranking</h3>
          <p className="text-slate-500 mt-1">Los atletas aparecerán aquí cuando acumulen puntos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {progress.map((entry, index) => {
            const isTop3 = index < 3
            const topStyle = isTop3 ? TOP_COLORS[index] : null
            const xpPercent = getXpPercent(entry.current_xp, entry.next_level_xp)
            const athleteName = entry.user_detail?.email?.split('@')[0] ?? entry.user_detail?.email ?? entry.user ?? 'Atleta'

            return (
              <Card
                key={entry.id}
                className={`border rounded-2xl transition-all hover:shadow-md ${
                  isTop3 ? topStyle!.bg + ' ' + topStyle!.text : 'border-slate-200'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Position */}
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                      {index < 3 ? (
                        <span className="text-3xl">{MEDAL_ICONS[index]}</span>
                      ) : (
                        <span className="text-lg font-bold text-slate-400">#{index + 1}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{athleteName}</span>
                        <Badge variant="secondary" className={`font-medium ${isTop3 ? topStyle!.badge : 'bg-slate-100 text-slate-600'}`}>
                          Nivel {entry.level}
                        </Badge>
                      </div>

                      {/* XP Bar */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop3 ? 'bg-emerald-500' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${xpPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {entry.current_xp} / {entry.next_level_xp} XP
                        </span>
                      </div>
                    </div>

                    {/* Total Points */}
                    <div className="flex-shrink-0 text-right ml-4">
                      <p className={`text-2xl font-black ${isTop3 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {entry.total_points}
                      </p>
                      <p className="text-xs text-slate-500">puntos</p>
                    </div>

                    {isTop3 && (
                      <div className="flex-shrink-0 ml-2">
                        {index === 0 ? (
                          <Crown className={`h-6 w-6 ${topStyle!.icon}`} />
                        ) : index === 1 ? (
                          <Medal className={`h-6 w-6 ${topStyle!.icon}`} />
                        ) : (
                          <Award className={`h-6 w-6 ${topStyle!.icon}`} />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
