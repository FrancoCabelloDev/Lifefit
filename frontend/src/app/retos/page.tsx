'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

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

export default function RetosPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const [challengesRes, participationRes, leaderboardRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/challenges/challenges/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/challenges/participations/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/challenges/progress/leaderboard/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (challengesRes.ok) {
          const data = await challengesRes.json()
          setChallenges(Array.isArray(data) ? data : data.results ?? [])
        }
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

  return (
    <DashboardPage user={user} active="/retos" loading={loadingState} loadingLabel="Cargando tus retos...">
        <>
          <header className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-xs uppercase text-emerald-600">Retos activos</p>
            <h1 className="text-2xl font-semibold text-slate-900">Gamificacion y motivacion</h1>
            <p className="text-sm text-slate-500">
              Unete a los desafios globales de Lifefit o de tu gimnasio para sumar puntos y subir en el ranking.
            </p>
          </header>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Retos disponibles</h2>
              <span className="text-xs text-slate-500">{challenges.length} retos</span>
            </div>
            <div className="mt-4 grid gap-4">
              {showGymEmptyMessage && (
                <p className="text-xs text-slate-400">
                  Tu gym aun no ha publicado retos propios. Mientras tanto, explora los retos globales de Lifefit.
                </p>
              )}
              {challenges.map((challenge) => {
                const progress = userParticipation[challenge.id]?.progress ?? 0
                return (
                  <div key={challenge.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{challenge.name}</p>
                        <p className="text-xs text-slate-500">{challenge.description}</p>
                      </div>
                      <span className="text-xs text-emerald-600">{challenge.reward_points} pts</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Progreso: {progress}%</p>
                  </div>
                )
              })}
              {!challenges.length && (
                <p className="text-sm text-slate-500">
                  {userGymId !== null
                    ? 'Aun no hay retos disponibles para tu cuenta.'
                    : 'Aun no hay retos globales disponibles.'}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Ranking</h2>
              <span className="text-xs text-slate-500">Top 20</span>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {leaderboard.map((entry, index) => (
                <li key={entry.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      #{index + 1} {entry.user_detail?.email ?? 'Atleta'}
                    </p>
                    <p className="text-xs text-slate-500">Nivel {entry.level}</p>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600">{entry.total_points} pts</div>
                </li>
              ))}
              {!leaderboard.length && <p className="text-sm text-slate-500">Aun no hay ranking disponible.</p>}
            </ul>
          </section>
        </>
      </DashboardPage>
  )
}

