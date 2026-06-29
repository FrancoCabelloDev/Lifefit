'use client'

import { useEffect, useState, use } from 'react'
import {
  Target, Loader2, Trophy, Calendar, CheckCircle2,
  Plus, Send, Clock, X, Medal, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
import type { Challenge, ChallengeParticipation, PaginatedResponse } from '@/lib/types'
import PremiumGate from '@/components/PremiumGate'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'

const TYPE_META: Record<string, { label: string; icon: string }> = {
  attendance:  { label: 'Asistencia',      icon: '📋' },
  distance:    { label: 'Distancia',        icon: '📏' },
  workouts:    { label: 'Entrenamientos',   icon: '💪' },
  nutrition:   { label: 'Nutrición',        icon: '🥗' },
  mixed:       { label: 'Mixto',            icon: '🎯' },
}

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  joined:          { label: 'Participando',       className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending_review:  { label: 'En revisión',        className: 'bg-amber-100  text-amber-700  border-amber-200'  },
  completed:       { label: 'Completado',         className: 'bg-blue-100   text-blue-700   border-blue-200'   },
  rejected:        { label: 'Rechazado',          className: 'bg-red-100    text-red-700    border-red-200'    },
  dropped:         { label: 'Abandonado',         className: 'bg-slate-100  text-slate-600  border-slate-200'  },
}

function EvidenceModal({
  participation,
  challengeName,
  onClose,
  onSuccess,
}: {
  participation: ChallengeParticipation
  challengeName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [note, setNote] = useState(participation.evidence_note || '')
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    if (!note.trim()) return
    setSending(true)
    try {
      await api.post(`/api/challenges/participations/${participation.id}/submit-evidence/`, {
        evidence_note: note.trim(),
      })
      showSuccess('Evidencia enviada. El coach la revisará pronto.')
      onSuccess()
      onClose()
    } catch (err) {
      showError(err, 'Error al enviar evidencia')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Enviar evidencia</h2>
            <p className="text-sm text-slate-500 mt-0.5">{challengeName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {participation.rejection_note && (
            <div className="flex gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Evidencia rechazada</p>
                <p className="text-sm text-red-700 mt-1">{participation.rejection_note}</p>
                <p className="text-xs text-red-500 mt-2">Puedes enviar una nueva evidencia.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Describe tu logro o resultado
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Levanté 120kg en sentadilla. Aquí mi resultado documentado..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition"
            />
            <p className="text-xs text-slate-400">
              Sé específico. El coach verificará tu evidencia antes de otorgarte los puntos.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl"
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!note.trim() || sending}
            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar evidencia
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MisRetosPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  useRoleGuard(gymId, ['athlete'])
  useFeatureGuard(gymId, 'retos')

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [participations, setParticipations] = useState<ChallengeParticipation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [evidenceModal, setEvidenceModal] = useState<{
    participation: ChallengeParticipation
    challengeName: string
  } | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [challengesRes, participationsRes] = await Promise.all([
        api.get<PaginatedResponse<Challenge>>('/api/challenges/challenges/', {
          params: { status: 'active' },
        }),
        api.get<PaginatedResponse<ChallengeParticipation>>('/api/challenges/participations/'),
      ])
      setChallenges(challengesRes.results || [])
      setParticipations(participationsRes.results || [])
    } catch (err) {
      showError(err, 'Error al cargar retos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const getParticipation = (challengeId: string) =>
    participations.find(p => p.challenge === challengeId)

  const handleJoin = async (challengeId: string) => {
    setJoining(challengeId)
    try {
      await api.post(`/api/challenges/challenges/${challengeId}/join/`)
      await fetchData()
      showSuccess('Te uniste al reto.')
    } catch (err) {
      showError(err, 'Error al unirse al reto')
    } finally {
      setJoining(null)
    }
  }

  const canSendEvidence = (p: ChallengeParticipation, c: Challenge) =>
    c.verification_type === 'manual' &&
    (p.status === 'joined' || p.status === 'rejected')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <PremiumGate feature="Los retos">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Retos</h1>
          <p className="text-slate-500 mt-2">Desafíos y competencias del gimnasio</p>
        </div>

        {challenges.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No hay retos activos</h3>
              <p className="text-slate-500 mt-1">
                El staff del gimnasio aún no ha creado retos. ¡Vuelve pronto!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {challenges.map((challenge) => {
              const participation = getParticipation(challenge.id)
              const joined = !!participation
              const progress = participation?.progress || 0
              const progressPct =
                challenge.goal_value > 0
                  ? Math.min((progress / challenge.goal_value) * 100, 100)
                  : 0
              const isWinner = (participation as any)?.is_winner
              const statusMeta = participation
                ? STATUS_DISPLAY[participation.status]
                : null

              return (
                <Card
                  key={challenge.id}
                  className={`border-slate-200 shadow-sm transition-shadow hover:shadow-md ${
                    isWinner
                      ? 'ring-2 ring-amber-400'
                      : joined
                      ? 'ring-1 ring-emerald-200'
                      : ''
                  }`}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">
                          {TYPE_META[challenge.type]?.icon || '🎯'}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 leading-tight">
                            {challenge.name}
                          </h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {TYPE_META[challenge.type]?.label || challenge.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isWinner && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <Medal className="w-3.5 h-3.5" />
                            Ganador
                          </span>
                        )}
                        {statusMeta && !isWinner && (
                          <Badge className={`text-xs ${statusMeta.className}`}>
                            {statusMeta.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {challenge.description}
                    </p>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Hasta {new Date(challenge.end_date).toLocaleDateString('es-PE')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        {challenge.reward_points} pts
                      </span>
                      {challenge.verification_type === 'manual' && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Verificación manual
                        </span>
                      )}
                      {challenge.responsible_name && (
                        <span>👤 {challenge.responsible_name}</span>
                      )}
                    </div>

                    {/* Progress (automático) */}
                    {joined && challenge.verification_type === 'automatic' && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">
                            Progreso: {progress}/{challenge.goal_value}
                          </span>
                          <span className="font-medium text-emerald-600">
                            {Math.round(progressPct)}%
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-2" />
                      </div>
                    )}

                    {/* Evidencia enviada */}
                    {participation?.status === 'pending_review' && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
                        <p className="text-xs font-medium text-amber-800 mb-1">
                          Evidencia en revisión
                        </p>
                        <p className="text-xs text-amber-700 line-clamp-2">
                          {participation.evidence_note}
                        </p>
                      </div>
                    )}

                    {/* Nota de rechazo */}
                    {participation?.status === 'rejected' && participation.rejection_note && (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4">
                        <p className="text-xs font-medium text-red-800 mb-1">
                          Evidencia rechazada
                        </p>
                        <p className="text-xs text-red-700 line-clamp-2">
                          {participation.rejection_note}
                        </p>
                      </div>
                    )}

                    {/* Acción principal */}
                    {!joined ? (
                      <Button
                        onClick={() => handleJoin(challenge.id)}
                        disabled={joining === challenge.id}
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      >
                        {joining === challenge.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Unirse al reto
                      </Button>
                    ) : participation && canSendEvidence(participation, challenge) ? (
                      <Button
                        onClick={() =>
                          setEvidenceModal({
                            participation,
                            challengeName: challenge.name,
                          })
                        }
                        className={`w-full rounded-xl ${
                          participation.status === 'rejected'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {participation.status === 'rejected'
                          ? 'Reenviar evidencia'
                          : 'Enviar evidencia'}
                      </Button>
                    ) : (
                      <Button
                        disabled
                        variant="outline"
                        className="w-full rounded-xl cursor-not-allowed opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {participation?.status === 'pending_review'
                          ? 'Esperando revisión'
                          : participation?.status === 'completed'
                          ? 'Completado'
                          : 'Participando'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {evidenceModal && (
        <EvidenceModal
          participation={evidenceModal.participation}
          challengeName={evidenceModal.challengeName}
          onClose={() => setEvidenceModal(null)}
          onSuccess={fetchData}
        />
      )}
    </PremiumGate>
  )
}
