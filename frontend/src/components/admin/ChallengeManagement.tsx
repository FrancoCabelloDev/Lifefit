'use client'

import { useState, useEffect, useCallback } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Challenge = {
  id: string
  gym: string | null
  name: string
  description: string
  type: 'attendance' | 'distance' | 'workouts' | 'nutrition' | 'mixed'
  start_date: string
  end_date: string
  reward_points: number
  goal_value: number
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

type ChallengeStats = {
  total: number
  active: number
  completed: number
  draft: number
}

type Gym = {
  id: string
  name: string
}

type ChallengeManagementProps = {
  token: string
  userGymId?: string | null
}

const CHALLENGE_TYPES = {
  attendance: { label: 'Asistencia', icon: '📅', color: 'bg-blue-100 text-blue-700' },
  distance: { label: 'Distancia', icon: '🏃', color: 'bg-purple-100 text-purple-700' },
  workouts: { label: 'Entrenamientos', icon: '💪', color: 'bg-emerald-100 text-emerald-700' },
  nutrition: { label: 'Nutrición', icon: '🥗', color: 'bg-orange-100 text-orange-700' },
  mixed: { label: 'Mixto', icon: '🎯', color: 'bg-pink-100 text-pink-700' },
}

const CHALLENGE_STATUS = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archivado', color: 'bg-slate-100 text-slate-600' },
}

export default function ChallengeManagement({ token, userGymId }: ChallengeManagementProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/challenges/challenges/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setChallenges(Array.isArray(data) ? data : data.results ?? [])
      }
      setError('')
    } catch (err) {
      setError('Error al cargar retos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchGyms = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gyms/gyms/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setGyms(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (err) {
      console.error('Error loading gyms:', err)
    }
  }, [token])

  useEffect(() => {
    fetchChallenges()
    fetchGyms()
  }, [fetchChallenges, fetchGyms])

  const stats: ChallengeStats = {
    total: challenges.length,
    active: challenges.filter((c) => c.status === 'active').length,
    completed: challenges.filter((c) => c.status === 'completed').length,
    draft: challenges.filter((c) => c.status === 'draft').length,
  }

  const filteredChallenges = challenges.filter((challenge) => {
    if (filterStatus !== 'all' && challenge.status !== filterStatus) return false
    if (filterType !== 'all' && challenge.type !== filterType) return false
    return true
  })

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este reto?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/challenges/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setChallenges((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (err) {
      setError('Error al eliminar reto')
      console.error(err)
    }
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Retos</h2>
          <p className="mt-1 text-sm text-slate-600">Crea y administra retos para tus atletas</p>
        </div>
        <button
          onClick={() => {
            setEditingChallenge(null)
            setShowModal(true)
          }}
          className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
        >
          + Crear Reto
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-full bg-slate-100 p-3">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Activos</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completados</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Borradores</p>
              <p className="mt-2 text-3xl font-bold text-slate-600">{stats.draft}</p>
            </div>
            <div className="rounded-full bg-slate-100 p-3">
              <span className="text-2xl">📝</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
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
          onChange={(e) => setFilterType(e.target.value)}
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

      {/* Challenges List */}
      {loading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Cargando retos...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-slate-600">No hay retos disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChallenges.map((challenge) => {
            const typeInfo = CHALLENGE_TYPES[challenge.type]
            const statusInfo = CHALLENGE_STATUS[challenge.status]
            const daysRemaining = getDaysRemaining(challenge.end_date)
            const isActive = challenge.status === 'active'

            return (
              <div
                key={challenge.id}
                className="rounded-2xl bg-white border border-slate-200 p-6 transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{challenge.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">{challenge.description}</p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">📅 Inicio:</span>
                        <span className="font-medium text-slate-900">
                          {new Date(challenge.start_date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">🏁 Fin:</span>
                        <span className="font-medium text-slate-900">
                          {new Date(challenge.end_date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      {isActive && daysRemaining > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">⏱️</span>
                          <span className="font-medium text-emerald-600">
                            {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">🎁</span>
                        <span className="font-medium text-amber-600">{challenge.reward_points} puntos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">🎯 Meta:</span>
                        <span className="font-medium text-slate-900">{challenge.goal_value}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(challenge)}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(challenge.id)}
                      className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ChallengeModal
          token={token}
          challenge={editingChallenge}
          gyms={gyms}
          userGymId={userGymId}
          onClose={() => {
            setShowModal(false)
            setEditingChallenge(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingChallenge(null)
            fetchChallenges()
          }}
        />
      )}
    </div>
  )
}

type ChallengeModalProps = {
  token: string
  challenge: Challenge | null
  gyms: Gym[]
  userGymId?: string | null
  onClose: () => void
  onSave: () => void
}

function ChallengeModal({ token, challenge, gyms, userGymId, onClose, onSave }: ChallengeModalProps) {
  const [form, setForm] = useState({
    gym: challenge?.gym ?? userGymId ?? '',
    name: challenge?.name ?? '',
    description: challenge?.description ?? '',
    type: challenge?.type ?? 'workouts',
    start_date: challenge?.start_date ?? '',
    end_date: challenge?.end_date ?? '',
    reward_points: challenge?.reward_points ?? 100,
    goal_value: challenge?.goal_value ?? 10,
    status: challenge?.status ?? 'draft',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const url = challenge
        ? `${API_BASE_URL}/api/challenges/challenges/${challenge.id}/`
        : `${API_BASE_URL}/api/challenges/challenges/`

      const response = await fetch(url, {
        method: challenge ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al guardar reto')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {challenge ? 'Editar Reto' : 'Crear Reto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nombre del reto</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              required
              placeholder="Ej: Desafío 30 días"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              rows={3}
              placeholder="Describe el reto..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Challenge['type'] })}
                className={inputClass}
                required
              >
                <option value="workouts">Entrenamientos</option>
                <option value="attendance">Asistencia</option>
                <option value="distance">Distancia</option>
                <option value="nutrition">Nutrición</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Challenge['status'] })}
                className={inputClass}
                required
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fecha de inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fecha de fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meta (valor objetivo)</label>
              <input
                type="number"
                value={form.goal_value}
                onChange={(e) => setForm({ ...form, goal_value: parseInt(e.target.value) || 0 })}
                className={inputClass}
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Puntos de recompensa</label>
              <input
                type="number"
                value={form.reward_points}
                onChange={(e) => setForm({ ...form, reward_points: parseInt(e.target.value) || 0 })}
                className={inputClass}
                required
                min="0"
              />
            </div>
          </div>

          {gyms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gimnasio (opcional)</label>
              <select
                value={form.gym}
                onChange={(e) => setForm({ ...form, gym: e.target.value })}
                className={inputClass}
              >
                <option value="">Global (todos los gimnasios)</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : challenge ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
