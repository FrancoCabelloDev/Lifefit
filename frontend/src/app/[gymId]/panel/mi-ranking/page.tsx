'use client'

import { useEffect, useState, use } from 'react'
import { Trophy, Medal, Loader2, Zap, Star, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getStoredUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { User as UserType, UserProgress as UserProgressType } from '@/lib/types'

import { api } from '@/lib/api'

interface LeaderboardEntry extends UserProgressType {
  user_detail: { id: string; email: string; first_name?: string; last_name?: string } | null
}

const podiumColors = ['bg-yellow-400', 'bg-slate-300', 'bg-amber-600']
const podiumEmojis = ['🥇', '🥈', '🥉']

export default function MiRankingPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const user = getStoredUser<UserType>()
        if (user) setCurrentUserId(user.id)

        const data = await api.get<LeaderboardEntry[]>('/api/challenges/progress/leaderboard/')
        setLeaderboard(data)
      } catch (err) {
        console.error('Error fetching leaderboard', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ranking</h1>
          <p className="text-slate-500 mt-2 text-lg">Tabla de posiciones del gimnasio</p>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Sin datos</h3>
            <p className="text-slate-500 mt-1">Aún no hay suficientes datos para mostrar el ranking.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ranking</h1>
        <p className="text-slate-500 mt-2 text-lg">Tabla de posiciones por puntos</p>
      </div>

      {leaderboard.slice(0, 3).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {leaderboard.slice(0, 3).map((entry, index) => {
            const pos = index === 0 ? 1 : index === 1 ? 0 : 2
            return (
              <Card
                key={entry.id}
                className={cn(
                  'border text-center shadow-sm',
                  index === 0 ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200'
                )}
              >
                <CardContent className="p-4">
                  <div className="text-3xl mb-2">{podiumEmojis[index]}</div>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {entry.user_detail?.first_name || entry.user_detail?.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{entry.total_points}</p>
                  <p className="text-xs text-slate-400">Nivel {entry.level}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {leaderboard.map((entry, index) => {
            const isMe = entry.user === currentUserId || entry.user_detail?.id === currentUserId
            const position = index + 1
            return (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0',
                  isMe && 'bg-emerald-50'
                )}
              >
                <div className="w-8 text-center">
                  {position <= 3 ? (
                    <span className="text-lg">{podiumEmojis[position - 1]}</span>
                  ) : (
                    <span className="text-sm font-bold text-slate-400">#{position}</span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    isMe ? 'text-emerald-700' : 'text-slate-800'
                  )}>
                    {entry.user_detail?.first_name
                      ? `${entry.user_detail.first_name} ${entry.user_detail.last_name || ''}`
                      : entry.user_detail?.email?.split('@')[0] || 'Usuario'}
                    {isMe && <span className="ml-2 text-[10px] text-emerald-500 font-normal">(tú)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{entry.total_points} pts</p>
                    <p className="text-xs text-slate-400">Nivel {entry.level}</p>
                  </div>
                  <Zap className={cn(
                    'w-5 h-5',
                    isMe ? 'text-emerald-500' : 'text-slate-300'
                  )} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
