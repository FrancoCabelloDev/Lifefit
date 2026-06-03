'use client'

import { useEffect, useState, use } from 'react'
import { TrendingUp, Loader2, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, Dumbbell, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface RoutineAdherence {
  routine_id: string
  routine_name: string
  assigned_since: string
  sessions_last_30d: number
  adherence_pct: number
  last_completed: string | null
  days_since_last: number | null
}

interface AthleteAdherence {
  athlete_id: string
  athlete_name: string
  athlete_email: string
  routines: RoutineAdherence[]
  total_sessions_30d: number
  avg_adherence_pct: number
  days_inactive: number | null
  alert: boolean
}

function AdherenceBadge({ pct }: { pct: number }) {
  if (pct >= 75) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{pct}% cumplimiento</Badge>
  if (pct >= 40) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{pct}% cumplimiento</Badge>
  return <Badge className="bg-rose-100 text-rose-700 border-rose-200">{pct}% cumplimiento</Badge>
}

function InactivityLabel({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400">Sin actividad registrada</span>
  if (days === 0) return <span className="text-xs text-emerald-600 font-medium">Activo hoy</span>
  if (days === 1) return <span className="text-xs text-emerald-600">Activo ayer</span>
  if (days < 7) return <span className="text-xs text-amber-600">Hace {days} días</span>
  return <span className="text-xs text-rose-500 font-semibold">Inactivo hace {days} días ⚠️</span>
}

export default function AdherenciaPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [data, setData] = useState<AthleteAdherence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get<AthleteAdherence[]>('/api/workouts/adherence/')
        setData(res)
      } catch {
        setData([])
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [gymId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const alerts = data.filter(a => a.alert).length
  const active = data.filter(a => !a.alert).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Adherencia</h1>
        <p className="text-slate-500 mt-2 text-lg">Seguimiento de cumplimiento de rutinas por atleta</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Atletas activos</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{active}</p>
            <p className="text-xs text-slate-400 mt-1">sin alertas de inactividad</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Requieren atención</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{alerts}</p>
            <p className="text-xs text-slate-400 mt-1">7+ días sin actividad</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Adherencia promedio</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {data.length > 0
                ? Math.round(data.reduce((s, a) => s + a.avg_adherence_pct, 0) / data.length)
                : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista atletas */}
      {data.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Dumbbell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Sin atletas asignados</h3>
            <p className="text-slate-500 mt-1">Asigna atletas desde la sección de Atletas para ver su adherencia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((athlete) => {
            const isExpanded = expandedId === athlete.athlete_id
            return (
              <Card
                key={athlete.athlete_id}
                className={cn(
                  'border shadow-sm transition-all',
                  athlete.alert ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'
                )}
              >
                <CardContent className="p-0">
                  {/* Fila principal — clickeable */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : athlete.athlete_id)}
                    onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : athlete.athlete_id)}
                    className="flex items-center gap-4 p-5 cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      athlete.alert ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                    )}>
                      {athlete.athlete_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{athlete.athlete_name}</p>
                        {athlete.alert && (
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <InactivityLabel days={athlete.days_inactive} />
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">
                          {athlete.total_sessions_30d} sesión{athlete.total_sessions_30d !== 1 ? 'es' : ''} en 30 días
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">
                          {athlete.routines.length} rutina{athlete.routines.length !== 1 ? 's' : ''} asignada{athlete.routines.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Adherencia + chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className={cn(
                          'text-lg font-black',
                          athlete.avg_adherence_pct >= 75 ? 'text-emerald-600'
                          : athlete.avg_adherence_pct >= 40 ? 'text-amber-500'
                          : 'text-rose-500'
                        )}>
                          {athlete.avg_adherence_pct}%
                        </p>
                        <p className="text-[10px] text-slate-400">adherencia</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-slate-400" />
                        : <ChevronDown className="w-5 h-5 text-slate-400" />
                      }
                    </div>
                  </div>

                  {/* Detalle rutinas */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-3">
                      {athlete.routines.length === 0 ? (
                        <p className="text-sm text-slate-400">Sin rutinas activas asignadas.</p>
                      ) : (
                        athlete.routines.map((r) => (
                          <div key={r.routine_id} className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Dumbbell className="w-4 h-4 text-slate-400 shrink-0" />
                                <p className="text-sm font-semibold text-slate-800">{r.routine_name}</p>
                              </div>
                              <AdherenceBadge pct={r.adherence_pct} />
                            </div>
                            <Progress
                              value={r.adherence_pct}
                              className="h-2"
                            />
                            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {r.sessions_last_30d} sesión{r.sessions_last_30d !== 1 ? 'es' : ''} en 30 días
                              </span>
                              <span>
                                {r.last_completed
                                  ? `Última: ${new Date(r.last_completed + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
                                  : 'Nunca completada'}
                              </span>
                              <span>Asignada desde {new Date(r.assigned_since + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
