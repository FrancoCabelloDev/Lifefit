'use client'

import { useState, use, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Star, Zap, Award, TrendingUp,
  Scale, Ruler, Activity, ChevronDown, ChevronUp, CalendarDays,
  Loader2,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import PremiumGate from '@/components/PremiumGate'
import type { User, BodyMeasurement } from '@/lib/types'

// ── Nivel types ──────────────────────────────────────────────────────────────

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
  streak: { current_streak: number; longest_streak: number; last_activity_date: string | null }
  recent_points: PointEntry[]
}

const SOURCE_LABELS: Record<string, string> = {
  checkin: 'Check-in', challenge: 'Reto completado',
  workout: 'Entrenamiento', nutrition: 'Plan nutricional', manual: 'Bonificación',
}
const SOURCE_ICONS: Record<string, string> = {
  checkin: '📋', challenge: '🎯', workout: '💪', nutrition: '🥗', manual: '⭐',
}

function levelColor(l: number) {
  if (l < 5) return 'text-slate-600'
  if (l < 10) return 'text-emerald-600'
  if (l < 20) return 'text-blue-600'
  if (l < 35) return 'text-purple-600'
  return 'text-amber-500'
}
function levelTitle(l: number) {
  if (l < 5) return 'Principiante'
  if (l < 10) return 'Atleta'
  if (l < 20) return 'Competidor'
  if (l < 35) return 'Élite'
  return 'Leyenda'
}

// ── Medidas helpers ───────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })
}

function Delta({ prev, curr, unit = '' }: { prev: number | null; curr: number | null; unit?: string }) {
  if (prev == null || curr == null) return null
  const d = parseFloat((curr - prev).toFixed(1))
  if (d === 0) return <span className="text-xs text-slate-400">sin cambio</span>
  const up = d > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-rose-500' : 'text-emerald-600'}`}>
      {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {Math.abs(d)}{unit}
    </span>
  )
}

// ── Tab components ────────────────────────────────────────────────────────────

function TabNivel({ gymId }: { gymId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<StatsData>('/api/gamification/my-stats/', { params: { gym: gymId } })
      .then(setStats).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [gymId])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
  if (!stats) return <div className="flex flex-col items-center py-20 gap-3"><Trophy className="w-12 h-12 text-slate-300" /><p className="text-slate-400 text-sm">No se pudo cargar tu nivel</p></div>

  const { total_points, level, xp_in_level, xp_to_next, recent_points } = stats
  const progressPercent = Math.round((xp_in_level / (xp_in_level + xp_to_next)) * 100)
  const color = levelColor(level)

  return (
    <PremiumGate feature="El sistema de niveles y puntos">
      <div className="space-y-6">
        {/* Hero */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-slate-200 flex items-center justify-center">
                <span className={`text-4xl font-black ${color}`}>{level}</span>
              </div>
              <div className="text-center">
                <p className={`text-xl font-bold ${color}`}>{levelTitle(level)}</p>
                <p className="text-slate-400 text-sm mt-1">Nivel {level}</p>
              </div>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Puntos totales', value: total_points.toLocaleString(), icon: Star, color: 'bg-amber-50', iconColor: 'text-amber-500' },
            { label: 'XP en nivel actual', value: xp_in_level, icon: TrendingUp, color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
            { label: 'Faltan para subir', value: xp_to_next, icon: Zap, color: 'bg-purple-50', iconColor: 'text-purple-600' },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <p className="text-sm text-slate-500 font-medium">{s.label}</p>
                <p className="text-4xl font-black text-slate-900 mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Historial puntos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-700">Últimos puntos ganados</h2>
          </div>
          {recent_points.length === 0 ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-8 text-center text-slate-400 text-sm">
                Aún no tienes puntos. ¡Haz check-in o completa un reto!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recent_points.map(e => (
                <Card key={e.id} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{SOURCE_ICONS[e.source] ?? '⭐'}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{SOURCE_LABELS[e.source] ?? e.source}</p>
                        {e.description && <p className="text-xs text-slate-400 mt-0.5">{e.description}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-emerald-600">+{e.points} pts</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(e.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
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

function TabMedidas({ gymId }: { gymId: string }) {
  const [activeChart, setActiveChart] = useState<'weight' | 'fat' | 'waist'>('weight')

  const { data, isLoading } = useQuery({
    queryKey: ['my-measurements', gymId],
    queryFn: () => api.get<BodyMeasurement[]>('/api/gyms/body-measurements/my_history/'),
  })

  const measurements = data || []
  const latest = measurements[measurements.length - 1] ?? null
  const prev = measurements[measurements.length - 2] ?? null

  const chartData = measurements.map(m => ({
    date: fmtDate(m.measured_at),
    weight: m.weight_kg ? parseFloat(m.weight_kg as unknown as string) : null,
    fat: m.body_fat_pct ? parseFloat(m.body_fat_pct as unknown as string) : null,
    waist: m.waist_cm ? parseFloat(m.waist_cm as unknown as string) : null,
  }))

  const CHART_LINES = {
    weight: { key: 'weight', label: 'Peso (kg)', color: '#2c6956', unit: 'kg' },
    fat: { key: 'fat', label: 'Grasa corporal (%)', color: '#f59e0b', unit: '%' },
    waist: { key: 'waist', label: 'Cintura (cm)', color: '#8b5cf6', unit: 'cm' },
  }
  const cl = CHART_LINES[activeChart]

  const summaryCards = latest ? [
    { label: 'Peso', value: latest.weight_kg ? `${parseFloat(latest.weight_kg as unknown as string)}` : '—', unit: 'kg', icon: Scale, prevVal: prev?.weight_kg ? parseFloat(prev.weight_kg as unknown as string) : null, currVal: latest.weight_kg ? parseFloat(latest.weight_kg as unknown as string) : null },
    { label: 'IMC', value: latest.bmi ? String(latest.bmi) : '—', unit: '', icon: Activity, prevVal: prev?.bmi ?? null, currVal: latest.bmi ?? null },
    { label: 'Grasa', value: latest.body_fat_pct ? `${parseFloat(latest.body_fat_pct as unknown as string)}` : '—', unit: '%', icon: TrendingUp, prevVal: prev?.body_fat_pct ? parseFloat(prev.body_fat_pct as unknown as string) : null, currVal: latest.body_fat_pct ? parseFloat(latest.body_fat_pct as unknown as string) : null },
    { label: 'Cintura', value: latest.waist_cm ? `${parseFloat(latest.waist_cm as unknown as string)}` : '—', unit: 'cm', icon: Ruler, prevVal: prev?.waist_cm ? parseFloat(prev.waist_cm as unknown as string) : null, currVal: latest.waist_cm ? parseFloat(latest.waist_cm as unknown as string) : null },
  ] : []

  if (isLoading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />)}
    </div>
  )

  if (measurements.length === 0) return (
    <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
        <Ruler className="w-7 h-7 text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">Aún no tienes medidas registradas</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Tu nutricionista tomará tus medidas en la primera consulta.
        </p>
      </div>
      <a
        href={`/${gymId}/panel/mis-citas`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
      >
        <CalendarDays className="w-4 h-4" />
        Ver mis citas
      </a>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
              <card.icon className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {card.value}
              {card.unit && card.value !== '—' && <span className="text-xs font-normal text-slate-400 ml-0.5">{card.unit}</span>}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            <div className="mt-1"><Delta prev={card.prevVal} curr={card.currVal} unit={card.unit} /></div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Evolución</h2>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {(['weight', 'fat', 'waist'] as const).map(k => (
                <button key={k} onClick={() => setActiveChart(k)}
                  className={`px-3 h-7 text-[10px] font-medium transition-colors ${activeChart === k ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {k === 'weight' ? 'Peso' : k === 'fat' ? 'Grasa' : 'Cintura'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit={cl.unit} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                  formatter={(v: any) => [`${v}${cl.unit}`, cl.label]} />
                <Line type="monotone" dataKey={cl.key} stroke={cl.color} strokeWidth={2}
                  dot={{ r: 4, fill: cl.color, strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Historial
          <span className="ml-2 text-slate-400 font-normal">({measurements.length} registros)</span>
        </h2>
        <div className="space-y-2">
          {[...measurements].reverse().map((m, i) => (
            <div key={m.id} className={`rounded-xl border p-3.5 ${i === 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-900">{fmtDate(m.measured_at)}</span>
                {i === 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0 px-1.5 py-0">Última</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {m.weight_kg && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Peso </span>{parseFloat(m.weight_kg as unknown as string)} kg</span>}
                {m.bmi && <span className="text-[11px] text-slate-600"><span className="text-slate-400">IMC </span>{m.bmi}</span>}
                {m.body_fat_pct && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Grasa </span>{parseFloat(m.body_fat_pct as unknown as string)}%</span>}
                {m.muscle_mass_kg && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Músculo </span>{parseFloat(m.muscle_mass_kg as unknown as string)} kg</span>}
                {m.waist_cm && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Cintura </span>{parseFloat(m.waist_cm as unknown as string)} cm</span>}
                {m.hip_cm && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Cadera </span>{parseFloat(m.hip_cm as unknown as string)} cm</span>}
                {m.arm_cm && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Brazo </span>{parseFloat(m.arm_cm as unknown as string)} cm</span>}
                {m.visceral_fat != null && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Visceral </span>{m.visceral_fat}</span>}
                {m.height_cm && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Talla </span>{parseFloat(m.height_cm as unknown as string)} cm</span>}
              </div>
              {m.notes && <p className="text-[10px] text-slate-400 mt-2 italic">"{m.notes}"</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'nivel', label: 'Nivel y Puntos' },
  { id: 'medidas', label: 'Medidas Corporales' },
] as const

type TabId = typeof TABS[number]['id']

export default function MiProgresoPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const user = getStoredUser<User>()
  const [activeTab, setActiveTab] = useState<TabId>('nivel')

  if (!user || user.role !== 'athlete') return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Progreso</h1>
        <p className="text-sm text-slate-500 mt-0.5">Tu nivel, puntos y evolución física</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 h-8 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'nivel' ? <TabNivel gymId={gymId} /> : <TabMedidas gymId={gymId} />}
    </div>
  )
}
