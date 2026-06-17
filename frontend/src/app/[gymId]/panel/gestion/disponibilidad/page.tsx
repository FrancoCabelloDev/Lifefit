'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock, Plus, Trash2, Loader2, Users, ChevronDown,
  CalendarClock, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Nutritionist {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface AvailabilityBlock {
  id: string
  nutritionist: string
  day_of_week: number
  day_label: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_active: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
]

const SLOT_DURATIONS = [15, 20, 30, 45, 60]

// ── AddBlockForm ──────────────────────────────────────────────────────────────

function AddBlockForm({
  nutritionistId,
  gymId,
  onSuccess,
  onCancel,
}: {
  nutritionistId: string
  gymId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [day, setDay]           = useState(0)
  const [start, setStart]       = useState('09:00')
  const [end, setEnd]           = useState('12:00')
  const [duration, setDuration] = useState(30)

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/gyms/availability/', {
        nutritionist_id: nutritionistId,
        day_of_week: day,
        start_time: start,
        end_time: end,
        slot_duration_minutes: duration,
      }),
    onSuccess: () => { showSuccess('Bloque agregado'); onSuccess() },
    onError: (err) => showError(err, 'No se pudo agregar el bloque'),
  })

  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Nuevo bloque horario</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Día</label>
          <select
            value={day}
            onChange={e => setDay(Number(e.target.value))}
            className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Desde</label>
          <input
            type="time"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Hasta</label>
          <input
            type="time"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Duración slot</label>
          <select
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {SLOT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
        >
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          Agregar
        </Button>
      </div>
    </div>
  )
}

// ── WeekGrid ──────────────────────────────────────────────────────────────────

function WeekGrid({
  blocks,
  nutritionistId,
  gymId,
  onDeleted,
}: {
  blocks: AvailabilityBlock[]
  nutritionistId: string
  gymId: string
  onDeleted: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/gyms/availability/${id}/`),
    onSuccess: () => {
      showSuccess('Bloque eliminado')
      queryClient.invalidateQueries({ queryKey: ['nutri-availability', nutritionistId] })
    },
    onError: (err) => showError(err, 'No se pudo eliminar'),
  })

  const blocksByDay = DAYS.map(d => ({
    ...d,
    blocks: blocks.filter(b => b.day_of_week === d.value),
  }))

  const totalSlots = blocks.reduce((acc, b) => {
    const [sh, sm] = b.start_time.split(':').map(Number)
    const [eh, em] = b.end_time.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    return acc + Math.floor(mins / b.slot_duration_minutes)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5" />
          {blocks.length === 0
            ? 'Sin horarios configurados — el atleta no podrá agendar citas'
            : `${blocks.length} bloque${blocks.length > 1 ? 's' : ''} · ${totalSlots} slots/semana`}
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(v => !v)}
          className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-8 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Agregar bloque
        </Button>
      </div>

      {showForm && (
        <AddBlockForm
          nutritionistId={nutritionistId}
          gymId={gymId}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['nutri-availability', nutritionistId] })
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {blocksByDay.map(day => (
          <div key={day.value} className="min-w-0">
            <p className={cn(
              'text-[11px] font-bold text-center pb-1.5 mb-1.5 border-b',
              day.blocks.length > 0 ? 'text-emerald-700 border-emerald-100' : 'text-slate-400 border-slate-100',
            )}>
              {day.label.slice(0, 3)}
            </p>
            <div className="space-y-1.5">
              {day.blocks.length === 0 ? (
                <div className="h-12 rounded-xl bg-slate-50 border border-dashed border-slate-150 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300">—</span>
                </div>
              ) : (
                day.blocks.map(b => (
                  <div
                    key={b.id}
                    className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 group relative"
                  >
                    <p className="text-[10px] font-bold text-emerald-800 leading-none">
                      {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                    </p>
                    <p className="text-[9px] text-emerald-500 mt-0.5">{b.slot_duration_minutes} min</p>
                    <button
                      onClick={() => deleteMutation.mutate(b.id)}
                      disabled={deleteMutation.isPending}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-500 flex items-center justify-center"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DisponibilidadAdminPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [selectedNutriId, setSelectedNutriId] = useState<string | null>(null)

  const { data: nutritionists, isLoading: loadingNutris } = useQuery({
    queryKey: ['nutritionists-list', gymId],
    queryFn: async () => {
      const res = await api.get<any>('/api/accounts/users/', {
        params: { role: 'nutritionist', page_size: '50' },
      })
      return (res?.results ?? res ?? []) as Nutritionist[]
    },
  })

  const selectedNutri = nutritionists?.find(n => n.id === selectedNutriId) ?? null

  const { data: blocks, isLoading: loadingBlocks } = useQuery({
    queryKey: ['nutri-availability', selectedNutriId],
    queryFn: async () => {
      const res = await api.get<any>('/api/gyms/availability/', {
        params: { nutritionist_id: selectedNutriId! },
      })
      return (res?.results ?? res ?? []) as AvailabilityBlock[]
    },
    enabled: !!selectedNutriId,
  })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Disponibilidad de Nutricionistas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Define los horarios laborales de cada nutricionista</p>
      </div>

      {/* Nutritionist selector */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Selecciona un nutricionista
        </p>

        {loadingNutris ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </div>
        ) : !nutritionists?.length ? (
          <div className="text-sm text-slate-400 italic">No hay nutricionistas registrados en este gimnasio.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nutritionists.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedNutriId(n.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all',
                  selectedNutriId === n.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold',
                  selectedNutriId === n.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700',
                )}>
                  {n.first_name[0]}{n.last_name[0]}
                </div>
                {n.first_name} {n.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Availability editor */}
      {selectedNutri && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              {selectedNutri.first_name[0]}{selectedNutri.last_name[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{selectedNutri.first_name} {selectedNutri.last_name}</p>
              <p className="text-xs text-slate-400">{selectedNutri.email}</p>
            </div>
            <Badge className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-100 text-xs">
              Nutricionista
            </Badge>
          </div>

          {loadingBlocks ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando horarios...
            </div>
          ) : (
            <WeekGrid
              blocks={blocks ?? []}
              nutritionistId={selectedNutriId!}
              gymId={gymId}
              onDeleted={() => {}}
            />
          )}
        </div>
      )}

      {!selectedNutriId && nutritionists && nutritionists.length > 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CalendarClock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Selecciona un nutricionista para ver y editar su horario</p>
        </div>
      )}
    </div>
  )
}
