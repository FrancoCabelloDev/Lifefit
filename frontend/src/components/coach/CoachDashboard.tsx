'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Dumbbell, Activity, Target, AlertTriangle,
  ChevronRight, Trophy, Medal, Flame, CheckCircle2,
  Plus, ClipboardList, List, TrendingUp, Clock,
  Zap, ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatsCardSkeleton } from '@/components/ui/skeletons'
import { api } from '@/lib/api'
import type { User, CoachDashboard, CoachAthlete } from '@/lib/types'

function formatRelative(dateStr: string | null) {
  if (!dateStr) return 'Nunca'
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return `Hace ${Math.floor(diffDays / 30)} mes.`
}

function getInitials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

const LEVEL_COLORS = [
  'bg-slate-100 text-slate-500',
  'bg-emerald-50 text-emerald-700',
  'bg-blue-50 text-blue-700',
  'bg-amber-50 text-amber-700',
  'bg-purple-50 text-purple-700',
  'bg-rose-50 text-rose-700',
]

function LevelBadge({ nivel }: { nivel: number }) {
  const cls = LEVEL_COLORS[Math.min(nivel, LEVEL_COLORS.length - 1)]
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cls}`}>
      <Zap className="w-2.5 h-2.5" />Nvl {nivel}
    </span>
  )
}

export default function CoachDashboard({ gymId, user }: { gymId: string; user: User }) {
  const router = useRouter()
  const adminName = user.first_name || 'Coach'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const dashQuery = useQuery({
    queryKey: ['coach-dashboard', gymId],
    queryFn: () => api.get<CoachDashboard>('/api/gyms/coach-assignments/dashboard/'),
    refetchInterval: 60000,
  })

  const athletesQuery = useQuery({
    queryKey: ['coach-athletes-dash', gymId],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/coach-assignments/my_athletes/', {
        params: { page: '1', page_size: '8' },
      })
      return (data.results || []) as CoachAthlete[]
    },
    refetchInterval: 60000,
  })

  const cd = dashQuery.data
  const athletes = athletesQuery.data || []

  if (dashQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-72 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="lg:col-span-2 h-72 bg-slate-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {adminName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${gymId}/panel/entrenamiento/rutinas`)}
          className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva rutina
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-violet-600" />
            </div>
            {cd?.at_risk_count ? (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">
                {cd.at_risk_count} en riesgo
              </span>
            ) : null}
          </div>
          <p className="text-2xl font-bold text-slate-900">{cd?.total_athletes ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Atletas asignados</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{cd?.sessions_week ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Sesiones esta semana</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{cd?.sessions_today ?? 0} hoy</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <Dumbbell className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{cd?.with_active_routine ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Con rutina activa</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{cd?.active_challenges ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Retos activos</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: athletes table */}
        <div className="lg:col-span-3 space-y-4">

          {/* At-risk alert */}
          {cd && cd.at_risk_count > 0 && (
            <section className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h2 className="text-sm font-semibold text-rose-700">
                    Atletas en riesgo de abandono
                  </h2>
                  <span className="text-xs font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md">
                    {cd.at_risk_count}
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/${gymId}/panel/gestion/atletas`)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-rose-600 mb-3">Sin sesiones registradas en los últimos 7 días</p>
              <div className="space-y-2">
                {cd.at_risk_athletes.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 bg-white rounded-xl p-2.5 border border-rose-100 cursor-pointer hover:border-rose-200 transition-colors"
                    onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.id}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {getInitials(a.first_name, a.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.first_name} {a.last_name}</p>
                      <p className="text-[10px] text-slate-400">Última sesión: {formatRelative(a.last_session)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <LevelBadge nivel={a.nivel} />
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/${gymId}/panel/entrenamiento/rutinas`) }}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        Asignar rutina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Athletes table */}
          <section className="bg-white rounded-2xl border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Mis atletas</h2>
              <button
                onClick={() => router.push(`/${gymId}/panel/gestion/atletas`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {athletesQuery.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : athletes.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No tienes atletas asignados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {athletes.map(a => {
                  const sessionBar = Math.min((a.sessions_last_7_days / 7) * 100, 100)
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${a.is_at_risk ? 'bg-rose-50/30' : ''}`}
                      onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.id}`)}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${a.is_at_risk ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {getInitials(a.first_name, a.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{a.first_name} {a.last_name}</p>
                          {a.is_at_risk && <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 max-w-[80px]">
                            <Progress value={sessionBar} className={`h-1 ${a.is_at_risk ? '[&>div]:bg-rose-400' : '[&>div]:bg-emerald-400'}`} />
                          </div>
                          <span className="text-[10px] text-slate-400">{a.sessions_last_7_days}/7 días</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <LevelBadge nivel={a.nivel} />
                        <span className="text-xs font-bold text-amber-600">{a.puntos.toLocaleString()} pts</span>
                      </div>
                      <div className="flex-shrink-0">
                        {a.has_active_routine ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="text-[10px] text-slate-300 font-medium">Sin rutina</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: gamification + quick access */}
        <div className="lg:col-span-2 space-y-4">

          {/* Top athletes ranking */}
          <section className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-700">Ranking mis atletas</h2>
              </div>
              <button
                onClick={() => router.push(`/${gymId}/panel/gamificacion/ranking`)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Ver ranking <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!cd || cd.top_athletes.length === 0 ? (
              <div className="py-8 text-center">
                <Trophy className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Sin datos de puntos aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cd.top_athletes.map((a, i) => {
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.id}`)}
                    >
                      <span className="text-base w-6 text-center flex-shrink-0">
                        {medals[i] || `${i + 1}`}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {getInitials(a.first_name, a.last_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{a.first_name} {a.last_name}</p>
                        <LevelBadge nivel={a.nivel} />
                      </div>
                      <span className="text-xs font-bold text-amber-600 flex-shrink-0">
                        {a.puntos.toLocaleString()} pts
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Gamification summary */}
          <section className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-700">Resumen de retención</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Atletas activos</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={cd ? ((cd.total_athletes - cd.at_risk_count) / Math.max(cd.total_athletes, 1)) * 100 : 0}
                    className="w-20 h-1.5 [&>div]:bg-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-600">
                    {cd ? cd.total_athletes - cd.at_risk_count : 0}/{cd?.total_athletes ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Con rutina</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={cd ? (cd.with_active_routine / Math.max(cd.total_athletes, 1)) * 100 : 0}
                    className="w-20 h-1.5 [&>div]:bg-blue-500"
                  />
                  <span className="text-xs font-bold text-blue-600">
                    {cd?.with_active_routine ?? 0}/{cd?.total_athletes ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">En retos activos</span>
                <div className="flex items-center gap-2">
                  <Progress
                    value={cd ? Math.min((cd.active_challenges / Math.max(cd.total_athletes, 1)) * 100, 100) : 0}
                    className="w-20 h-1.5 [&>div]:bg-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-600">
                    {cd?.active_challenges ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick access */}
          <section className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push(`/${gymId}/panel/entrenamiento/rutinas`)}
              className="flex items-center gap-2 p-3 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-xl transition-all text-left group"
            >
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Rutinas</p>
                <p className="text-[10px] text-slate-400">Crear templates</p>
              </div>
            </button>
            <button
              onClick={() => router.push(`/${gymId}/panel/entrenamiento/ejercicios`)}
              className="flex items-center gap-2 p-3 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-xl transition-all text-left group"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <List className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Ejercicios</p>
                <p className="text-[10px] text-slate-400">Catálogo</p>
              </div>
            </button>
            <button
              onClick={() => router.push(`/${gymId}/panel/gamificacion/retos`)}
              className="flex items-center gap-2 p-3 bg-white border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 rounded-xl transition-all text-left group"
            >
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Target className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Retos</p>
                <p className="text-[10px] text-slate-400">Gamificación</p>
              </div>
            </button>
            <button
              onClick={() => router.push(`/${gymId}/panel/gestion/atletas`)}
              className="flex items-center gap-2 p-3 bg-white border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 rounded-xl transition-all text-left group"
            >
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Atletas</p>
                <p className="text-[10px] text-slate-400">Gestionar</p>
              </div>
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
