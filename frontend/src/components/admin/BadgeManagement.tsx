'use client'

import { useState, useEffect, useCallback } from 'react'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Badge = {
  id: string
  gym?: string | null // puede venir del backend, pero aquí lo ignoramos
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

type BadgeManagementProps = {
  token: string
  userGymId?: string | null
}

/**
 * Catálogo base de insignias LifeFit (fallback / demo).
 * La idea es que estas mismas se creen en el backend (Django admin / seed),
 * y el frontend solo las consuma.
 */
const DEFAULT_BADGES: Badge[] = [
  {
    id: 'default-asistencia-bronce',
    gym: null,
    name: 'Asistente Bronce',
    icon: '🥉',
    description: 'Reconoce a quienes empiezan a ser constantes en el gym.',
    condition: 'Completar 8 sesiones validadas en 4 semanas.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-asistencia-plata',
    gym: null,
    name: 'Asistente Plata',
    icon: '🥈',
    description: 'Para quienes mantienen una rutina sólida durante el mes.',
    condition: 'Completar 16 sesiones validadas en 4 semanas.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-asistencia-oro',
    gym: null,
    name: 'Asistente Oro',
    icon: '🥇',
    description: 'Premia a los atletas con mayor disciplina semanal en el gym.',
    condition: 'Completar 24 sesiones validadas en 4 semanas.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-compromiso-bronce',
    gym: null,
    name: 'Compromiso Bronce',
    icon: '⭐',
    description:
      'Primer nivel de adherencia al plan de entrenamiento y nutrición.',
    condition: 'Alcanzar 1000 puntos LifeFit acumulados.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-compromiso-plata',
    gym: null,
    name: 'Compromiso Plata',
    icon: '💎',
    description: 'Para quienes mantienen el hábito en el mediano plazo.',
    condition: 'Alcanzar 3000 puntos LifeFit acumulados.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-compromiso-oro',
    gym: null,
    name: 'Compromiso Oro',
    icon: '👑',
    description: 'Reconoce la máxima fidelización dentro de LifeFit.',
    condition: 'Alcanzar 5000 puntos LifeFit acumulados.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-retos-cazador',
    gym: null,
    name: 'Cazador de Retos',
    icon: '🎯',
    description: 'Para los que siempre se apuntan a los desafíos.',
    condition: 'Completar 3 retos en un periodo de 2 meses.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-retos-maratonista',
    gym: null,
    name: 'Maratonista del Gym',
    icon: '🏃',
    description: 'Celebra a quienes acumulan distancia en caminadora o pista.',
    condition: 'Completar al menos 20 km en retos de distancia.',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'default-retos-equilibrio',
    gym: null,
    name: 'Equilibrio Total',
    icon: '⚡',
    description:
      'Reconoce a quienes cuidan tanto el entrenamiento como la alimentación.',
    condition:
      'Completar al menos 1 reto de entrenamiento y 1 de nutrición en el mismo mes.',
    created_at: '',
    updated_at: '',
  },
]

export default function BadgeManagement({ token }: BadgeManagementProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      console.error(err)
      setError('Error al cargar insignias')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchUserBadges = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/challenges/user-badges/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (response.ok) {
        const data = await response.json()
        setUserBadges(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (err) {
      console.error('Error loading user badges:', err)
    }
  }, [token])

  useEffect(() => {
    fetchBadges()
    fetchUserBadges()
  }, [fetchBadges, fetchUserBadges])

  const getUsersWithBadge = (badgeId: string) => {
    return userBadges.filter((ub) => ub.badge === badgeId).length
  }

  // Si la API aún no tiene insignias configuradas, mostramos el catálogo base.
  const catalogBadges: Badge[] =
    badges.length > 0 ? badges : DEFAULT_BADGES

  const totalInsignias = catalogBadges.length
  const totalInsigniasOtorgadas = userBadges.length
  const totalUsuariosConInsignias = new Set(
    userBadges.map((ub) => ub.user),
  ).size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-emerald-600">
              Gamificación · Insignias
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Catálogo de Insignias LifeFit
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Este catálogo de medallas es definido por LifeFit y se basa en
              métricas verificables: sesiones validadas, puntos acumulados y
              retos completados. Los gimnasios lo usan para motivar a sus
              atletas sin tener que diseñar su propio sistema de gamificación.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Total Insignias
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {totalInsignias}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <span className="text-2xl">🏅</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Insignias Otorgadas
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalInsigniasOtorgadas}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Usuarios con Insignias
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                {totalUsuariosConInsignias}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges grid */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Cargando insignias...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogBadges.map((badge) => {
            const usersCount = badges.length
              ? getUsersWithBadge(badge.id)
              : 0 // si estamos usando las default, aún no hay datos reales

            return (
              <div
                key={badge.id}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-3xl dark:from-emerald-900/40 dark:to-emerald-700/40">
                      {badge.icon || '🏆'}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {badge.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Insignia global LifeFit
                      </p>
                    </div>
                  </div>
                  {usersCount > 0 && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {usersCount} usuario
                      {usersCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {badge.description}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Condición para obtenerla
                  </p>
                  <p className="mt-1 text-slate-800 dark:text-slate-100">
                    {badge.condition}
                  </p>
                </div>

                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <span>👀</span>
                    <span>
                      Usa esta insignia para reforzar la adherencia de tus
                      atletas.
                    </span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Insignias otorgadas recientemente (solo lectura) */}
      {userBadges.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Insignias otorgadas recientemente
          </h3>
          <div className="space-y-3">
            {userBadges.slice(0, 5).map((userBadge) => (
              <div
                key={userBadge.id}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {userBadge.badge_detail.icon || '🏆'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {userBadge.badge_detail.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Usuario ID: {userBadge.user}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(userBadge.awarded_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
