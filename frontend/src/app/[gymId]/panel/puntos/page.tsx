'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Star, Clock, CheckCircle2, TrendingUp, Gift,
  Dumbbell, Apple, Trophy, Loader2, ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useRoleGuard } from '@/hooks/useRoleGuard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PointEntry {
  id: string
  points: number
  pending_points: number
  status: 'pending' | 'approved'
  source: string
  description: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

interface MyStats {
  total_points: number
  pending_points: number
  recent_points: PointEntry[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceIcon(source: string) {
  if (source.includes('workout') || source.includes('session')) return Dumbbell
  if (source.includes('nutrition')) return Apple
  if (source.includes('challenge')) return Trophy
  if (source.includes('reward_redemption')) return Gift
  return Star
}

function sourceLabel(source: string): string {
  if (source.startsWith('nutrition_daily_')) return 'Nutrición diaria'
  if (source === 'workout_week') return 'Semana de entrenamiento'
  if (source === 'workout_session') return 'Sesión de entrenamiento'
  if (source === 'reward_redemption') return 'Canje de recompensa'
  if (source.startsWith('challenge')) return 'Reto completado'
  return source
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── PointRow ──────────────────────────────────────────────────────────────────

function PointRow({ entry }: { entry: PointEntry }) {
  const Icon = sourceIcon(entry.source)
  const isPending = entry.status === 'pending'
  const isDeduction = (isPending ? entry.pending_points : entry.points) < 0
  const amount = isPending ? entry.pending_points : entry.points

  return (
    <div className="flex items-center gap-4 py-3.5 px-1">
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        isDeduction
          ? 'bg-rose-50'
          : isPending
            ? 'bg-amber-50'
            : 'bg-emerald-50',
      )}>
        <Icon className={cn(
          'w-4 h-4',
          isDeduction ? 'text-rose-500' : isPending ? 'text-amber-500' : 'text-emerald-600',
        )} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {entry.description || sourceLabel(entry.source)}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-400">{formatDate(entry.created_at)}</span>
          {isPending && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" />
              Pendiente
            </span>
          )}
          {!isPending && entry.reviewed_by && (
            <span className="text-[11px] text-slate-400">por {entry.reviewed_by}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <span className={cn(
        'text-sm font-bold tabular-nums shrink-0',
        isDeduction ? 'text-rose-500' : isPending ? 'text-amber-600' : 'text-emerald-600',
      )}>
        {isDeduction ? '' : '+'}{amount.toLocaleString()} pts
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PuntosPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['athlete'])
  const router = useRouter()

  const statsQuery = useQuery({
    queryKey: ['my-stats', gymId],
    queryFn: () => api.get<MyStats>('/api/gamification/my-stats/'),
  })

  const stats = statsQuery.data
  const isLoading = statsQuery.isLoading
  const entries = stats?.recent_points ?? []
  const pending = entries.filter(e => e.status === 'pending')
  const approved = entries.filter(e => e.status === 'approved')

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Puntos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Historial de puntos ganados y pendientes de aprobación</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Confirmados</span>
              </div>
              <p className="text-3xl font-black text-slate-900 tabular-nums">
                {(stats?.total_points ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">puntos disponibles</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs font-semibold text-slate-500">En revisión</span>
              </div>
              <p className="text-3xl font-black text-amber-600 tabular-nums">
                {(stats?.pending_points ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">esperando aprobación</p>
            </div>
          </div>

          {/* CTA — ir a recompensas */}
          <button
            onClick={() => router.push(`/${gymId}/panel/recompensas`)}
            className="w-full flex items-center gap-3 px-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group active:scale-[0.99]"
            style={{ transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1), background-color 150ms, border-color 150ms' }}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-800">Canjear recompensas</p>
              <p className="text-xs text-slate-400">Usa tus puntos en el catálogo del gimnasio</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </button>

          {/* Historial */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700">Actividad reciente</h2>
            </div>

            {entries.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Star className="w-10 h-10 mx-auto text-slate-100 mb-3" />
                <p className="text-sm font-medium text-slate-500">Sin actividad aún</p>
                <p className="text-xs text-slate-400 mt-1">
                  Completa sesiones y planes de nutrición para ganar puntos
                </p>
              </div>
            ) : (
              <div className="px-5 divide-y divide-slate-50">
                {/* Pendientes primero */}
                {pending.length > 0 && (
                  <>
                    <div className="py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                        Pendientes de aprobación
                      </p>
                    </div>
                    {pending.map(e => <PointRow key={e.id} entry={e} />)}
                  </>
                )}

                {approved.length > 0 && (
                  <>
                    {pending.length > 0 && (
                      <div className="py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Confirmados
                        </p>
                      </div>
                    )}
                    {approved.map(e => <PointRow key={e.id} entry={e} />)}
                  </>
                )}
              </div>
            )}

            {entries.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-50">
                <p className="text-[11px] text-slate-400 text-center">
                  Mostrando los últimos {entries.length} movimientos
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
