'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Gift, Star, Package, Loader2, CheckCircle2, XCircle, Clock, X, ZoomIn, MapPin,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
import { useSubscriptionTier } from '@/lib/hooks'
import { useRoleGuard } from '@/hooks/useRoleGuard'

function ImagePreviewModal({ reward, onClose }: { reward: { name: string; image: string; description?: string }; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
        >
          <X className="w-4 h-4" /> Cerrar
        </button>

        {/* Image */}
        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
          <img
            src={reward.image}
            alt={reward.name}
            className="w-full max-h-[70vh] object-contain"
          />
        </div>

        {/* Caption */}
        <div className="mt-3 text-center">
          <p className="text-white font-semibold text-sm">{reward.name}</p>
          {reward.description && (
            <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{reward.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

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
  pickup_info: string
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

  const [previewReward, setPreviewReward] = useState<Reward | null>(null)

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

  const pendingRedemptions = new Set(
    redemptions.filter(r => r.status === 'pending').map(r => r.reward)
  )
  const approvedRedemptions = new Set(
    redemptions.filter(r => r.status === 'approved').map(r => r.reward)
  )
  const alreadyRequested = new Set([...pendingRedemptions, ...approvedRedemptions])

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
            const isPending = pendingRedemptions.has(reward.id)
            const isApproved = approvedRedemptions.has(reward.id)
            const requested = isPending || isApproved
            const isDisabled = !canAfford || outOfStock || requested || redeemMutation.isPending
            const weeksNeeded = canAfford ? 0 : Math.ceil((reward.points_cost - totalPoints) / 100)

            return (
              <div
                key={reward.id}
                className={`rounded-2xl border bg-white overflow-hidden shadow-sm transition-all duration-200 ${!isDisabled ? 'hover:shadow-md hover:-translate-y-0.5' : ''} border-slate-200`}
              >
                {/* Image banner */}
                <div
                  className="relative w-full bg-slate-100 group"
                  style={{ aspectRatio: '16/9' }}
                >
                  {reward.image ? (
                    <>
                      <img
                        src={reward.image}
                        alt={reward.name}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        className={`transition-all duration-300 ${outOfStock ? 'grayscale' : ''}`}
                      />
                      {/* Zoom overlay on hover */}
                      {!outOfStock && (
                        <button
                          onClick={() => setPreviewReward(reward)}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-all duration-200"
                          aria-label="Ver imagen completa"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 bg-white/90 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                            <ZoomIn className="w-3.5 h-3.5" /> Ver producto
                          </span>
                        </button>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-xs font-bold text-white bg-black/60 px-3 py-1.5 rounded-full tracking-wide">
                            Agotado
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gift className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`p-4 flex flex-col gap-3 ${isDisabled && !outOfStock ? 'opacity-70' : ''}`}>
                  <div>
                    <p className="font-semibold text-slate-900 leading-snug">{reward.name}</p>
                    {reward.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{reward.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-slate-900">{reward.points_cost}</span>
                      <span className="text-xs text-slate-400 ml-0.5">pts</span>
                    </div>
                    {reward.available_stock !== null && (
                      <div className="flex items-center gap-1 text-xs">
                        <Package className="w-3 h-3 text-slate-400" />
                        {outOfStock ? (
                          <span className="text-rose-500 font-semibold">Sin stock</span>
                        ) : (
                          <span className="text-slate-400">{reward.available_stock} disp.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {!canAfford && !outOfStock && !requested && weeksNeeded > 0 && (
                    <p className="text-xs text-slate-400 leading-snug">
                      Faltan <span className="font-semibold text-slate-600">{reward.points_cost - totalPoints} pts</span>
                      {' '}· aprox. {weeksNeeded} semana{weeksNeeded !== 1 ? 's' : ''}
                    </p>
                  )}

                  {confirmingId === reward.id ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 text-center leading-snug">
                        El administrador revisará tu solicitud y coordinará la entrega contigo.
                      </p>
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
                          {redeemMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar canje'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => !isDisabled && setConfirmingId(reward.id)}
                        disabled={isDisabled}
                        className={[
                          'w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5',
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                            : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-not-allowed'
                              : canAfford && !outOfStock
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                        ].join(' ')}
                      >
                        {isApproved
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Aprobado</>
                          : isPending
                            ? <><Clock className="w-3.5 h-3.5" /> Pendiente de entrega</>
                            : outOfStock ? 'Sin stock'
                            : !canAfford ? 'Puntos insuficientes'
                            : 'Canjear'}
                      </button>
                      {isPending && (
                        <p className="text-[11px] text-slate-400 text-center leading-snug">
                          El admin coordinará contigo la recogida del producto.
                        </p>
                      )}
                      {isApproved && (
                        <p className="text-[11px] text-emerald-600 text-center leading-snug font-medium">
                          Revisa tus canjes para ver las instrucciones de recogida.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
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
              <Card key={r.id} className={`shadow-sm ${r.status === 'approved' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
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
                  </div>
                  {r.status === 'approved' && r.pickup_info && (
                    <div className="flex items-start gap-2 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-700 mb-0.5">Instrucciones de recogida</p>
                        <p className="text-xs text-emerald-700 leading-relaxed">{r.pickup_info}</p>
                      </div>
                    </div>
                  )}
                  {r.status === 'approved' && !r.pickup_info && (
                    <p className="text-xs text-emerald-700 mt-2 font-medium">
                      Aprobado — el gimnasio te enviará pronto las instrucciones de recogida.
                    </p>
                  )}
                  {r.status === 'pending' && (
                    <p className="text-xs text-amber-600 mt-2">
                      En revisión — recibirás una notificación cuando sea procesado.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Image preview modal */}
      {previewReward && previewReward.image && (
        <ImagePreviewModal
          reward={{ name: previewReward.name, image: previewReward.image, description: previewReward.description }}
          onClose={() => setPreviewReward(null)}
        />
      )}
    </div>
  )
}
