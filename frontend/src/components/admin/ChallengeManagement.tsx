'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Check, Trophy, Medal, Users, AlertCircle,
  ChevronDown, ChevronUp, Loader2, ClipboardList,
} from 'lucide-react'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { showError, showSuccess } from '@/lib/toast'
import type { Challenge as ChallengeType, StaffMember, User } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingParticipation = {
  id: string
  challenge: string
  challenge_detail: { id: string; name: string; reward_points: number } | null
  user: string
  user_detail: { id: string; email: string; first_name?: string; last_name?: string } | null
  progress: number
  status: string
  evidence_note: string
  rejection_note: string
  points_earned: number
  is_winner: boolean
}

type LeaderboardEntry = {
  participation_id: string
  user_id: string
  full_name: string
  progress: number
  progress_pct: number
  points_earned: number
  status: string
  is_winner: boolean
}

type ChallengeManagementProps = {
  token: string
  userGymId?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHALLENGE_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  attendance: { label: 'Asistencia',    icon: '📅', color: 'bg-blue-100 text-blue-700'     },
  distance:   { label: 'Distancia',     icon: '🏃', color: 'bg-purple-100 text-purple-700' },
  workouts:   { label: 'Entrenamientos',icon: '💪', color: 'bg-emerald-100 text-emerald-700'},
  nutrition:  { label: 'Nutrición',     icon: '🥗', color: 'bg-orange-100 text-orange-700' },
  mixed:      { label: 'Mixto',         icon: '🎯', color: 'bg-pink-100 text-pink-700'     },
}

const CHALLENGE_STATUS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Borrador',   color: 'bg-slate-100 text-slate-700'   },
  active:    { label: 'Activo',     color: 'bg-emerald-100 text-emerald-700'},
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700'     },
  archived:  { label: 'Archivado',  color: 'bg-slate-100 text-slate-600'   },
}

const ROLE_LABELS: Record<string, string> = {
  gym_admin: 'Administrador', coach: 'Coach',
  nutritionist: 'Nutricionista', receptionist: 'Recepción',
}

// ─── Helper components ────────────────────────────────────────────────────────

function RejectModal({
  participation,
  onClose,
  onSuccess,
}: {
  participation: PendingParticipation
  onClose: () => void
  onSuccess: () => void
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const name = participation.user_detail
    ? `${participation.user_detail.first_name ?? ''} ${participation.user_detail.last_name ?? ''}`.trim() ||
      participation.user_detail.email
    : 'Atleta'

  const handleReject = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await api.post(`/api/challenges/participations/${participation.id}/reject/`, {
        rejection_note: note.trim(),
      })
      showSuccess('Evidencia rechazada. Se notificó al atleta.')
      onSuccess()
      onClose()
    } catch (err) {
      showError(err, 'Error al rechazar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Rechazar evidencia</h2>
            <p className="text-sm text-slate-500 mt-0.5">{name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Evidencia enviada</p>
            <p className="text-sm text-slate-700">{participation.evidence_note}</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Motivo del rechazo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Explica al atleta por qué su evidencia no es válida..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none transition"
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} disabled={saving} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleReject}
            disabled={!note.trim() || saving}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Rechazar evidencia
          </button>
        </div>
      </div>
    </div>
  )
}

function DeclareWinnerModal({
  challenge,
  leaderboard,
  onClose,
  onSuccess,
}: {
  challenge: ChallengeType
  leaderboard: LeaderboardEntry[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedId, setSelectedId] = useState('')
  const [bonusPoints, setBonusPoints] = useState(0)
  const [saving, setSaving] = useState(false)

  const handleDeclare = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await api.post(`/api/challenges/challenges/${challenge.id}/declare-winner/`, {
        participation_id: selectedId,
        bonus_points: bonusPoints,
      })
      showSuccess('¡Ganador declarado! Todos los atletas fueron notificados.')
      onSuccess()
      onClose()
    } catch (err) {
      showError(err, 'Error al declarar ganador')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Declarar ganador</h2>
            <p className="text-sm text-slate-500 mt-0.5">{challenge.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Selecciona al ganador
            </label>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No hay participantes en este reto aún.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {leaderboard.map((entry, i) => (
                  <label
                    key={entry.participation_id}
                    className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedId === entry.participation_id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="winner"
                      value={entry.participation_id}
                      checked={selectedId === entry.participation_id}
                      onChange={() => setSelectedId(entry.participation_id)}
                      className="sr-only"
                    />
                    <span className={`text-lg font-bold w-8 text-center ${
                      i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-400'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{entry.full_name}</p>
                      <p className="text-xs text-slate-500">
                        Progreso: {entry.progress} — {entry.progress_pct}%
                      </p>
                    </div>
                    {entry.is_winner && (
                      <span className="text-xs text-amber-600 font-medium">Ya ganador</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Puntos bonus para el ganador <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              min={0}
              value={bonusPoints}
              onChange={e => setBonusPoints(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="0"
            />
            <p className="text-xs text-slate-400">
              Se suman a los {challenge.reward_points} pts base del reto.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} disabled={saving} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleDeclare}
            disabled={!selectedId || saving || leaderboard.length === 0}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Trophy className="w-4 h-4" />
            Declarar ganador
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChallengeManagement({ token, userGymId }: ChallengeManagementProps) {
  const [challenges, setChallenges] = useState<ChallengeType[]>([])
  const [pendingList, setPendingList] = useState<PendingParticipation[]>([])
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'retos' | 'revision'>('retos')

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')

  const [showModal, setShowModal]             = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<ChallengeType | null>(null)
  const [deleteId, setDeleteId]               = useState<string | null>(null)
  const [isDeleting, setIsDeleting]           = useState(false)
  const [rejectTarget, setRejectTarget]       = useState<PendingParticipation | null>(null)
  const [winnerModal, setWinnerModal]         = useState<ChallengeType | null>(null)

  const storedUser  = getStoredUser<User>()
  const currentRole = storedUser?.role

  const canManage = () =>
    currentRole === 'super_admin' || currentRole === 'gym_admin' || currentRole === 'coach'

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<any>('/api/challenges/challenges/')
      setChallenges(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err) {
      showError(err, 'Error al cargar retos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPending = useCallback(async () => {
    setPendingLoading(true)
    try {
      const data = await api.get<any>('/api/challenges/participations/pending-review/')
      setPendingList(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err) {
      showError(err, 'Error al cargar bandeja de revisión')
    } finally {
      setPendingLoading(false)
    }
  }, [])

  const fetchLeaderboard = async (challengeId: string) => {
    if (leaderboards[challengeId]) return
    try {
      const data = await api.get<LeaderboardEntry[]>(
        `/api/challenges/challenges/${challengeId}/leaderboard/`
      )
      setLeaderboards(prev => ({ ...prev, [challengeId]: data }))
    } catch {
      setLeaderboards(prev => ({ ...prev, [challengeId]: [] }))
    }
  }

  useEffect(() => { fetchChallenges() }, [fetchChallenges])

  useEffect(() => {
    if (activeTab === 'revision') fetchPending()
  }, [activeTab, fetchPending])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = async (p: PendingParticipation) => {
    try {
      await api.post(`/api/challenges/participations/${p.id}/approve/`)
      const name = p.user_detail
        ? `${p.user_detail.first_name ?? ''} ${p.user_detail.last_name ?? ''}`.trim() ||
          p.user_detail.email
        : 'Atleta'
      showSuccess(`Evidencia de ${name} aprobada. Puntos otorgados.`)
      fetchPending()
    } catch (err) {
      showError(err, 'Error al aprobar')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/challenges/challenges/${deleteId}/`)
      setChallenges(prev => prev.filter(c => c.id !== deleteId))
      showSuccess('Reto eliminado.')
      setDeleteId(null)
    } catch (err) {
      showError(err, 'Error al eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleLeaderboard = async (challengeId: string) => {
    if (expandedLeaderboard === challengeId) {
      setExpandedLeaderboard(null)
    } else {
      setExpandedLeaderboard(challengeId)
      await fetchLeaderboard(challengeId)
    }
  }

  const getDaysRemaining = (endDate: string) => {
    const diff = Math.ceil(
      (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return diff
  }

  const formatTime = (t: string | null) => (!t ? '' : t.slice(0, 5))

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredChallenges = challenges.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterType   !== 'all' && c.type   !== filterType)   return false
    return true
  })

  const stats = {
    total:     challenges.length,
    active:    challenges.filter(c => c.status === 'active').length,
    completed: challenges.filter(c => c.status === 'completed').length,
    draft:     challenges.filter(c => c.status === 'draft').length,
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Retos</h2>
          <p className="mt-1 text-sm text-slate-500">Crea retos y verifica la participación de tus atletas</p>
        </div>
        {canManage() && (
          <button
            onClick={() => { setEditingChallenge(null); setShowModal(true) }}
            className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            + Crear Reto
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total',      value: stats.total,     icon: '🎯', color: 'text-slate-700' },
          { label: 'Activos',    value: stats.active,    icon: '✅', color: 'text-emerald-600'},
          { label: 'Completados',value: stats.completed, icon: '🏆', color: 'text-blue-600'   },
          { label: 'Borradores', value: stats.draft,     icon: '📝', color: 'text-slate-500'  },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{s.label}</p>
                <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <div className="rounded-full bg-slate-50 p-3 text-2xl">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('retos')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'retos'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Retos
        </button>
        <button
          onClick={() => setActiveTab('revision')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'revision'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Bandeja de revisión
          {pendingList.length > 0 && (
            <span className="rounded-full bg-amber-500 text-white text-xs font-bold px-2 py-0.5 min-w-[20px] text-center">
              {pendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab: Retos ────────────────────────────────────────────────────────── */}
      {activeTab === 'retos' && (
        <>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="completed">Completado</option>
              <option value="archived">Archivado</option>
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">Todos los tipos</option>
              <option value="attendance">Asistencia</option>
              <option value="distance">Distancia</option>
              <option value="workouts">Entrenamientos</option>
              <option value="nutrition">Nutrición</option>
              <option value="mixed">Mixto</option>
            </select>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
              <p className="text-slate-500">No hay retos disponibles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChallenges.map(challenge => {
                const typeInfo   = CHALLENGE_TYPES[challenge.type]
                const statusInfo = CHALLENGE_STATUS[challenge.status]
                const days       = getDaysRemaining(challenge.end_date)
                const board      = leaderboards[challenge.id] ?? []
                const isExpanded = expandedLeaderboard === challenge.id

                return (
                  <div
                    key={challenge.id}
                    className="rounded-2xl bg-white border border-slate-200 p-6 transition hover:border-emerald-300 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{challenge.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              {challenge.verification_type === 'manual' && (
                                <span className="rounded-full px-3 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                                  Verificación manual
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-slate-600 line-clamp-2">{challenge.description}</p>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                          <span>📅 {new Date(challenge.start_date).toLocaleDateString('es-PE')}
                            {challenge.start_time && ` ${formatTime(challenge.start_time)}`}
                          </span>
                          <span>🏁 {new Date(challenge.end_date).toLocaleDateString('es-PE')}</span>
                          {challenge.status === 'active' && days > 0 && (
                            <span className="text-emerald-600 font-medium">
                              ⏱ {days} {days === 1 ? 'día' : 'días'} restantes
                            </span>
                          )}
                          <span>🎁 <span className="text-amber-600 font-medium">{challenge.reward_points} pts</span></span>
                          <span>🎯 Meta: {challenge.goal_value}</span>
                          {challenge.responsible_name && (
                            <span>👤 {challenge.responsible_name}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: actions */}
                      {canManage() && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => { setEditingChallenge(challenge); setShowModal(true) }}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteId(challenge.id)}
                            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                          {challenge.status === 'active' && (
                            <button
                              onClick={() => {
                                setWinnerModal(challenge)
                                fetchLeaderboard(challenge.id)
                              }}
                              className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 flex items-center gap-1.5 justify-center"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Ganador
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Leaderboard toggle */}
                    <button
                      onClick={() => toggleLeaderboard(challenge.id)}
                      className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Ver participantes
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                        {board.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-6">
                            Sin participantes aún.
                          </p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-xs text-slate-500">
                                <th className="px-4 py-2.5 text-left font-medium">#</th>
                                <th className="px-4 py-2.5 text-left font-medium">Atleta</th>
                                <th className="px-4 py-2.5 text-right font-medium">Progreso</th>
                                <th className="px-4 py-2.5 text-right font-medium">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {board.map((entry, i) => (
                                <tr
                                  key={entry.participation_id}
                                  className={`border-b border-slate-100 last:border-0 ${
                                    entry.is_winner ? 'bg-amber-50' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 font-bold text-base">
                                    {entry.is_winner ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {entry.full_name}
                                    {entry.is_winner && (
                                      <span className="ml-2 text-xs font-semibold text-amber-600">Ganador</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">
                                    {entry.progress} <span className="text-slate-400">({entry.progress_pct}%)</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      entry.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                      entry.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {entry.status === 'completed' ? 'Completado' :
                                       entry.status === 'pending_review' ? 'En revisión' : 'Participando'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Bandeja de revisión ───────────────────────────────────────────── */}
      {activeTab === 'revision' && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : pendingList.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
              <Check className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <h3 className="text-base font-semibold text-slate-700">Todo al día</h3>
              <p className="text-sm text-slate-500 mt-1">
                No hay evidencias pendientes de revisión.
              </p>
            </div>
          ) : (
            pendingList.map(p => {
              const name = p.user_detail
                ? `${p.user_detail.first_name ?? ''} ${p.user_detail.last_name ?? ''}`.trim() ||
                  p.user_detail.email
                : 'Atleta desconocido'

              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Athlete + challenge */}
                      <div>
                        <p className="font-semibold text-slate-900">{name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Reto: <span className="font-medium text-slate-700">
                            {p.challenge_detail?.name ?? '—'}
                          </span>
                          {p.challenge_detail?.reward_points != null && (
                            <span className="ml-2 text-amber-600 font-medium">
                              +{p.challenge_detail.reward_points} pts
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Evidence */}
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-xs font-medium text-slate-500">Evidencia enviada</p>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {p.evidence_note}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(p)}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition"
                      >
                        <Check className="w-4 h-4" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectTarget(p)}
                        className="flex items-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}

      {rejectTarget && (
        <RejectModal
          participation={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={fetchPending}
        />
      )}

      {winnerModal && (
        <DeclareWinnerModal
          challenge={winnerModal}
          leaderboard={leaderboards[winnerModal.id] ?? []}
          onClose={() => setWinnerModal(null)}
          onSuccess={() => {
            fetchChallenges()
            setLeaderboards(prev => {
              const copy = { ...prev }
              delete copy[winnerModal.id]
              return copy
            })
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white overflow-hidden shadow-2xl">
            <div className="bg-rose-600 px-8 pt-8 pb-6 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 text-2xl">🗑️</div>
              <h3 className="text-2xl font-bold">Eliminar reto</h3>
              <p className="text-rose-100 mt-1">Esta acción no se puede deshacer.</p>
            </div>
            <div className="px-8 py-6 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Se eliminará el reto y todas las participaciones asociadas.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ChallengeModal
          token={token}
          challenge={editingChallenge}
          userGymId={userGymId}
          onClose={() => { setShowModal(false); setEditingChallenge(null) }}
          onSave={() => { setShowModal(false); setEditingChallenge(null); fetchChallenges() }}
        />
      )}
    </div>
  )
}

// ─── Create / Edit Modal (unchanged logic, cleaned style) ─────────────────────

type ChallengeModalProps = {
  token: string
  challenge: ChallengeType | null
  userGymId?: string | null
  onClose: () => void
  onSave: () => void
}

function ChallengeModal({ token, challenge, userGymId, onClose, onSave }: ChallengeModalProps) {
  const [form, setForm] = useState({
    name:          challenge?.name          ?? '',
    description:   challenge?.description   ?? '',
    type:          challenge?.type          ?? 'workouts',
    start_date:    challenge?.start_date    ?? '',
    start_time:    challenge?.start_time    ?? '',
    end_date:      challenge?.end_date      ?? '',
    responsible:   challenge?.responsible   ?? '',
    reward_points: challenge?.reward_points ?? 100,
    goal_value:    challenge?.goal_value    ?? 10,
    status:        challenge?.status        ?? 'active',
  })
  const [staff, setStaff]   = useState<StaffMember[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('lifefit_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        if (!challenge) setForm(prev => ({ ...prev, responsible: user.id || '' }))
      } catch {}
    }
    api.get<any>('/api/auth/gym-members/')
      .then(d => setStaff(Array.isArray(d) ? d : d?.results ?? []))
      .catch(() => {})
  }, [challenge])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload: any = { ...form }
    if (!payload.start_time) delete payload.start_time
    try {
      if (challenge) {
        await api.patch(`/api/challenges/challenges/${challenge.id}/`, payload)
      } else {
        await api.post('/api/challenges/challenges/', payload)
      }
      onSave()
    } catch (err: any) {
      setError(
        err?.data?.detail || err?.data?.non_field_errors?.[0] || err?.message || 'Error al guardar'
      )
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            {challenge ? 'Editar Reto' : 'Crear Reto'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del reto</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className={inp} required placeholder="Ej: Mejor marca en sentadilla del mes" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className={inp} rows={3} placeholder="Describe el reto y cómo se mide el progreso..." />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className={inp} required>
                <option value="workouts">Entrenamientos</option>
                <option value="attendance">Asistencia</option>
                <option value="distance">Distancia</option>
                <option value="nutrition">Nutrición</option>
                <option value="mixed">Mixto (manual)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Estado inicial</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={inp} required>
                <option value="active">Activo (notifica a atletas)</option>
                <option value="draft">Borrador</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de inicio</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hora de inicio</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de fin</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Encargado del reto</label>
              <select value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className={inp}>
                {staff.length > 0 ? (
                  <>
                    <option value="">Seleccionar encargado</option>
                    {staff.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name} ({ROLE_LABELS[m.role] || m.role})
                      </option>
                    ))}
                  </>
                ) : (
                  <option value={form.responsible}>Tú (creador del reto)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Meta (valor objetivo)</label>
              <input type="number" value={form.goal_value} onChange={e => setForm({ ...form, goal_value: parseInt(e.target.value) || 0 })}
                className={inp} required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Puntos de recompensa</label>
              <input type="number" value={form.reward_points} onChange={e => setForm({ ...form, reward_points: parseInt(e.target.value) || 0 })}
                className={inp} required min="0" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
              {saving ? 'Guardando...' : challenge ? 'Actualizar reto' : 'Crear reto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
