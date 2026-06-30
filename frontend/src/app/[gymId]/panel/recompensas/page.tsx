'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Gift, Star, Package, Loader2, CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
import { useSubscriptionTier } from '@/lib/hooks'
import { useRoleGuard } from '@/hooks/useRoleGuard'

interface Reward {
  id: string
  name: string
  description: string
  image: string | null
  points_cost: number
  stock: number | null
  available_stock: number | null
  is_active: boolean
}

interface Redemption {
  id: string
  reward: string
  reward_name: string
  reward_points_cost: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const STATUS_UI: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:  { label: 'Pendiente',  color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: Clock },
  approved: { label: 'Aprobado',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rechazado',  color: 'text-rose-700 bg-rose-50 border-rose-200',     icon: XCircle },
}

export default function RecompensasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['athlete'])
  const queryClient = useQueryClient()

  const statsQuery = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => api.get<any>(`/api/gamification/my-stats/?gym=${gymId}`),
  })

  const rewardsQuery = useQuery({
    queryKey: ['rewards-athlete', gymId],
    queryFn: () =>
      api.get<{ results: Reward[] } | Reward[]>(`/api/gamification/${gymId}/rewards/`)
        .then(r => Array.isArray(r) ? r : r.results ?? []),
  })

  const redemptionsQuery = useQuery({
    queryKey: ['my-redemptions', gymId],
    queryFn: () =>
      api.get<{ results: Redemption[] } | Redemption[]>(`/api/gamification/${gymId}/redemptions/`)
        .then(r => Array.isArray(r) ? r : r.results ?? []),
  })

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) =>
      api.post(`/api/gamification/${gymId}/redemptions/`, { reward: rewardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-redemptions', gymId] })
      queryClient.invalidateQueries({ queryKey: ['my-stats'] })
      showSuccess('Solicitud enviada. El administrador la revisará pronto.')
    },
    onError: (err) => showError(err, 'No se pudo canjear'),
  })

  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const totalPoints: number = statsQuery.data?.total_points ?? 0
  const rewards = rewardsQuery.data ?? []
  const redemptions = redemptionsQuery.data ?? []

  const alreadyRequested = new Set(
    redemptions.filter(r => r.status !== 'rejected').map(r => r.reward)
  )

  const isLoading = rewardsQuery.isLoading || statsQuery.isLoading

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header con puntos */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recompensas</h1>
          <p className="text-sm text-slate-500 mt-1">Canjea tus puntos por recompensas exclusivas del gimnasio.</p>
        </div>
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span className="text-xl font-black text-amber-700">{totalPoints.toLocaleString()}</span>
          <span className="text-xs font-semibold text-amber-600">pts disponibles</span>
        </div>
      </div>

      {/* Catálogo */}
      {rewards.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Gift className="w-14 h-14 mx-auto text-slate-200 mb-4" />
            <p className="text-base font-semibold text-slate-600">Sin recompensas disponibles</p>
            <p className="text-sm text-slate-400 mt-1">
              Tu gimnasio aún no ha publicado recompensas. ¡Sigue acumulando puntos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => {
            const canAfford = totalPoints >= reward.points_cost
            const outOfStock = reward.available_stock === 0
            const requested = alreadyRequested.has(reward.id)
            const isDisabled = !canAfford || outOfStock || requested || redeemMutation.isPending

            const weeksNeeded = canAfford ? 0 : Math.ceil((reward.points_cost - totalPoints) / 100)

            return (
              <Card
                key={reward.id}
                className={`border shadow-sm transition-all overflow-hidden ${isDisabled ? 'opacity-70' : 'hover:shadow-md hover:-translate-y-0.5'}`}
              >
                {reward.image && (
                  <div className="w-full h-40 bg-slate-100">
                    <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className={reward.image ? '' : 'flex items-start gap-3'}>
                    {!reward.image && (
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Gift className="w-6 h-6 text-amber-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 leading-tight">{reward.name}</p>
                      {reward.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{reward.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-black text-slate-900">{reward.points_cost}</span>
                      <span className="text-xs text-slate-500">pts</span>
                    </div>
                    {reward.available_stock !== null && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Package className="w-3.5 h-3.5" />
                        {outOfStock ? (
                          <span className="text-rose-500 font-semibold">Agotado</span>
                        ) : (
                          `${reward.available_stock} disp.`
                        )}
                      </div>
                    )}
                  </div>

                  {!canAfford && !outOfStock && !requested && weeksNeeded > 0 && (
                    <p className="text-xs text-slate-400">
                      Te faltan <span className="font-semibold text-slate-600">{reward.points_cost - totalPoints} pts</span>
                      {' '}· aprox. {weeksNeeded} semana{weeksNeeded !== 1 ? 's' : ''} más
                    </p>
                  )}

                  {confirmingId === reward.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => { redeemMutation.mutate(reward.id); setConfirmingId(null) }}
                        disabled={redeemMutation.isPending}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        {redeemMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(reward.id)}
                      disabled={isDisabled}
                      className={[
                        'w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]',
                        requested
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : canAfford && !outOfStock
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                      ].join(' ')}
                    >
                      {requested ? 'Solicitud enviada' : outOfStock ? 'Sin stock' : !canAfford ? 'Puntos insuficientes' : 'Canjear'}
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Historial de canjes */}
      {redemptions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mis canjes</h2>
          {redemptions.map(r => {
            const s = STATUS_UI[r.status]
            const StatusIcon = s.icon
            return (
              <Card key={r.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{r.reward_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {r.reward_points_cost}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {s.label}
                    </span>
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
