'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crown, Loader2, Medal, Trophy } from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'

type RankEntry = {
  rank: number
  athlete_id: string
  name: string
  email: string
  avatar_url: string | null
  total_points: number
}

type RankingData = {
  gym: string
  ranking: RankEntry[]
  my_rank: number | null
  my_points: number | null
}

const RANK_STYLES: Record<number, { bg: string; text: string; icon: React.ReactNode }> = {
  1: { bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-600',  icon: <Crown className="w-4 h-4 text-amber-500" /> },
  2: { bg: 'bg-slate-50 border-slate-200',   text: 'text-slate-500',  icon: <Medal className="w-4 h-4 text-slate-400" /> },
  3: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', icon: <Medal className="w-4 h-4 text-orange-400" /> },
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function RankingPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useFeatureGuard(gymId, 'ranking')
  const me = getStoredUser() as any

  const { data, isLoading } = useQuery({
    queryKey: ['ranking', gymId],
    queryFn: () => api.get<RankingData>('/api/gamification/ranking/', { params: { gym_slug: gymId } }),
  })

  const ranking = data?.ranking ?? []
  const myId = me?.id

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ranking</h1>
          <p className="text-sm text-slate-500">{data?.gym ?? '...'}</p>
        </div>
      </div>

      {/* Mi posición */}
      {data?.my_rank && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Tu posición</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">#{data.my_rank}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Tus puntos</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{data.my_points?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {!isLoading && ranking.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aún no hay atletas con puntos en este gimnasio.</p>
        </div>
      )}

      {!isLoading && ranking.length > 0 && (
        <div className="space-y-2">
          {ranking.map(entry => {
            const style   = RANK_STYLES[entry.rank]
            const isMe    = entry.athlete_id === myId
            const rankBg  = style?.bg ?? (isMe ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100')
            const rankTxt = style?.text ?? (isMe ? 'text-emerald-600' : 'text-slate-400')

            return (
              <div
                key={entry.athlete_id}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border ${rankBg} ${isMe ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
              >
                {/* Posición */}
                <div className={`w-8 text-center font-bold text-sm ${rankTxt}`}>
                  {style?.icon ?? <span>#{entry.rank}</span>}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">{initials(entry.name)}</span>
                  )}
                </div>

                {/* Nombre */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-emerald-800' : 'text-slate-800'}`}>
                    {entry.name} {isMe && <span className="text-xs font-normal text-emerald-600">(tú)</span>}
                  </p>
                </div>

                {/* Puntos */}
                <div className="text-right shrink-0">
                  <p className={`text-base font-bold ${isMe ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {entry.total_points.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
