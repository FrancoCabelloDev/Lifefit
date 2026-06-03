'use client'

import { useState, useEffect, useCallback } from 'react'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { showError, showSuccess } from '@/lib/toast'
import type { Challenge as ChallengeType, StaffMember, User } from '@/lib/types'

type ChallengeStats = {
  total: number
  active: number
  completed: number
  draft: number
}

type ChallengeManagementProps = {
  token: string
  userGymId?: string | null
}

const CHALLENGE_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  attendance: { label: 'Asistencia', icon: '📅', color: 'bg-blue-100 text-blue-700' },
  distance: { label: 'Distancia', icon: '🏃', color: 'bg-purple-100 text-purple-700' },
  workouts: { label: 'Entrenamientos', icon: '💪', color: 'bg-emerald-100 text-emerald-700' },
  nutrition: { label: 'Nutrición', icon: '🥗', color: 'bg-orange-100 text-orange-700' },
  mixed: { label: 'Mixto', icon: '🎯', color: 'bg-pink-100 text-pink-700' },
}

const CHALLENGE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700' },
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archivado', color: 'bg-slate-100 text-slate-600' },
}

const ROLE_LABELS: Record<string, string> = {
  gym_admin: 'Administrador',
  coach: 'Coach',
  nutritionist: 'Nutricionista',
  receptionist: 'Recepción',
}

export default function ChallengeManagement({ token, userGymId }: ChallengeManagementProps) {
  const [challenges, setChallenges] = useState<ChallengeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<ChallengeType | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const storedUser = getStoredUser<User>()
  const currentRole = storedUser?.role
  const currentGymId = storedUser?.gym ? String(storedUser.gym) : null

  // Un reto es "propio" si el gym admin lo creó (gym coincide) o es super_admin
  const canManage = (challenge: ChallengeType) => {
    if (currentRole === 'super_admin') return true
    if (currentRole === 'gym_admin') return challenge.gym !== null && String(challenge.gym) === currentGymId
    return false
  }

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<any>("/api/challenges/challenges/")
      setChallenges(Array.isArray(data) ? data : data?.results ?? [])
      setError('')
    } catch (err) {
      setError('Error al cargar retos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

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

  const handleEdit = (challenge: ChallengeType) => {
    setEditingChallenge(challenge)
    setShowModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/challenges/challenges/${deleteId}/`)
      setChallenges((prev) => prev.filter((c) => c.id !== deleteId))
      showSuccess('Reto eliminado correctamente.')
      setDeleteId(null)
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Error al eliminar el reto'
      showError(msg, 'No se pudo eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    return `${hours}:${minutes}`
  }

  return (
    <div className="space-y-6">
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
                          {challenge.start_time && ` ${formatTime(challenge.start_time)}`}
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
                      {challenge.responsible_name && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">👤 Encargado:</span>
                          <span className="font-medium text-slate-900">{challenge.responsible_name}</span>
                          {challenge.responsible_role && (
                            <span className="text-xs text-slate-400">
                              ({ROLE_LABELS[challenge.responsible_role] || challenge.responsible_role})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {canManage(challenge) ? (
                      <>
                        <button
                          onClick={() => handleEdit(challenge)}
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
                      </>
                    ) : (
                      <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400 border border-slate-100">
                        Solo lectura
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmación de eliminación */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white overflow-hidden shadow-2xl">
            <div className="bg-rose-600 px-8 pt-8 pb-6 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 text-2xl">🗑️</div>
              <h3 className="text-2xl font-bold">Eliminar reto</h3>
              <p className="text-rose-100 mt-1 font-medium">Esta acción no se puede deshacer.</p>
            </div>
            <div className="px-8 py-6 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Se eliminará el reto y todas las participaciones de atletas asociadas a él.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition disabled:opacity-50"
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
  challenge: ChallengeType | null
  userGymId?: string | null
  onClose: () => void
  onSave: () => void
}

function ChallengeModal({ token, challenge, userGymId, onClose, onSave }: ChallengeModalProps) {
  const [form, setForm] = useState({
    name: challenge?.name ?? '',
    description: challenge?.description ?? '',
    type: challenge?.type ?? 'workouts',
    start_date: challenge?.start_date ?? '',
    start_time: challenge?.start_time ?? '',
    end_date: challenge?.end_date ?? '',
    responsible: challenge?.responsible ?? '',
    reward_points: challenge?.reward_points ?? 100,
    goal_value: challenge?.goal_value ?? 10,
    status: challenge?.status ?? 'draft',
  })
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('lifefit_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setCurrentUserRole(user.role || '')
        if (!challenge) {
          setForm(prev => ({ ...prev, responsible: user.id || '' }))
        }
      } catch {}
    }

    const fetchStaff = async () => {
      try {
        const data = await api.get<any>('/api/auth/gym-members/')
        const members: StaffMember[] = Array.isArray(data) ? data : data?.results ?? []
        setStaff(members)
      } catch {
        console.log('No se pudo cargar el staff')
      }
    }
    fetchStaff()
  }, [challenge])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form }
    if (!payload.start_time) delete (payload as any).start_time

    try {
      if (challenge) {
        await api.patch(`/api/challenges/challenges/${challenge.id}/`, payload)
      } else {
        await api.post("/api/challenges/challenges/", payload)
      }
      onSave()
    } catch (err: any) {
      setError(err?.data?.detail || err?.data?.non_field_errors?.[0] || err?.message || 'Error al guardar')
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
                onChange={(e) => setForm({ ...form, type: e.target.value as ChallengeType['type'] })}
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
                onChange={(e) => setForm({ ...form, status: e.target.value as ChallengeType['status'] })}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Hora de inicio</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Encargado del reto</label>
              <select
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                className={inputClass}
              >
                {staff.length > 0 ? (
                  <>
                    <option value="">Seleccionar encargado</option>
                    {staff.map((m) => (
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
