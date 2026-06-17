'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dumbbell, ChevronDown, ChevronUp, CheckCircle2, Clock,
  Flame, Trophy, ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, UserRoutineAssignment } from '@/lib/types'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-100',
  advanced: 'bg-rose-50 text-rose-700 border-rose-100',
}

function RoutineCard({ assignment, gymId }: { assignment: UserRoutineAssignment; gymId: string }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const routine = assignment.routine_detail
  if (!routine) return null

  const sessionMutation = useMutation({
    mutationFn: () => api.post('/api/workouts/sessions/', {
      routine: routine.id,
      performed_at: new Date().toISOString(),
      duration_minutes: routine.duration_minutes,
      status: 'completed',
      completion_percentage: 100,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-routines', gymId] })
    },
  })

  const completedToday = routine.completed_today

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-semibold text-slate-900 truncate">{routine.name}</h3>
              <Badge className={`text-[10px] border ${LEVEL_COLORS[routine.level] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {LEVEL_LABELS[routine.level] || routine.level}
              </Badge>
              {completedToday && (
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completada hoy
                </Badge>
              )}
            </div>
            {routine.objective && (
              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{routine.objective}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {routine.duration_minutes} min
              </span>
              {routine.points_reward > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  {routine.points_reward} pts
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Dumbbell className="w-3.5 h-3.5" />
                {routine.routine_exercises?.length ?? 0} ejercicios
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!completedToday) sessionMutation.mutate()
            }}
            disabled={completedToday || sessionMutation.isPending}
            className={`flex-shrink-0 h-9 px-4 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
              completedToday
                ? 'bg-emerald-50 text-emerald-600 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60'
            }`}
          >
            {completedToday ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Completada</>
            ) : sessionMutation.isPending ? (
              'Registrando…'
            ) : (
              <><Flame className="w-3.5 h-3.5" /> Marcar completada</>
            )}
          </button>
        </div>

        {/* Expand toggle */}
        {routine.routine_exercises && routine.routine_exercises.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-4 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar ejercicios' : 'Ver ejercicios'}
          </button>
        )}
      </div>

      {/* Exercises list */}
      {expanded && routine.routine_exercises && routine.routine_exercises.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {routine.routine_exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800">{ex.exercise_detail?.name ?? '—'}</p>
                {ex.exercise_detail?.muscle_group && (
                  <p className="text-[10px] text-slate-400">{ex.exercise_detail.muscle_group}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-shrink-0">
                <span>{ex.sets} × {ex.reps}</span>
                {ex.rest_seconds > 0 && <span className="text-slate-300">{ex.rest_seconds}s rest</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MisRutinasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const user = getStoredUser<User>()

  const assignmentsQuery = useQuery({
    queryKey: ['my-routines', gymId],
    queryFn: () => api.get<UserRoutineAssignment[]>('/api/workouts/routines/my_assigned/'),
    enabled: !!user && user.role === 'athlete',
  })

  if (!user || user.role !== 'athlete') return null

  const assignments = assignmentsQuery.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Rutinas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Rutinas asignadas por tu coach</p>
      </div>

      {assignmentsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Sin rutinas asignadas</p>
            <p className="text-xs text-slate-400 mt-1">Tu coach te asignará rutinas de entrenamiento</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(a => (
            <RoutineCard key={a.id} assignment={a} gymId={gymId} />
          ))}
        </div>
      )}
    </div>
  )
}
