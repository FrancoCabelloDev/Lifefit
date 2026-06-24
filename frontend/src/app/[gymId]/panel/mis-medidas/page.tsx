'use client'

import { useState, use, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Scale, Ruler, TrendingUp, ChevronDown, ChevronUp,
  Activity, Loader2, Target, CalendarDays, Save,
  Stethoscope, ArrowRight, CalendarPlus,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { showSuccess, showError } from '@/lib/toast'
import type { User, BodyMeasurement } from '@/lib/types'
import { useFeatureGuard } from '@/hooks/useFeatureGuard'

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

// ── Empty state ───────────────────────────────────────────────────────────────

function NoMeasurementsState({ gymId }: { gymId: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center px-8 max-w-sm mx-auto">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center">
          <Stethoscope className="w-9 h-9 text-teal-500" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
          <Scale className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-base font-semibold text-slate-800 tracking-tight">
          Aún no tienes medidas registradas
        </p>
        <p className="text-sm text-slate-400 leading-relaxed">
          Tu composición corporal es evaluada por tu nutricionista durante la consulta.
          Agenda tu primera cita para iniciar tu seguimiento.
        </p>
      </div>

      <button
        onClick={() => router.push(`/${gymId}/panel/mis-citas`)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
        style={{ transition: 'background-color 150ms, transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={e => (e.currentTarget.style.transform = '')}
        onMouseLeave={e => (e.currentTarget.style.transform = '')}
      >
        <CalendarPlus className="w-4 h-4" />
        Agendar primera consulta
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-xs text-slate-300">
        Una vez que tu nutricionista registre tus medidas, aparecerán aquí con tu evolución en el tiempo.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MisMedidasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useFeatureGuard(gymId, 'nutricion')
  const user = getStoredUser<User>()
  const queryClient = useQueryClient()
  const [activeChart, setActiveChart] = useState<'weight' | 'fat' | 'waist'>('weight')
  const [goalWeight, setGoalWeight] = useState('')
  const [goalFat, setGoalFat]       = useState('')
  const [goalDate, setGoalDate]     = useState('')
  const [goalNotes, setGoalNotes]   = useState('')
  const [goalSaved, setGoalSaved]   = useState(false)

  const historyQuery = useQuery({
    queryKey: ['my-measurements', gymId],
    queryFn: () => api.get<BodyMeasurement[]>('/api/gyms/body-measurements/my_history/'),
  })

  const goalQuery = useQuery({
    queryKey: ['my-goal', gymId],
    queryFn: () => api.get<any>('/api/gyms/athlete-goals/mine/'),
  })

  useEffect(() => {
    const data = goalQuery.data
    if (!data) return
    setGoalWeight(data.target_weight_kg ?? '')
    setGoalFat(data.target_body_fat_pct ?? '')
    setGoalDate(data.target_date ?? '')
    setGoalNotes(data.notes ?? '')
  }, [goalQuery.data])

  const saveGoalMutation = useMutation({
    mutationFn: () => api.patch('/api/gyms/athlete-goals/mine/', {
      target_weight_kg:    goalWeight    || null,
      target_body_fat_pct: goalFat       || null,
      target_date:         goalDate      || null,
      notes:               goalNotes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-goal', gymId] })
      setGoalSaved(true)
      showSuccess('Meta guardada')
      setTimeout(() => setGoalSaved(false), 2500)
    },
    onError: (err) => showError(err, 'No se pudo guardar la meta'),
  })

  if (!user || user.role !== 'athlete') return null

  const measurements = historyQuery.data ?? []
  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null
  const prev   = measurements.length > 1 ? measurements[measurements.length - 2] : null

  const toNum = (v: string | null | undefined) => v ? parseFloat(v) : null

  const chartData = measurements.map(m => ({
    date:   fmtDate(m.measured_at),
    weight: toNum(m.weight_kg),
    fat:    toNum(m.body_fat_pct),
    waist:  toNum(m.waist_cm),
  }))

  const CHART_LINES = {
    weight: { key: 'weight', label: 'Peso (kg)',          color: '#2c6956', unit: 'kg' },
    fat:    { key: 'fat',    label: 'Grasa corporal (%)', color: '#f59e0b', unit: '%'  },
    waist:  { key: 'waist',  label: 'Cintura (cm)',       color: '#8b5cf6', unit: 'cm' },
  }
  const cl = CHART_LINES[activeChart]

  const summaryCards = latest ? [
    {
      label: 'Peso',    value: latest.weight_kg   ? `${toNum(latest.weight_kg)}`   : '—', unit: 'kg', icon: Scale,
      prevVal: toNum(prev?.weight_kg),   currVal: toNum(latest.weight_kg),
    },
    {
      label: 'IMC',     value: latest.bmi          ? String(latest.bmi)              : '—', unit: '',   icon: Activity,
      prevVal: prev?.bmi ?? null,         currVal: latest.bmi ?? null,
    },
    {
      label: 'Grasa',   value: latest.body_fat_pct ? `${toNum(latest.body_fat_pct)}` : '—', unit: '%',  icon: TrendingUp,
      prevVal: toNum(prev?.body_fat_pct), currVal: toNum(latest.body_fat_pct),
    },
    {
      label: 'Cintura', value: latest.waist_cm     ? `${toNum(latest.waist_cm)}`     : '—', unit: 'cm', icon: Ruler,
      prevVal: toNum(prev?.waist_cm),     currVal: toNum(latest.waist_cm),
    },
  ] : []

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Medidas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Seguimiento de tu composición corporal registrado por tu nutricionista
        </p>
      </div>

      {historyQuery.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : measurements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100">
          <NoMeasurementsState gymId={gymId} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                  <card.icon className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {card.value}
                  {card.unit && card.value !== '—' && (
                    <span className="text-xs font-normal text-slate-400 ml-0.5">{card.unit}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
                <div className="mt-1">
                  <Delta prev={card.prevVal} curr={card.currVal} unit={card.unit} />
                </div>
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
                    <button
                      key={k}
                      onClick={() => setActiveChart(k)}
                      className={`px-3 h-7 text-[10px] font-medium transition-colors ${
                        activeChart === k ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {k === 'weight' ? 'Peso' : k === 'fat' ? 'Grasa' : 'Cintura'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height={208}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit={cl.unit} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                      formatter={(v: any) => [`${v}${cl.unit}`, cl.label]}
                    />
                    <Line
                      type="monotone"
                      dataKey={cl.key}
                      stroke={cl.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: cl.color, strokeWidth: 0 }}
                      connectNulls
                    />
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
                <div
                  key={m.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    i === 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900">{fmtDate(m.measured_at)}</span>
                    {i === 0 && (
                      <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0 px-1.5 py-0">
                        Última
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-1.5 py-0">
                      <Stethoscope className="w-2.5 h-2.5" />
                      {m.recorded_by ?? 'Nutricionista'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {m.weight_kg      && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Peso</span> {toNum(m.weight_kg)} kg</span>}
                    {m.bmi            && <span className="text-[11px] text-slate-600"><span className="text-slate-400">IMC</span> {m.bmi}</span>}
                    {m.body_fat_pct   && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Grasa</span> {toNum(m.body_fat_pct)}%</span>}
                    {m.muscle_mass_kg && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Músculo</span> {toNum(m.muscle_mass_kg)} kg</span>}
                    {m.waist_cm       && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Cintura</span> {toNum(m.waist_cm)} cm</span>}
                    {m.hip_cm         && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Cadera</span> {toNum(m.hip_cm)} cm</span>}
                    {m.arm_cm         && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Brazo</span> {toNum(m.arm_cm)} cm</span>}
                    {m.visceral_fat != null && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Visceral</span> {m.visceral_fat}</span>}
                  </div>
                  {m.notes && (
                    <p className="text-[10px] text-slate-400 mt-2 italic">"{m.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Meta del atleta — siempre visible */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-700">Mi meta</h2>
          <span className="ml-auto text-[10px] text-slate-400">Tu nutricionista puede verla</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Peso objetivo (kg)
            </label>
            <input
              type="number" step="0.1" min="30" max="250" placeholder="ej. 75"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              % Grasa objetivo
            </label>
            <input
              type="number" step="0.1" min="1" max="60" placeholder="ej. 18"
              value={goalFat}
              onChange={e => setGoalFat(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Fecha límite
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date" value={goalDate}
                onChange={e => setGoalDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Notas <span className="text-slate-300 normal-case font-normal">(opcional)</span>
          </label>
          <textarea
            rows={2} placeholder="Motivación, contexto de tu meta..."
            value={goalNotes}
            onChange={e => setGoalNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-xs text-emerald-500 transition-opacity duration-300"
            style={{ opacity: goalSaved ? 1 : 0 }}
          >
            Meta guardada
          </span>
          <button
            onClick={() => saveGoalMutation.mutate()}
            disabled={saveGoalMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
            style={{ transition: 'background-color 150ms, transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            {saveGoalMutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando...</>
              : <><Save className="w-3.5 h-3.5" />Guardar meta</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
