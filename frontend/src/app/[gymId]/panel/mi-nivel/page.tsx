'use client'

import { useEffect, useState, use } from 'react'
import { Trophy, Loader2, Star, Zap, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import PremiumGate from '@/components/PremiumGate'

interface PointEntry {
  id: string
  points: number
  source: string
  description: string
  created_at: string
}

interface StatsData {
  total_points: number
  level: number
  xp_in_level: number
  xp_to_next: number
  streak: {
    current_streak: number
    longest_streak: number
    last_activity_date: string | null
  }
  recent_points: PointEntry[]
}

const sourceLabels: Record<string, string> = {
  checkin: 'Check-in',
  challenge: 'Reto completado',
  workout: 'Entrenamiento',
  nutrition: 'Plan nutricional',
  manual: 'Bonificación',
}

const sourceIcons: Record<string, string> = {
  checkin: '📋',
  challenge: '🎯',
  workout: '💪',
  nutrition: '🥗',
  manual: '⭐',
}

function levelColor(level: number) {
  if (level < 5) return 'text-slate-600'
  if (level < 10) return 'text-emerald-600'
  if (level < 20) return 'text-blue-600'
  if (level < 35) return 'text-purple-600'
  return 'text-amber-500'
}

function levelTitle(level: number) {
  if (level < 5) return 'Principiante'
  if (level < 10) return 'Atleta'
  if (level < 20) return 'Competidor'
  if (level < 35) return 'Élite'
  return 'Leyenda'
}

export default function MiNivelPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<StatsData>('/api/gamification/my-stats/', {
          params: { gym: gymId },
        })
        setStats(data)
      } catch {
        setStats(null)
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

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Trophy className="w-12 h-12 text-slate-300" />
        <p className="text-slate-400 text-sm">No se pudo cargar tu progreso</p>
      </div>
    )
  }

  const { total_points, level, xp_in_level, xp_to_next, recent_points } = stats
  const progressPercent = Math.round((xp_in_level / (xp_in_level + xp_to_next)) * 100)
  const color = levelColor(level)
  const title = levelTitle(level)

  return (
    <PremiumGate feature="El sistema de niveles y puntos">
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Nivel</h1>
        <p className="text-slate-500 mt-2 text-lg">Tu progreso y puntos acumulados</p>
      </div>

      {/* Hero de nivel */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-slate-200 flex items-center justify-center">
              <span className={`text-4xl font-black ${color}`}>{level}</span>
            </div>
            <div className="text-center">
              <p className={`text-xl font-bold ${color}`}>{title}</p>
              <p className="text-slate-400 text-sm mt-1">Nivel {level}</p>
            </div>

            {/* Barra de XP */}
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>{xp_in_level} XP</span>
                <span>{xp_to_next} XP para nivel {level + 1}</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Puntos totales</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{total_points.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">XP en nivel actual</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{xp_in_level}</p>
            <p className="text-xs text-slate-400 mt-1">de 500 XP por nivel</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Faltan para subir</p>
            <p className="text-4xl font-black text-slate-900 mt-1">{xp_to_next}</p>
            <p className="text-xs text-slate-400 mt-1">puntos</p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de puntos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-700">Últimos puntos ganados</h2>
        </div>

        {recent_points.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center text-slate-400 text-sm">
              Aún no tienes puntos registrados. ¡Haz check-in o completa un reto!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent_points.map((entry) => (
              <Card key={entry.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{sourceIcons[entry.source] ?? '⭐'}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {sourceLabels[entry.source] ?? entry.source}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{entry.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-600">+{entry.points} pts</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString('es-PE', {
                        day: 'numeric', month: 'short',
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </PremiumGate>
  )
}
