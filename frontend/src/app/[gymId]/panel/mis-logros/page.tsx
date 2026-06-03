'use client'

import { useEffect, useState, use } from 'react'
import { Award, Loader2, Star, Calendar, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { api } from '@/lib/api'
import type { Badge, UserBadge, PaginatedResponse } from '@/lib/types'
import PremiumGate from '@/components/PremiumGate'

const badgeIcons: Record<string, string> = {
  'bronze': '🥉',
  'silver': '🥈',
  'gold': '🥇',
  'star': '⭐',
  'fire': '🔥',
  'trophy': '🏆',
  'medal': '🏅',
  'rocket': '🚀',
  'heart': '❤️',
  'lightning': '⚡',
  'target': '🎯',
  'check': '✅',
}

export default function MisLogrosPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams

  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [badgesRes, userBadgesRes] = await Promise.all([
          api.get<PaginatedResponse<Badge>>('/api/challenges/badges/'),
          api.get<PaginatedResponse<UserBadge>>('/api/challenges/user-badges/'),
        ])
        setBadges(badgesRes.results || [])
        setUserBadges(userBadgesRes.results || [])
      } catch (err) {
        console.error('Error fetching badges', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge))
  const earnedMap = new Map(userBadges.map(ub => [ub.badge, ub]))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <PremiumGate feature="Los logros y medallas">
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Logros</h1>
        <p className="text-slate-500 mt-2 text-lg">
          {userBadges.length} de {badges.length} insignias obtenidas
        </p>
      </div>

      {badges.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Sin insignias disponibles</h3>
            <p className="text-slate-500 mt-1">El gimnasio aún no ha creado insignias.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {badges.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id)
            const ub = earnedMap.get(badge.id)
            return (
              <Card
                key={badge.id}
                className={cn(
                  'border transition-all',
                  earned
                    ? 'border-emerald-200 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 bg-white opacity-60'
                )}
              >
                <CardContent className="p-4 text-center">
                  <div className={cn(
                    'text-4xl mb-3',
                    earned ? '' : 'grayscale'
                  )}>
                    {badgeIcons[badge.icon] || '🏅'}
                  </div>
                  <h3 className={cn(
                    'text-sm font-semibold',
                    earned ? 'text-slate-800' : 'text-slate-400'
                  )}>
                    {badge.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{badge.description}</p>
                  {earned && ub?.awarded_at && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-emerald-600">
                      <Calendar className="w-3 h-3" />
                      {new Date(ub.awarded_at).toLocaleDateString('es-PE')}
                    </div>
                  )}
                  {!earned && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
                      <Lock className="w-3 h-3" />
                      Por obtener
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
    </PremiumGate>
  )
}
