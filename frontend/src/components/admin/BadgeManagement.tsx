'use client'

import { useState, useEffect, useCallback } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Badge = {
  id: string
  gym: string
  name: string
  description: string
  icon: string
  condition: string
  created_at: string
  updated_at: string
}

type UserBadge = {
  id: string
  user: string
  badge: string
  badge_detail: Badge
  awarded_at: string
}

type Gym = {
  id: string
  name: string
}

type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

type BadgeManagementProps = {
  token: string
  userGymId?: string | null
}

const BADGE_ICONS = ['🏆', '🥇', '🥈', '🥉', '⭐', '💎', '👑', '🔥', '💪', '🎯', '⚡', '🌟', '✨', '🎖️', '🏅']

const RARITY_COLORS = {
  common: 'bg-slate-100 text-slate-700 border-slate-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300',
  legendary: 'bg-amber-100 text-amber-700 border-amber-300',
}

export default function BadgeManagement({ token, userGymId }: BadgeManagementProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [gyms, setGyms] = useState<Gym[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/challenges/badges/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setBadges(Array.isArray(data) ? data : data.results ?? [])
      }
      setError('')
    } catch (err) {
      setError('Error al cargar insignias')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchUserBadges = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/user-badges/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUserBadges(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (err) {
      console.error('Error loading user badges:', err)
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

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }, [token])

  useEffect(() => {
    fetchBadges()
    fetchUserBadges()
    fetchGyms()
    fetchUsers()
  }, [fetchBadges, fetchUserBadges, fetchGyms, fetchUsers])

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge)
    setShowBadgeModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta insignia?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/badges/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setBadges((prev) => prev.filter((b) => b.id !== id))
      }
    } catch (err) {
      setError('Error al eliminar insignia')
      console.error(err)
    }
  }

  const handleAwardBadge = (badge: Badge) => {
    setSelectedBadge(badge)
    setShowAwardModal(true)
  }

  const getUsersWithBadge = (badgeId: string) => {
    return userBadges.filter((ub) => ub.badge === badgeId).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Insignias</h2>
          <p className="mt-1 text-sm text-slate-600">Crea y administra el sistema de medallas</p>
        </div>
        <button
          onClick={() => {
            setEditingBadge(null)
            setShowBadgeModal(true)
          }}
          className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600"
        >
          + Crear Insignia
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Insignias</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{badges.length}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-3">
              <span className="text-2xl">🏅</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Insignias Otorgadas</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{userBadges.length}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3">
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuarios con Insignias</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {new Set(userBadges.map((ub) => ub.user)).size}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Cargando insignias...</p>
        </div>
      ) : badges.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <span className="text-6xl">🏅</span>
          <p className="mt-4 text-lg font-medium text-slate-900">No hay insignias creadas</p>
          <p className="mt-1 text-sm text-slate-600">Comienza creando tu primera insignia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => {
            const usersCount = getUsersWithBadge(badge.id)

            return (
              <div
                key={badge.id}
                className="rounded-2xl bg-white border border-slate-200 p-6 transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-amber-100 to-amber-200 text-3xl">
                      {badge.icon || '🏆'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{badge.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{usersCount} usuarios</p>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600 line-clamp-2">{badge.description}</p>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">Condición:</p>
                  <p className="text-sm text-slate-700">{badge.condition}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleAwardBadge(badge)}
                    className="flex-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Otorgar
                  </button>
                  <button
                    onClick={() => handleEdit(badge)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(badge.id)}
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent Awards */}
      {userBadges.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Insignias Otorgadas Recientemente</h3>
          <div className="space-y-3">
            {userBadges.slice(0, 5).map((userBadge) => (
              <div key={userBadge.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{userBadge.badge_detail.icon || '🏆'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{userBadge.badge_detail.name}</p>
                    <p className="text-xs text-slate-500">Usuario ID: {userBadge.user}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(userBadge.awarded_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <BadgeModal
          token={token}
          badge={editingBadge}
          gyms={gyms}
          userGymId={userGymId}
          onClose={() => {
            setShowBadgeModal(false)
            setEditingBadge(null)
          }}
          onSave={() => {
            setShowBadgeModal(false)
            setEditingBadge(null)
            fetchBadges()
          }}
        />
      )}

      {/* Award Badge Modal */}
      {showAwardModal && selectedBadge && (
        <AwardBadgeModal
          token={token}
          badge={selectedBadge}
          users={users}
          onClose={() => {
            setShowAwardModal(false)
            setSelectedBadge(null)
          }}
          onSave={() => {
            setShowAwardModal(false)
            setSelectedBadge(null)
            fetchUserBadges()
          }}
        />
      )}
    </div>
  )
}

type BadgeModalProps = {
  token: string
  badge: Badge | null
  gyms: Gym[]
  userGymId?: string | null
  onClose: () => void
  onSave: () => void
}

function BadgeModal({ token, badge, gyms, userGymId, onClose, onSave }: BadgeModalProps) {
  const [form, setForm] = useState({
    gym: badge?.gym ?? userGymId ?? '',
    name: badge?.name ?? '',
    description: badge?.description ?? '',
    icon: badge?.icon ?? '🏆',
    condition: badge?.condition ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const url = badge
        ? `${API_BASE_URL}/api/challenges/badges/${badge.id}/`
        : `${API_BASE_URL}/api/challenges/badges/`

      // Enviar solo los campos no vacíos
      const payload = {
        ...form,
        gym: form.gym || null, // Si está vacío, enviar null para insignia global
      }

      const response = await fetch(url, {
        method: badge ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMsg = typeof data === 'object' 
          ? (data.gym?.[0] || data.detail || data.message || 'Error al guardar insignia')
          : 'Error al guardar insignia'
        throw new Error(errorMsg)
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            {badge ? 'Editar Insignia' : 'Crear Insignia'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              required
              placeholder="Ej: Campeón de la Semana"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              rows={3}
              placeholder="Describe qué representa esta insignia..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ícono</label>
            <div className="grid grid-cols-8 gap-2 mb-3">
              {BADGE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`rounded-xl p-3 text-2xl transition ${
                    form.icon === icon ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className={inputClass}
              placeholder="O ingresa tu propio emoji"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Condición para obtenerla</label>
            <input
              type="text"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className={inputClass}
              required
              placeholder="Ej: Completar 10 entrenamientos en un mes"
            />
          </div>

          {gyms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Gimnasio <span className="text-xs text-slate-500">(opcional - dejar vacío para insignia global)</span>
              </label>
              <select
                value={form.gym}
                onChange={(e) => setForm({ ...form, gym: e.target.value })}
                className={inputClass}
              >
                <option value="">🌍 Insignia Global (Todos los gimnasios)</option>
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
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : badge ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type AwardBadgeModalProps = {
  token: string
  badge: Badge
  users: User[]
  onClose: () => void
  onSave: () => void
}

function AwardBadgeModal({ token, badge, users, onClose, onSave }: AwardBadgeModalProps) {
  const [selectedUser, setSelectedUser] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar usuarios excluyendo administradores
  const filteredUsers = users.filter((user) => {
    if (user.role === 'super_admin') return false
    const fullName = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/user-badges/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: selectedUser,
          badge: badge.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error al otorgar insignia')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al otorgar')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Otorgar Insignia</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
            ✕
          </button>
        </div>

        <div className="mb-6 rounded-2xl bg-linear-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 p-4 text-center border border-amber-200 dark:border-amber-700">
          <span className="text-5xl">{badge.icon}</span>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">{badge.name}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{badge.description}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Buscar usuario</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
              placeholder="Buscar por nombre o email..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seleccionar usuario</label>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">No se encontraron usuarios</p>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition ${
                      selectedUser === user.id 
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-500 dark:ring-emerald-600' 
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedUser(selectedUser === user.id ? '' : user.id)}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={user.id}
                      checked={selectedUser === user.id}
                      onChange={() => {}}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
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
              disabled={saving || !selectedUser}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Otorgando...' : 'Otorgar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
