'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { FormEvent, useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Challenge = {
  id: string
  gym: string | number | null
  name: string
  description: string
  type: string
  start_date: string
  end_date: string
  reward_points: number
  goal_value: number
  status: string
}

type Participation = {
  id: string
  challenge: string
  progress: number
  status: string
  challenge_detail?: Challenge
}

type LeaderboardEntry = {
  id: string
  total_points: number
  level: number
  user_detail?: { email: string }
}

// Config para tipos de reto: etiqueta y cómo se entiende la meta
const CHALLENGE_TYPE_CONFIG: Record<
  string,
  { label: string; goalLabel: string; unitFormatter: (value: number) => string }
> = {
  workouts: {
    label: 'Entrenamientos (sesiones)',
    goalLabel: 'Meta de sesiones validadas',
    unitFormatter: (value) => `${value} sesiones validadas`,
  },
  attendance: {
    label: 'Asistencia (sesiones)',
    goalLabel: 'Meta de asistencias (sesiones validadas)',
    unitFormatter: (value) => `${value} asistencias validadas`,
  },
  distance: {
    label: 'Distancia (km)',
    goalLabel: 'Meta de distancia (km a acumular)',
    unitFormatter: (value) => `${value} km acumulados`,
  },
  nutrition: {
    label: 'Nutrición (días cumplidos)',
    goalLabel: 'Meta de días cumpliendo el plan',
    unitFormatter: (value) => `${value} días cumplidos`,
  },
  mixed: {
    label: 'Mixto',
    goalLabel: 'Meta (valor objetivo)',
    unitFormatter: (value) => `${value} unidades de progreso`,
  },
}

function formatGoal(type: string, value: number) {
  const config = CHALLENGE_TYPE_CONFIG[type]
  if (!config) return `${value}`
  return config.unitFormatter(value)
}

function getGoalLabel(type: string) {
  const config = CHALLENGE_TYPE_CONFIG[type]
  return config ? config.goalLabel : 'Meta (valor)'
}

export default function RetosPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [challengeForm, setChallengeForm] = useState({
    name: '',
    description: '',
    type: 'workouts',
    start_date: '',
    end_date: '',
    reward_points: 100,
    goal_value: 10,
    status: 'draft',
  })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const fetchChallenges = async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/challenges/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setChallenges(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const [participationRes, leaderboardRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/challenges/participations/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/challenges/progress/leaderboard/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        await fetchChallenges()

        if (participationRes.ok) {
          const data = await participationRes.json()
          setParticipations(Array.isArray(data) ? data : data.results ?? [])
        }
        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json()
          setLeaderboard(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  if (!user) {
    return <DashboardPage user={user} active="/retos" loading loadingLabel="Cargando tus retos..." />
  }

  const loadingState = authLoading || loading

  const userParticipation = Object.fromEntries(participations.map((p) => [p.challenge, p]))
  const userGymId = user.gym === null || user.gym === undefined || user.gym === '' ? null : user.gym
  const hasGymSpecificChallenges =
    userGymId !== null && challenges.some((challenge) => challenge.gym !== null && String(challenge.gym) === String(userGymId))
  const showGymEmptyMessage = userGymId !== null && !hasGymSpecificChallenges && challenges.length > 0

  const canManageChallenges = user?.role && ['super_admin', 'gym_admin', 'coach'].includes(user.role)

  const handleCreateChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setFormSaving(true)
    setFormError('')
    try {
      const url = editingChallenge
        ? `${API_BASE_URL}/api/challenges/challenges/${editingChallenge.id}/`
        : `${API_BASE_URL}/api/challenges/challenges/`
      const method = editingChallenge ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(challengeForm),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos guardar el reto.')
      }
      setShowCreateModal(false)
      setEditingChallenge(null)
      setChallengeForm({
        name: '',
        description: '',
        type: 'workouts',
        start_date: '',
        end_date: '',
        reward_points: 100,
        goal_value: 10,
        status: 'draft',
      })
      fetchChallenges()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge)
    setChallengeForm({
      name: challenge.name,
      description: challenge.description,
      type: challenge.type,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      reward_points: challenge.reward_points,
      goal_value: challenge.goal_value || 10,
      status: challenge.status,
    })
    setShowCreateModal(true)
    setFormError('')
  }

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!token) return
    if (!confirm('¿Estás seguro de eliminar este reto?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/challenges/${challengeId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'No pudimos eliminar el reto.')
      }
      fetchChallenges()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error al eliminar.')
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingChallenge(null)
    setChallengeForm({
      name: '',
      description: '',
      type: 'workouts',
      start_date: '',
      end_date: '',
      reward_points: 100,
      goal_value: 10,
      status: 'draft',
    })
  }

  return (
    <DashboardPage user={user} active="/retos" loading={loadingState} loadingLabel="Cargando tus retos...">
      <>
        <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-emerald-600">Retos activos</p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gamificación y motivación</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Únete a los desafíos globales de LifeFit o de tu gimnasio para sumar puntos extra a partir de tus sesiones
                validadas.
              </p>
            </div>
            {canManageChallenges && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5
                           text-sm font-semibold text-white shadow-sm transition
                           hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400
                           focus:ring-offset-2 focus:ring-offset-slate-900 whitespace-nowrap"
              >
                <span className="text-base">＋</span>
                <span>Agregar reto</span>
              </button>
            )}
          </div>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Retos disponibles</h2>
            <span className="text-xs text-slate-500 dark:text-slate-300">{challenges.length} retos</span>
          </div>
          <div className="mt-4 grid gap-4">
            {showGymEmptyMessage && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Tu gym aún no ha publicado retos propios. Mientras tanto, explora los retos globales de LifeFit.
              </p>
            )}
            {challenges.map((challenge) => {
              const progress = userParticipation[challenge.id]?.progress ?? 0
              const typeConfig = CHALLENGE_TYPE_CONFIG[challenge.type] ?? {
                label: challenge.type,
                goalLabel: 'Meta (valor)',
                unitFormatter: (value: number) => `${value}`,
              }
              const start = challenge.start_date ? new Date(challenge.start_date) : null
              const end = challenge.end_date ? new Date(challenge.end_date) : null

              return (
                <div
                  key={challenge.id}
                  className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{challenge.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {typeConfig.label}
                        </span>
                        {(challenge.type === 'workouts' || challenge.type === 'attendance') && (
                          <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Basado en sesiones completadas y validadas por tu coach
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{challenge.description}</p>

                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {start && (
                          <span>
                            📅 Inicio:{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {start.toLocaleDateString('es-ES')}
                            </span>
                          </span>
                        )}
                        {end && (
                          <span>
                            🏁 Fin:{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {end.toLocaleDateString('es-ES')}
                            </span>
                          </span>
                        )}
                        <span>
                          🎯 Meta:{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {formatGoal(challenge.type, challenge.goal_value)}
                          </span>
                        </span>
                        <span>
                          🎁 Bonus:{' '}
                          <span className="font-medium text-amber-600">{challenge.reward_points} pts</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {canManageChallenges && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditChallenge(challenge)
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="Editar reto"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteChallenge(challenge.id)
                            }}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            title="Eliminar reto"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Progreso: {progress}%</p>
                </div>
              )
            })}
            {!challenges.length && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {userGymId !== null
                  ? 'Aún no hay retos disponibles para tu cuenta.'
                  : 'Aún no hay retos globales disponibles.'}
              </p>
            )}
          </div>
        </section>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-emerald-600 dark:text-emerald-400">
                    {editingChallenge ? 'Editar reto' : 'Nuevo reto'}
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editingChallenge ? 'Modifica los datos del reto' : 'Crea un nuevo reto'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Los retos son metas adicionales basadas en tus sesiones (o km / días), y entregan puntos extra al
                    cumplir la condición.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300
                             dark:border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-300
                             hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400
                             focus:outline-none focus:ring-2 focus:ring-slate-400/50 whitespace-nowrap"
                >
                  <span className="text-sm">✕</span>
                  <span>Cerrar</span>
                </button>
              </div>
              <form onSubmit={handleCreateChallenge} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
                  <input
                    type="text"
                    required
                    value={challengeForm.name}
                    onChange={(e) => setChallengeForm({ ...challengeForm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="Ej: Reto Asistencia Semanal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                  <textarea
                    required
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="Ej: Completa al menos 3 sesiones validadas por semana durante 4 semanas para ganar puntos extra."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
                    <select
                      value={challengeForm.type}
                      onChange={(e) => setChallengeForm({ ...challengeForm, type: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="workouts">Entrenamientos (sesiones)</option>
                      <option value="attendance">Asistencia (sesiones)</option>
                      <option value="distance">Distancia (km)</option>
                      <option value="nutrition">Nutrición (días cumplidos)</option>
                      <option value="mixed">Mixto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                    <select
                      value={challengeForm.status}
                      onChange={(e) => setChallengeForm({ ...challengeForm, status: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="draft">Borrador</option>
                      <option value="active">Activo</option>
                      <option value="completed">Completado</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha inicio</label>
                    <input
                      type="date"
                      required
                      value={challengeForm.start_date}
                      onChange={(e) => setChallengeForm({ ...challengeForm, start_date: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha fin</label>
                    <input
                      type="date"
                      required
                      value={challengeForm.end_date}
                      onChange={(e) => setChallengeForm({ ...challengeForm, end_date: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Puntos de recompensa (bonus)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={challengeForm.reward_points}
                      onChange={(e) =>
                        setChallengeForm({ ...challengeForm, reward_points: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {getGoalLabel(challengeForm.type)}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={challengeForm.goal_value}
                      onChange={(e) =>
                        setChallengeForm({ ...challengeForm, goal_value: parseInt(e.target.value) || 10 })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-4 py-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <p>
                    Los retos usan como base tus sesiones en el gimnasio: cada sesión completada y validada por el coach
                    otorga puntos. Al cumplir la meta (sesiones, km o días), este reto entrega una bonificación extra.
                  </p>
                  <p className="mt-1">
                    En futuras versiones se evaluará la opción de complementar algunos retos con datos de smartwatch
                    (pasos, minutos activos), manteniendo la sesión validada como unidad principal.
                  </p>
                </div>

                {formError && (
                  <p className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-600 dark:text-red-400">
                    {formError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-2xl border border-slate-300 dark:border-slate-700 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {formSaving ? 'Guardando...' : editingChallenge ? 'Guardar cambios' : 'Crear reto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    </DashboardPage>
  )
}
