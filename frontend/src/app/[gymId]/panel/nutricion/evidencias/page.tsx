'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, XCircle, Loader2, User, Calendar, UtensilsCrossed } from 'lucide-react'
import { api } from '@/lib/api'
import { showError } from '@/lib/toast'
import { toast } from 'sonner'
import { formatDate } from '@/lib/date-utils'

type PendingEvidence = {
  id: string
  athlete_id: string
  athlete_name: string
  meal_name: string
  meal_type: string
  plan_name: string
  date: string
  photo_url: string
  notes: string
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast:       'Desayuno',
  mid_morning:     'Media mañana',
  lunch:           'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner:          'Cena',
  late_snack:      'Recena',
}

export default function EvidenciasPendientesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const qc = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['pending-evidences', gymId],
    queryFn: () => api.get<{ count: number; results: PendingEvidence[] }>(
      '/api/nutrition/meal-logs/pending-approvals/'
    ),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ logId, approved, noteText }: { logId: string; approved: boolean; noteText: string }) =>
      api.post(`/api/nutrition/meal-logs/${logId}/review/`, { approved, notes: noteText }),
    onSuccess: (_, vars) => {
      toast.success(vars.approved ? '✓ Comida verificada. Se otorgaron puntos al atleta.' : 'Evidencia rechazada.')
      qc.invalidateQueries({ queryKey: ['pending-evidences', gymId] })
    },
    onError: (err) => showError(err, 'Error al procesar la revisión'),
  })

  const handleReview = (logId: string, approved: boolean) => {
    reviewMutation.mutate({ logId, approved, noteText: notes[logId] ?? '' })
  }

  const pending = data?.results ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evidencias Pendientes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Revisa las fotos que tus atletas subieron como evidencia de sus comidas completadas.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {!isLoading && pending.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="text-base font-semibold text-slate-700">Todo al día</p>
          <p className="text-sm text-slate-400 mt-1">No hay evidencias pendientes de revisión.</p>
        </div>
      )}

      {!isLoading && pending.length > 0 && (
        <>
          <p className="text-sm font-medium text-slate-600">
            {pending.length} evidencia{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''}
          </p>

          <div className="space-y-4">
            {pending.map(item => {
              const isProcessing = reviewMutation.isPending && reviewMutation.variables?.logId === item.id

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  <div className="p-5 flex gap-5">
                    {/* Foto */}
                    <button
                      onClick={() => setLightbox(item.photo_url)}
                      className="shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={item.photo_url}
                        alt={item.meal_name}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 text-[15px]">{item.meal_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {MEAL_TYPE_LABELS[item.meal_type] ?? item.meal_type} · {item.plan_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {item.athlete_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.date)}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-500 italic">"{item.notes}"</p>
                      )}

                      {/* Nota de rechazo opcional */}
                      <input
                        type="text"
                        placeholder="Nota para el atleta (opcional, solo si rechazas)"
                        value={notes[item.id] ?? ''}
                        onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400"
                      />

                      {/* Botones */}
                      <div className="flex gap-2 pt-1">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleReview(item.id, true)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Aprobar · +10 XP
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleReview(item.id, false)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-white text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-50 transition-all active:scale-95"
                        >
                          <XCircle className="w-4 h-4" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Evidencia ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  )
}
