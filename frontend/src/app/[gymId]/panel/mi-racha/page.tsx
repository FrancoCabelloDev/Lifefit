'use client'

import { useEffect, useState, use } from 'react'
import { Flame, Loader2, Calendar, TrendingUp, Trophy, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import PremiumGate from '@/components/PremiumGate'

interface StreakData {
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
          {icon}
        </div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-4xl font-black text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function StreakFlame({ streak }: { streak: number }) {
  const size = streak === 0 ? 'text-6xl' : streak >= 7 ? 'text-8xl' : 'text-7xl'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${size} select-none`} style={{ filter: streak === 0 ? 'grayscale(1) opacity(0.3)' : undefined }}>
        🔥
      </div>
      <p className="text-slate-500 text-sm font-medium">
        {streak === 0
          ? 'Haz check-in hoy para empezar tu racha'
          : streak === 1
          ? 'Llevas 1 día — ¡sigue así!'
          : `${streak} días consecutivos`}
      </p>
    </div>
  )
}

export default function MiRachaPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<StreakData>('/api/gamification/my-streak/', {
          params: { gym: gymId },
        })
        setStreak(data)
      } catch {
        setStreak({ current_streak: 0, longest_streak: 0, last_activity_date: null })
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

  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0
  const lastDate = streak?.last_activity_date
    ? new Date(streak.last_activity_date + 'T00:00:00').toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : null

  const motivationalMsg = () => {
    if (current === 0) return 'Empieza hoy y construye el hábito'
    if (current < 3) return 'Buen comienzo, no pares ahora'
    if (current < 7) return 'Ya tienes impulso, ¡mantén la racha!'
    if (current < 14) return 'Una semana de consistencia — eso es carácter'
    if (current < 30) return '¡Dos semanas sin parar, increíble!'
    return '¡Eres una máquina! Racha élite 🏆'
  }

  return (
    <PremiumGate feature="La racha de asistencia">
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Racha</h1>
        <p className="text-slate-500 mt-2 text-lg">Tu consistencia diaria en el gimnasio</p>
      </div>

      {/* Hero de racha */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-6">
            <StreakFlame streak={current} />
            <div className="text-center">
              <p className="text-6xl font-black text-slate-900">{current}</p>
              <p className="text-slate-400 text-sm mt-1">días de racha actual</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-center">
              <p className="text-sm font-medium text-slate-600">{motivationalMsg()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Racha actual"
          value={current}
          sub="días consecutivos"
          color="bg-orange-50"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-amber-500" />}
          label="Mejor racha"
          value={longest}
          sub="tu récord personal"
          color="bg-amber-50"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-emerald-600" />}
          label="Último check-in"
          value={lastDate ? lastDate.split(',')[0] : '—'}
          sub={lastDate ?? 'Sin actividad registrada'}
          color="bg-emerald-50"
        />
      </div>

      {/* Tips */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-slate-700">¿Cómo funciona la racha?</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">•</span>
              Cada vez que haces check-in en el gimnasio, tu racha avanza un día.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">•</span>
              Si fallas un día, la racha vuelve a 0 — pero tu récord personal queda guardado.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">•</span>
              Mantén tu racha para subir posiciones en la tabla de posiciones.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
    </PremiumGate>
  )
}
