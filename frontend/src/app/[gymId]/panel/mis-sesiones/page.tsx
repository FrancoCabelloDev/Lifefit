'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2, Dumbbell, Clock, Zap, ChevronDown, ChevronUp,
  CheckCircle2, Circle, TrendingUp, Calendar,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseLog {
  exercise_name:    string
  sets_prescribed:  number
  sets_completed:   number
  completed:        boolean
}

interface SessionSummary {
  id:                     string
  routine_name:           string | null
  performed_at:           string
  duration_minutes:       number
  perceived_exertion:     number
  completion_percentage:  number
  points_awarded:         number
  exercises_done:         number
  exercises_total:        number
  exercise_logs:          ExerciseLog[]
}

interface HistoryPage {
  count:   number
  page:    number
  pages:   number
  results: SessionSummary[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EFFORT_LABELS: Record<number, string> = {
  1: 'Muy fácil', 2: 'Fácil', 3: 'Ligero',
  4: 'Moderado',  5: 'Medio',  6: 'Algo intenso',
  7: 'Intenso',   8: 'Muy intenso', 9: 'Máximo', 10: 'Límite',
}

const effortBg = (r: number) =>
  r <= 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
  r <= 6 ? 'bg-amber-50 text-amber-700 border-amber-200' :
           'bg-rose-50 text-rose-700 border-rose-200'

const ringColor = (pct: number) =>
  pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'

// ── Circular progress ring ────────────────────────────────────────────────────

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const r   = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={ringColor(pct)}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        className="rotate-90 origin-center"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fontSize: 10, fontWeight: 700, fill: ringColor(pct) }}
      >
        {pct}%
      </text>
    </svg>
  )
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: SessionSummary }) {
  const [expanded, setExpanded] = useState(false)
  const pct    = Math.round(session.completion_percentage)
  const date   = parseISO(session.performed_at)

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header row */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(e => !e)}
          onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
        >
          {/* Ring */}
          <ProgressRing pct={pct} />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate leading-tight">
              {session.routine_name ?? 'Sesión libre'}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                {format(date, "d MMM · HH:mm", { locale: es })}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {session.duration_minutes} min
              </span>
              <span className={cn(
                'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                effortBg(session.perceived_exertion),
              )}>
                <Zap className="w-3 h-3" />
                {session.perceived_exertion} — {EFFORT_LABELS[session.perceived_exertion]}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {session.points_awarded > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                +{session.points_awarded} pts
              </span>
            )}
            <span className="text-xs text-slate-400">
              {session.exercises_done}/{session.exercises_total} ej.
            </span>
          </div>

          {/* Expand chevron */}
          {session.exercise_logs.length > 0 && (
            <div className="ml-1 text-slate-400">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>

        {/* Expanded exercise list */}
        {expanded && session.exercise_logs.length > 0 && (
          <div className="border-t border-slate-100 divide-y divide-slate-50">
            {session.exercise_logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="shrink-0 text-slate-300">
                  {log.completed
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Circle       className="w-4 h-4" />
                  }
                </div>
                <span className={cn(
                  'flex-1 text-sm',
                  log.completed ? 'text-slate-700' : 'text-slate-400',
                )}>
                  {log.exercise_name}
                </span>
                <span className={cn(
                  'text-xs font-semibold',
                  log.completed ? 'text-emerald-600' : 'text-slate-400',
                )}>
                  {log.sets_completed}/{log.sets_prescribed} series
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MisSesionesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId }       = use(params)
  useRoleGuard(gymId, ['athlete'])
  useFeatureGuard(gymId, 'rutinas')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<HistoryPage>({
    queryKey: ['workout-history', page],
    queryFn:  () => api.get<HistoryPage>(`/api/workouts/sessions/my_history/?page=${page}`),
    placeholderData: (prev) => prev,
  })

  const sessions = data?.results ?? []
  const total    = data?.count   ?? 0
  const pages    = data?.pages   ?? 1

  // Stats from current page
  const avgPct = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + r.completion_percentage, 0) / sessions.length)
    : 0
  const totalPts = sessions.reduce((s, r) => s + r.points_awarded, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mis sesiones</h1>
        <p className="text-slate-500 mt-0.5">Historial de entrenamientos completados</p>
      </div>

      {/* Summary cards */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sesiones',    value: total,        icon: '🏋️', bg: 'bg-emerald-50' },
            { label: '% promedio',  value: `${avgPct}%`, icon: '📊', bg: 'bg-blue-50'    },
            { label: 'Pts ganados', value: totalPts,     icon: '⭐', bg: 'bg-amber-50'   },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-base shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium leading-none">{s.label}</p>
                  <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-14 h-14 mx-auto text-slate-200 mb-4" />
            <p className="text-base font-semibold text-slate-600">Sin sesiones registradas</p>
            <p className="text-sm text-slate-400 mt-1">
              Completa tu primera sesión desde tu plan semanal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors active:scale-[0.97]"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors active:scale-[0.97]"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Empty stats footer */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400 justify-center pb-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Mostrando {sessions.length} de {total} sesiones
        </div>
      )}
    </div>
  )
}
