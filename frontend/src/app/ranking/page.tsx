'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type LeaderboardEntry = {
    id: string
    total_points: number
    level: number
    user_detail?: {
        email: string
    }
}

export default function RankingPage() {
    const { user, token, loading: authLoading } = useDashboardAuth()
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/challenges/progress/leaderboard/`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (response.ok) {
                    const data = await response.json()
                    setLeaderboard(Array.isArray(data) ? data : data.results ?? [])
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchLeaderboard()
    }, [token])

    if (authLoading || loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
                    <p className="text-sm text-slate-500">Cargando ranking...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
                <DashboardSidebar user={user} active="/ranking" />

                <main className="flex-1 space-y-6">
                    <header className="rounded-3xl bg-white p-6 shadow-lg">
                        <p className="text-xs uppercase text-emerald-600">Ranking global</p>
                        <h1 className="text-2xl font-semibold text-slate-900">Los atletas más comprometidos</h1>
                        <p className="text-sm text-slate-500">Suma puntos completando retos y rutinas.</p>
                    </header>

                    <section className="rounded-3xl bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">Top 20</h2>
                            <span className="text-xs text-slate-500">{leaderboard.length} atletas</span>
                        </div>
                        <ul className="mt-4 divide-y divide-slate-100">
                            {leaderboard.length ? (
                                leaderboard.map((entry, index) => (
                                    <li key={entry.id} className="flex items-center justify-between py-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                #{index + 1} {entry.user_detail?.email ?? 'Atleta'}
                                            </p>
                                            <p className="text-xs text-slate-500">Nivel {entry.level}</p>
                                        </div>
                                        <div className="text-sm font-semibold text-emerald-600">{entry.total_points} pts</div>
                                    </li>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">Aún no hay datos suficientes para el ranking.</p>
                            )}
                        </ul>
                    </section>
                </main>
            </div>
        </div>
    )
}
