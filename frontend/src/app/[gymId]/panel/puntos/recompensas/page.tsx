'use client'

import { use, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Gift, Plus, Loader2, Pencil, Trash2, CheckCircle2, XCircle, Clock,
  Package, Star, ImagePlus, X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
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
  created_at: string
}

interface Redemption {
  id: string
  reward: string
  reward_name: string
  reward_points_cost: number
  athlete_name: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string
  reviewed_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{className?: string}> }> = {
  pending:  { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock },
  approved: { label: 'Aprobado',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rechazado', color: 'bg-rose-50 text-rose-700 border-rose-200',    icon: XCircle },
}

function RewardForm({ gymId, reward, onClose }: { gymId: string; reward?: Reward; onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName]             = useState(reward?.name ?? '')
  const [description, setDescription] = useState(reward?.description ?? '')
  const [pointsCost, setPointsCost] = useState(reward?.points_cost ?? 100)
  const [stock, setStock]           = useState<string>(reward?.stock != null ? String(reward.stock) : '')
  const [isActive, setIsActive]     = useState(reward?.is_active ?? true)
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(reward?.image ?? null)

  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      reward
        ? api.patch(`/api/gamification/${gymId}/rewards/${reward.id}/`, form, { formData: true })
        : api.post(`/api/gamification/${gymId}/rewards/`, form, { formData: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards', gymId] })
      showSuccess(reward ? 'Recompensa actualizada' : 'Recompensa creada')
      onClose()
    },
    onError: (err) => showError(err, 'Error al guardar'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const form = new FormData()
    form.append('name', name)
    form.append('description', description)
    form.append('points_cost', String(pointsCost))
    form.append('stock', stock.trim() === '' ? '' : stock)
    form.append('is_active', String(isActive))
    if (imageFile) form.append('image', imageFile)
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {reward ? 'Editar recompensa' : 'Nueva recompensa'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Imagen del producto</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {preview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 group">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImageFile(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/20 transition-opacity"
                >
                  <span className="text-xs font-semibold text-white bg-black/50 px-3 py-1.5 rounded-lg">Cambiar imagen</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-28 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <ImagePlus className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition-colors">Subir imagen del producto</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="Ej: Botella de agua personalizada"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none"
              placeholder="Descripción opcional…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Costo en puntos</label>
              <input
                type="number" min={1} value={pointsCost} onChange={e => setPointsCost(parseInt(e.target.value) || 0)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stock (vacío = ilimitado)</label>
              <input
                type="number" min={0} value={stock} onChange={e => setStock(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                placeholder="∞"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700">Activa (visible para atletas)</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PuntosRecompensasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['gym_admin', 'super_admin'])
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'catalog' | 'requests'>('requests')
  const [showForm, setShowForm] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | undefined>()

  const rewardsQuery = useQuery({
    queryKey: ['rewards', gymId],
    queryFn: () => api.get<{ results: Reward[] } | Reward[]>(`/api/gamification/${gymId}/rewards/`).then(r => Array.isArray(r) ? r : r.results ?? []),
  })

  const redemptionsQuery = useQuery({
    queryKey: ['redemptions', gymId],
    queryFn: () => api.get<{ results: Redemption[] } | Redemption[]>(`/api/gamification/${gymId}/redemptions/`).then(r => Array.isArray(r) ? r : r.results ?? []),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/gamification/${gymId}/rewards/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rewards', gymId] }); showSuccess('Eliminada') },
    onError: (err) => showError(err, 'Error al eliminar'),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.patch(`/api/gamification/${gymId}/redemptions/${id}/review/`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions', gymId] })
      showSuccess('Solicitud revisada')
    },
    onError: (err) => showError(err, 'Error al revisar'),
  })

  const rewards = rewardsQuery.data ?? []
  const redemptions = redemptionsQuery.data ?? []
  const pendingCount = redemptions.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Puntos & Recompensas</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona el catálogo de recompensas y revisa las solicitudes de canje.</p>
        </div>
        {tab === 'catalog' && (
          <button
            onClick={() => { setEditingReward(undefined); setShowForm(true) }}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Nueva recompensa
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['requests', 'catalog'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 relative',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {t === 'requests' ? 'Solicitudes' : 'Catálogo'}
            {t === 'requests' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4 min-w-[1.1rem] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Catalog tab */}
      {tab === 'catalog' && (
        rewardsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : rewards.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Gift className="w-12 h-12 mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-semibold text-slate-600">Sin recompensas aún</p>
              <p className="text-xs text-slate-400 mt-1">Crea la primera recompensa para que los atletas puedan canjear sus puntos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map(reward => (
              <Card key={reward.id} className={`border shadow-sm transition-all overflow-hidden ${reward.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                {reward.image ? (
                  <div className="relative w-full h-36 bg-slate-100">
                    <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
                    {!reward.is_active && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                ) : null}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{reward.name}</p>
                      {reward.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{reward.description}</p>
                      )}
                    </div>
                    {!reward.is_active && !reward.image && (
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-base font-bold text-slate-900">{reward.points_cost}</span>
                      <span className="text-xs text-slate-500">pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Package className="w-3.5 h-3.5" />
                      {reward.available_stock === null ? '∞' : `${reward.available_stock} disp.`}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setEditingReward(reward); setShowForm(true) }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => { if (confirm('¿Eliminar esta recompensa?')) deleteMutation.mutate(reward.id) }}
                      className="flex items-center justify-center px-3 py-2 border border-rose-100 rounded-lg text-rose-500 hover:bg-rose-50 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        redemptionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : redemptions.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-semibold text-slate-600">Sin solicitudes</p>
              <p className="text-xs text-slate-400 mt-1">Las solicitudes de canje de los atletas aparecerán aquí.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {redemptions.map(r => {
              const s = STATUS_LABELS[r.status]
              const StatusIcon = s.icon
              return (
                <Card key={r.id} className="border-slate-200 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{r.athlete_name}</p>
                        <span className="text-slate-400 text-xs">→</span>
                        <p className="text-sm text-slate-700">{r.reward_name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {s.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {r.reward_points_cost} pts
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(r.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => reviewMutation.mutate({ id: r.id, status: 'approved' })}
                          disabled={reviewMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                        </button>
                        <button
                          onClick={() => reviewMutation.mutate({ id: r.id, status: 'rejected' })}
                          disabled={reviewMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rechazar
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {showForm && (
        <RewardForm
          gymId={gymId}
          reward={editingReward}
          onClose={() => { setShowForm(false); setEditingReward(undefined) }}
        />
      )}
    </div>
  )
}
