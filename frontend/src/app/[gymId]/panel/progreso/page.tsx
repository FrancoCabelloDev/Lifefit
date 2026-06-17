'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp, Users, AlertTriangle, CheckCircle2, Search,
  ChevronLeft, ChevronRight, Ruler, Plus, X, Scale,
  Activity, Minus, ChevronDown, ChevronUp, FileText,
  BarChart2, Salad, Circle,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar,
} from 'recharts'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChartSkeleton, TableSkeleton } from '@/components/ui/skeletons'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, NutritionistDashboard, NutritionistAthlete, BodyMeasurement } from '@/lib/types'

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

type NewMeasForm = {
  measured_at: string
  weight_kg: string
  height_cm: string
  body_fat_pct: string
  muscle_mass_kg: string
  waist_cm: string
  hip_cm: string
  arm_cm: string
  visceral_fat: string
  notes: string
}

const EMPTY_FORM: NewMeasForm = {
  measured_at: new Date().toISOString().slice(0, 10),
  weight_kg: '', height_cm: '', body_fat_pct: '', muscle_mass_kg: '',
  waist_cm: '', hip_cm: '', arm_cm: '', visceral_fat: '', notes: '',
}

interface AthleteDrawerProps {
  gymId: string
  athlete: NutritionistAthlete
  onClose: () => void
}

function AthleteDrawer({ gymId, athlete, onClose }: AthleteDrawerProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewMeasForm>(EMPTY_FORM)
  const [activeChart, setActiveChart] = useState<'weight' | 'fat' | 'waist'>('weight')

  const [logsWeek, setLogsWeek] = useState(0) // 0 = esta semana, -1 = semana anterior, etc.
  const [activeTab, setActiveTab] = useState<'medidas' | 'nutricion'>('medidas')

  const historyQuery = useQuery({
    queryKey: ['body-measurements', gymId, athlete.id],
    queryFn: () => api.get<BodyMeasurement[]>('/api/gyms/body-measurements/athlete_history/', {
      params: { athlete_id: athlete.id },
    }),
  })

  const weekComplianceQuery = useQuery({
    queryKey: ['athlete-weekly-compliance', athlete.id, logsWeek],
    queryFn: async () => {
      const today = new Date()
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1 + logsWeek * 7)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const fmt = (d: Date) => d.toISOString().slice(0, 10)
      const res = await api.get<any>('/api/nutrition/meal-logs/', {
        params: { athlete_id: athlete.id, date_from: fmt(monday), date_to: fmt(sunday) },
      })
      const logs = (res?.results ?? res ?? []) as any[]
      const days: Record<string, { total: number; completed: number }> = {}
      logs.forEach((l: any) => {
        if (!days[l.date]) days[l.date] = { total: 0, completed: 0 }
        days[l.date].total++
        if (l.status === 'completed') days[l.date].completed++
      })
      return { days, dateFrom: fmt(monday), dateTo: fmt(sunday) }
    },
    staleTime: 30000,
  })

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string | number | null>) =>
      api.post('/api/gyms/body-measurements/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-measurements', gymId, athlete.id] })
      setForm(EMPTY_FORM)
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/gyms/body-measurements/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['body-measurements', gymId, athlete.id] }),
  })

  const measurements = historyQuery.data || []
  const latest = measurements[measurements.length - 1] ?? null
  const prev = measurements[measurements.length - 2] ?? null

  const chartData = measurements.map(m => ({
    date: fmtDate(m.measured_at),
    weight: m.weight_kg ? parseFloat(m.weight_kg) : null,
    fat: m.body_fat_pct ? parseFloat(m.body_fat_pct) : null,
    waist: m.waist_cm ? parseFloat(m.waist_cm) : null,
    bmi: m.bmi,
  }))

  function handleSave() {
    const payload: Record<string, string | number | null> = {
      athlete: athlete.id,
      measured_at: form.measured_at,
      notes: form.notes,
      weight_kg: form.weight_kg || null,
      height_cm: form.height_cm || null,
      body_fat_pct: form.body_fat_pct || null,
      muscle_mass_kg: form.muscle_mass_kg || null,
      waist_cm: form.waist_cm || null,
      hip_cm: form.hip_cm || null,
      arm_cm: form.arm_cm || null,
      visceral_fat: form.visceral_fat ? parseInt(form.visceral_fat) : null,
    }
    saveMutation.mutate(payload)
  }

  const CHART_LINES = {
    weight: { key: 'weight', label: 'Peso (kg)', color: '#2c6956', unit: 'kg' },
    fat: { key: 'fat', label: 'Grasa corporal (%)', color: '#f59e0b', unit: '%' },
    waist: { key: 'waist', label: 'Cintura (cm)', color: '#8b5cf6', unit: 'cm' },
  }
  const cl = CHART_LINES[activeChart]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm">
              {athlete.first_name[0]}{athlete.last_name[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{athlete.first_name} {athlete.last_name}</p>
              <p className="text-[10px] text-slate-400">{athlete.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(v => !v)}
              className="h-8 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva medida
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {(['medidas', 'nutricion'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 pt-2 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'medidas' ? '⚖️ Medidas' : '🥗 Nutrición'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6 flex-1">

          {/* ── TAB NUTRICIÓN ─────────────────────────────────────── */}
          {activeTab === 'nutricion' && (
            <div className="space-y-4">
              {/* Navegación semanas */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Registro de comidas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLogsWeek(w => w - 1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <span className="text-xs text-slate-500 min-w-[80px] text-center">
                    {logsWeek === 0 ? 'Esta semana' : logsWeek === -1 ? 'Semana pasada' : `Hace ${Math.abs(logsWeek)} semanas`}
                  </span>
                  <button
                    onClick={() => setLogsWeek(w => Math.min(w + 1, 0))}
                    disabled={logsWeek === 0}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              {weekComplianceQuery.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />)}
                </div>
              ) : !weekComplianceQuery.data || Object.keys(weekComplianceQuery.data.days).length === 0 ? (
                <div className="py-10 text-center">
                  <Salad className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">Sin registros esta semana</p>
                  <p className="text-xs text-slate-300 mt-1">El atleta no ha registrado comidas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(weekComplianceQuery.data.days)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, data]) => {
                      const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
                      const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'
                      const bg    = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                      return (
                        <div key={date} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700">
                              {new Date(date + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`text-xs font-bold ${color}`}>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            {data.completed} de {data.total} comidas completadas
                          </p>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Resumen de la semana */}
              {weekComplianceQuery.data && Object.keys(weekComplianceQuery.data.days).length > 0 && (() => {
                const days = weekComplianceQuery.data!.days
                const totalDays = Object.keys(days).length
                const avgPct = Math.round(
                  Object.values(days).reduce((acc, d) => acc + (d.total > 0 ? (d.completed / d.total) * 100 : 0), 0) / totalDays
                )
                return (
                  <div className={`rounded-xl border p-3 flex items-center gap-3 ${avgPct >= 80 ? 'bg-emerald-50 border-emerald-100' : avgPct >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className={`text-2xl font-black ${avgPct >= 80 ? 'text-emerald-600' : avgPct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {avgPct}%
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Promedio semanal</p>
                      <p className="text-[10px] text-slate-500">{totalDays} días con registro</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── TAB MEDIDAS ───────────────────────────────────────── */}
          {activeTab === 'medidas' && <>

          {/* Latest snapshot */}
          {latest && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Peso', value: latest.weight_kg ? `${parseFloat(latest.weight_kg)}` : '—', unit: 'kg', prevVal: prev?.weight_kg ? parseFloat(prev.weight_kg) : null, currVal: latest.weight_kg ? parseFloat(latest.weight_kg) : null },
                { label: 'IMC', value: latest.bmi ? String(latest.bmi) : '—', unit: '', prevVal: prev?.bmi ?? null, currVal: latest.bmi ?? null },
                { label: 'Grasa', value: latest.body_fat_pct ? `${parseFloat(latest.body_fat_pct)}` : '—', unit: '%', prevVal: prev?.body_fat_pct ? parseFloat(prev.body_fat_pct) : null, currVal: latest.body_fat_pct ? parseFloat(latest.body_fat_pct) : null },
                { label: 'Cintura', value: latest.waist_cm ? `${parseFloat(latest.waist_cm)}` : '—', unit: 'cm', prevVal: prev?.waist_cm ? parseFloat(prev.waist_cm) : null, currVal: latest.waist_cm ? parseFloat(latest.waist_cm) : null },
              ].map(card => (
                <div key={card.label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">{card.label}</p>
                  <p className="text-lg font-bold text-slate-900">{card.value}{card.unit && card.value !== '—' ? <span className="text-xs font-normal text-slate-400 ml-0.5">{card.unit}</span> : null}</p>
                  <Delta prev={card.prevVal} curr={card.currVal} unit={card.unit} />
                </div>
              ))}
            </div>
          )}

          {/* New measurement form */}
          {showForm && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-emerald-900">Registrar nueva medida</p>
                <input
                  type="date"
                  value={form.measured_at}
                  onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))}
                  className="h-7 px-2 rounded-lg border border-emerald-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { field: 'weight_kg', label: 'Peso (kg)', placeholder: '70.5' },
                  { field: 'height_cm', label: 'Talla (cm)', placeholder: '170' },
                  { field: 'body_fat_pct', label: 'Grasa (%)' , placeholder: '18.5' },
                  { field: 'muscle_mass_kg', label: 'Músculo (kg)', placeholder: '55' },
                  { field: 'waist_cm', label: 'Cintura (cm)', placeholder: '80' },
                  { field: 'hip_cm', label: 'Cadera (cm)', placeholder: '95' },
                  { field: 'arm_cm', label: 'Brazo (cm)', placeholder: '30' },
                  { field: 'visceral_fat', label: 'Grasa visceral', placeholder: '5' },
                ] as { field: keyof NewMeasForm; label: string; placeholder: string }[]).map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="text-[10px] font-medium text-emerald-800 block mb-1">{label}</label>
                    <Input
                      type="number"
                      placeholder={placeholder}
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      className="h-7 text-xs rounded-lg border-emerald-200 bg-white focus-visible:ring-emerald-400"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-medium text-emerald-800 block mb-1">Notas de consulta</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observaciones, recomendaciones..."
                  rows={2}
                  className="w-full text-xs rounded-lg border border-emerald-200 bg-white p-2 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder-slate-400"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                  className="h-8 px-3 text-xs rounded-xl border border-emerald-200 text-emerald-700 hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="h-8 px-4 text-xs rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Guardando…' : 'Guardar medida'}
                </button>
              </div>
              {saveMutation.isError && (
                <p className="text-xs text-rose-600">Error al guardar. Verifica los datos.</p>
              )}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700">Evolución</p>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                  {(['weight', 'fat', 'waist'] as const).map(k => (
                    <button
                      key={k}
                      onClick={() => setActiveChart(k)}
                      className={`px-3 h-7 text-[10px] font-medium transition-colors ${activeChart === k ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      {k === 'weight' ? 'Peso' : k === 'fat' ? 'Grasa' : 'Cintura'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
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

          {/* History table */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-3">
              Historial de medidas
              {measurements.length > 0 && <span className="ml-2 text-slate-400 font-normal">({measurements.length} registros)</span>}
            </p>
            {historyQuery.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />)}
              </div>
            ) : measurements.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Ruler className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p className="text-sm">Sin medidas registradas</p>
                <p className="text-xs mt-1">Registra la primera consulta con el botón de arriba</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...measurements].reverse().map((m, i) => (
                  <div key={m.id} className={`rounded-xl border p-3 ${i === 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-slate-900">{fmtDate(m.measured_at)}</span>
                          {i === 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0 px-1.5 py-0">Última</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {m.weight_kg && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Peso</span> {parseFloat(m.weight_kg)} kg</span>}
                          {m.bmi && <span className="text-[10px] text-slate-600"><span className="text-slate-400">IMC</span> {m.bmi}</span>}
                          {m.body_fat_pct && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Grasa</span> {parseFloat(m.body_fat_pct)}%</span>}
                          {m.muscle_mass_kg && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Músculo</span> {parseFloat(m.muscle_mass_kg)} kg</span>}
                          {m.waist_cm && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Cintura</span> {parseFloat(m.waist_cm)} cm</span>}
                          {m.hip_cm && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Cadera</span> {parseFloat(m.hip_cm)} cm</span>}
                          {m.arm_cm && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Brazo</span> {parseFloat(m.arm_cm)} cm</span>}
                          {m.visceral_fat != null && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Visceral</span> {m.visceral_fat}</span>}
                          {m.height_cm && <span className="text-[10px] text-slate-600"><span className="text-slate-400">Talla</span> {parseFloat(m.height_cm)} cm</span>}
                        </div>
                        {m.notes && <p className="text-[10px] text-slate-400 mt-1.5 italic">"{m.notes}"</p>}
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(m.id)}
                        className="w-6 h-6 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          </> /* fin tab medidas */}
        </div>
      </div>
    </div>
  )
}

export default function ProgresoPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()
  const user = getStoredUser<User>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'low' | 'good'>('all')
  const [selectedAthlete, setSelectedAthlete] = useState<NutritionistAthlete | null>(null)

  const dashQuery = useQuery({
    queryKey: ['nutritionist-dashboard', gymId],
    queryFn: () => api.get<NutritionistDashboard>('/api/gyms/nutritionist-assignments/dashboard/'),
  })

  const complianceQuery = useQuery({
    queryKey: ['compliance-chart', gymId],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/nutritionist-assignments/compliance_chart/', { params: { days: '14' } })
      return (data?.daily || []) as { date: string; compliance: number; completed: number; total: number }[]
    },
    staleTime: 60000,
  })

  const athletesQuery = useQuery({
    queryKey: ['nutri-athletes', gymId, search, page, filter],
    queryFn: async () => {
      const p: any = { search, page: String(page), page_size: '12' }
      if (filter === 'low') p.low_compliance = 'true'
      const data = await api.get<any>('/api/gyms/nutritionist-assignments/my_athletes/', { params: p })
      return {
        athletes: (data.results || []) as NutritionistAthlete[],
        total: data.total || 0,
        total_pages: data.total_pages || 1,
      }
    },
  })

  const nd = dashQuery.data
  const athletes = athletesQuery.data?.athletes || []
  const totalPages = athletesQuery.data?.total_pages || 1

  if (!user || user.role !== 'nutritionist') return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Progreso</h1>
          <p className="text-sm text-slate-500 mt-0.5">Seguimiento nutricional y medidas antropométricas</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clientes asignados', value: nd?.total_athletes, icon: Users, color: 'violet' },
          { label: 'Cumplimiento promedio', value: nd?.avg_compliance_percentage != null ? `${nd.avg_compliance_percentage}%` : undefined, icon: TrendingUp, color: 'emerald' },
          { label: 'Con plan activo', value: nd?.with_active_plan, icon: CheckCircle2, color: 'amber' },
          { label: 'Bajo cumplimiento', value: nd?.low_compliance_athletes, icon: AlertTriangle, color: 'rose' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className={`w-8 h-8 bg-${color}-100 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Compliance chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Cumplimiento diario — últimas 2 semanas</h2>
        {complianceQuery.isLoading ? (
          <ChartSkeleton />
        ) : complianceQuery.data && complianceQuery.data.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceQuery.data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
                  }}
                  axisLine={false} tickLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: any) => [`${v}%`, 'Cumplimiento']}
                  labelFormatter={(v: any) => new Date(String(v) + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}
                />
                <Bar dataKey="compliance" fill="#2c6956" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Sin datos de cumplimiento aún
          </div>
        )}
      </div>

      {/* Athletes table */}
      <div className="bg-white rounded-2xl border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-700">Clientes y medidas</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {(['all', 'low', 'good'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1) }}
                  className={`px-3 h-7 text-xs font-medium transition-colors ${filter === f ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {f === 'all' ? 'Todos' : f === 'low' ? 'Bajo cumplimiento' : 'En forma'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Buscar..."
                className="pl-8 h-8 text-xs rounded-xl border-slate-200 w-40"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </div>

        {athletesQuery.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : athletes.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-200 mb-3" />
            <p className="text-sm">No hay clientes que mostrar</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan activo</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cumplimiento</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Medidas</th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {athletes.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {a.first_name[0]}{a.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{a.first_name} {a.last_name}</p>
                            <p className="text-[10px] text-slate-400">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {a.has_active_plan ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]">{a.plan_name}</Badge>
                        ) : (
                          <span className="text-xs text-slate-300">Sin plan</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={a.compliance_percentage}
                            className={`h-1.5 w-20 ${a.compliance_percentage < 50 ? '[&>div]:bg-rose-500' : a.compliance_percentage < 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                          />
                          <span className={`text-xs font-bold ${a.compliance_percentage < 50 ? 'text-rose-600' : a.compliance_percentage < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {a.compliance_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelectedAthlete(a)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg px-2.5 h-7 transition-colors"
                        >
                          <Ruler className="w-3 h-3" />
                          Medidas
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.id}`)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          Ver perfil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-100">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedAthlete && (
        <AthleteDrawer
          gymId={gymId}
          athlete={selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
        />
      )}
    </div>
  )
}
