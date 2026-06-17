'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scale, Ruler, TrendingUp, ChevronDown, ChevronUp,
  Activity, Plus, X, Loader2, Target, CalendarDays, Save,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { showSuccess, showError } from '@/lib/toast'
import type { User, BodyMeasurement } from '@/lib/types'

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

type MeasForm = {
  measured_at: string
  weight_kg: string
  body_fat_pct: string
  muscle_mass_kg: string
  waist_cm: string
  hip_cm: string
  arm_cm: string
  visceral_fat: string
  notes: string
}

const EMPTY: MeasForm = {
  measured_at: new Date().toISOString().slice(0, 10),
  weight_kg: '', body_fat_pct: '', muscle_mass_kg: '',
  waist_cm: '', hip_cm: '', arm_cm: '', visceral_fat: '', notes: '',
}

// ── RegisterModal ─────────────────────────────────────────────────────────────

function RegisterModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [form, setForm] = useState<MeasForm>(EMPTY)

  const set = (k: keyof MeasForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { measured_at: form.measured_at }
      if (form.weight_kg)      body.weight_kg      = form.weight_kg
      if (form.body_fat_pct)   body.body_fat_pct   = form.body_fat_pct
      if (form.muscle_mass_kg) body.muscle_mass_kg = form.muscle_mass_kg
      if (form.waist_cm)       body.waist_cm       = form.waist_cm
      if (form.hip_cm)         body.hip_cm         = form.hip_cm
      if (form.arm_cm)         body.arm_cm         = form.arm_cm
      if (form.visceral_fat)   body.visceral_fat   = form.visceral_fat
      if (form.notes)          body.notes          = form.notes
      return api.post('/api/gyms/body-measurements/', body)
    },
    onSuccess: () => {
      showSuccess('Medida registrada')
      setForm(EMPTY)
      onSuccess()
      onClose()
    },
    onError: (err) => showError(err, 'No se pudo guardar la medida'),
  })

  const fields: { key: keyof MeasForm; label: string; unit: string; placeholder: string }[] = [
    { key: 'weight_kg',      label: 'Peso',             unit: 'kg',  placeholder: 'ej: 72.5' },
    { key: 'body_fat_pct',   label: 'Grasa corporal',   unit: '%',   placeholder: 'ej: 18.2' },
    { key: 'muscle_mass_kg', label: 'Masa muscular',    unit: 'kg',  placeholder: 'ej: 35.0' },
    { key: 'waist_cm',       label: 'Cintura',          unit: 'cm',  placeholder: 'ej: 80' },
    { key: 'hip_cm',         label: 'Cadera',           unit: 'cm',  placeholder: 'ej: 95' },
    { key: 'arm_cm',         label: 'Brazo',            unit: 'cm',  placeholder: 'ej: 32' },
    { key: 'visceral_fat',   label: 'Grasa visceral',   unit: 'niv', placeholder: 'ej: 8' },
  ]

  const hasAnyValue = fields.some(f => form[f.key])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            Registrar mis medidas
          </DialogTitle>
          <p className="text-sm text-slate-500">Completa solo los campos que tengas disponibles</p>
        </DialogHeader>

        <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto pr-1">
          {/* Fecha */}
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Fecha de medición
            </Label>
            <input
              type="date"
              value={form.measured_at}
              max={new Date().toISOString().slice(0, 10)}
              onChange={set('measured_at')}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Campos en grid */}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key}>
                <Label className="text-xs text-slate-500 mb-1 block">
                  {f.label} <span className="text-slate-300">({f.unit})</span>
                </Label>
                <input
                  type="number"
                  step="0.1"
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">
              Notas <span className="text-slate-300">(opcional)</span>
            </Label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Ej: Me medí en ayunas, después del baño..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            💡 Para mayor precisión: mídete en ayunas, en las mañanas, siempre a la misma hora.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!hasAnyValue || mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {mutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando...</>
              : <><Scale className="w-4 h-4 mr-1.5" /> Guardar medidas</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MisMedidasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const user = getStoredUser<User>()
  const queryClient = useQueryClient()
  const [activeChart, setActiveChart] = useState<'weight' | 'fat' | 'waist'>('weight')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [goalWeight, setGoalWeight]       = useState('')
  const [goalFat, setGoalFat]             = useState('')
  const [goalDate, setGoalDate]           = useState('')
  const [goalNotes, setGoalNotes]         = useState('')
  const [goalSaved, setGoalSaved]         = useState(false)

  const historyQuery = useQuery({
    queryKey: ['my-measurements', gymId],
    queryFn: () => api.get<BodyMeasurement[]>('/api/gyms/body-measurements/my_history/'),
  })

  const goalQuery = useQuery({
    queryKey: ['my-goal', gymId],
    queryFn: () => api.get<any>('/api/gyms/athlete-goals/mine/'),
    onSuccess: (data: any) => {
      if (data) {
        setGoalWeight(data.target_weight_kg ?? '')
        setGoalFat(data.target_body_fat_pct ?? '')
        setGoalDate(data.target_date ?? '')
        setGoalNotes(data.notes ?? '')
      }
    },
  } as any)

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

  const measurements = historyQuery.data || []
  const latest = measurements[measurements.length - 1] ?? null
  const prev   = measurements[measurements.length - 2] ?? null

  const chartData = measurements.map(m => ({
    date:   fmtDate(m.measured_at),
    weight: m.weight_kg      ? parseFloat(m.weight_kg as unknown as string)      : null,
    fat:    m.body_fat_pct   ? parseFloat(m.body_fat_pct as unknown as string)   : null,
    waist:  m.waist_cm       ? parseFloat(m.waist_cm as unknown as string)       : null,
  }))

  const CHART_LINES = {
    weight: { key: 'weight', label: 'Peso (kg)',          color: '#2c6956', unit: 'kg' },
    fat:    { key: 'fat',    label: 'Grasa corporal (%)', color: '#f59e0b', unit: '%'  },
    waist:  { key: 'waist',  label: 'Cintura (cm)',       color: '#8b5cf6', unit: 'cm' },
  }
  const cl = CHART_LINES[activeChart]

  const summaryCards = latest ? [
    { label: 'Peso',    value: latest.weight_kg    ? `${parseFloat(latest.weight_kg    as unknown as string)}` : '—', unit: 'kg', icon: Scale,     prevVal: prev?.weight_kg    ? parseFloat(prev.weight_kg    as unknown as string) : null, currVal: latest.weight_kg    ? parseFloat(latest.weight_kg    as unknown as string) : null },
    { label: 'IMC',     value: latest.bmi          ? String(latest.bmi)                                              : '—', unit: '',   icon: Activity,  prevVal: prev?.bmi          ?? null,                                                      currVal: latest.bmi          ?? null },
    { label: 'Grasa',   value: latest.body_fat_pct ? `${parseFloat(latest.body_fat_pct as unknown as string)}` : '—', unit: '%',  icon: TrendingUp, prevVal: prev?.body_fat_pct ? parseFloat(prev.body_fat_pct as unknown as string) : null, currVal: latest.body_fat_pct ? parseFloat(latest.body_fat_pct as unknown as string) : null },
    { label: 'Cintura', value: latest.waist_cm     ? `${parseFloat(latest.waist_cm     as unknown as string)}` : '—', unit: 'cm', icon: Ruler,      prevVal: prev?.waist_cm     ? parseFloat(prev.waist_cm     as unknown as string) : null, currVal: latest.waist_cm     ? parseFloat(latest.waist_cm     as unknown as string) : null },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Medidas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registra tu peso y medidas para ver tu evolución
          </p>
        </div>
        <Button
          onClick={() => setRegisterOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Registrar medidas
        </Button>
      </div>

      {historyQuery.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : measurements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Ruler className="w-7 h-7 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Aún no tienes medidas registradas</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Puedes registrar tu peso hoy mismo. Tu nutricionista también puede tomar medidas más completas en consulta.
            </p>
          </div>
          <Button onClick={() => setRegisterOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1.5" /> Registrar mi primer medida
          </Button>
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
                      className={`px-3 h-7 text-[10px] font-medium transition-colors ${activeChart === k ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
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
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }}
                      formatter={(v: any) => [`${v}${cl.unit}`, cl.label]}
                    />
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
                    {!m.nutritionist && <Badge className="text-[9px] bg-slate-100 text-slate-500 border-0 px-1.5 py-0">Auto-registrado</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {m.weight_kg      && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Peso</span> {parseFloat(m.weight_kg as unknown as string)} kg</span>}
                    {m.bmi            && <span className="text-[11px] text-slate-600"><span className="text-slate-400">IMC</span> {m.bmi}</span>}
                    {m.body_fat_pct   && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Grasa</span> {parseFloat(m.body_fat_pct as unknown as string)}%</span>}
                    {m.muscle_mass_kg && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Músculo</span> {parseFloat(m.muscle_mass_kg as unknown as string)} kg</span>}
                    {m.waist_cm       && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Cintura</span> {parseFloat(m.waist_cm as unknown as string)} cm</span>}
                    {m.hip_cm         && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Cadera</span> {parseFloat(m.hip_cm as unknown as string)} cm</span>}
                    {m.arm_cm         && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Brazo</span> {parseFloat(m.arm_cm as unknown as string)} cm</span>}
                    {m.visceral_fat != null && <span className="text-[11px] text-slate-600"><span className="text-slate-400">Visceral</span> {m.visceral_fat}</span>}
                  </div>
                  {m.notes && <p className="text-[10px] text-slate-400 mt-2 italic">"{m.notes}"</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Meta del atleta */}
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
              type="number"
              step="0.1"
              min="30"
              max="250"
              placeholder="ej. 75"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              % Grasa objetivo
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="60"
              placeholder="ej. 18"
              value={goalFat}
              onChange={e => setGoalFat(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Fecha límite
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={goalDate}
                onChange={e => setGoalDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Motivación, contexto de tu meta..."
            value={goalNotes}
            onChange={e => setGoalNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs transition-all duration-300 text-emerald-500 ${goalSaved ? 'opacity-100' : 'opacity-0'}`}>
            Meta guardada
          </span>
          <button
            onClick={() => saveGoalMutation.mutate()}
            disabled={saveGoalMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {saveGoalMutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
              : <><Save className="w-3.5 h-3.5" /> Guardar meta</>
            }
          </button>
        </div>
      </div>

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-measurements', gymId] })}
      />
    </div>
  )
}
