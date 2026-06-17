'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Loader2, CalendarClock, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface AvailabilityBlock {
  id: string
  day_of_week: number
  day_label: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_active: boolean
}

const DAYS = [
  { value: 0, short: 'Lun', full: 'Lunes' },
  { value: 1, short: 'Mar', full: 'Martes' },
  { value: 2, short: 'Mié', full: 'Miércoles' },
  { value: 3, short: 'Jue', full: 'Jueves' },
  { value: 4, short: 'Vie', full: 'Viernes' },
  { value: 5, short: 'Sáb', full: 'Sábado' },
  { value: 6, short: 'Dom', full: 'Domingo' },
]

export default function MiHorarioPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const user = getStoredUser<User>()

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['my-availability', gymId],
    queryFn: async () => {
      const res = await api.get<any>('/api/gyms/availability/')
      return (res?.results ?? res ?? []) as AvailabilityBlock[]
    },
    enabled: !!user,
  })

  if (!user || user.role !== 'nutritionist') return null

  const blocksByDay = DAYS.map(d => ({
    ...d,
    blocks: (blocks ?? []).filter(b => b.day_of_week === d.value && b.is_active),
  }))

  const totalSlots = (blocks ?? []).reduce((acc, b) => {
    const [sh, sm] = b.start_time.split(':').map(Number)
    const [eh, em] = b.end_time.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    return acc + Math.floor(mins / b.slot_duration_minutes)
  }, 0)

  const activeDays = blocksByDay.filter(d => d.blocks.length > 0)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Horario</h1>
        <p className="text-sm text-slate-500 mt-0.5">Tu disponibilidad semanal configurada por el administrador</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando horario...
        </div>
      ) : !blocks?.length ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CalendarClock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Aún no tienes horarios configurados</p>
          <p className="text-xs text-slate-400 mt-1">Contacta al administrador del gimnasio para que configure tu disponibilidad</p>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            {activeDays.map(d => (
              <div key={d.value} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-700">
                <Clock className="w-3 h-3" />
                {d.full}: {d.blocks.map(b => `${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`).join(', ')}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Días activos', value: activeDays.length },
              { label: 'Bloques', value: blocks.length },
              { label: 'Slots / semana', value: totalSlots },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <p className="text-2xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Vista semanal</p>
            <div className="grid grid-cols-7 gap-2">
              {blocksByDay.map(day => (
                <div key={day.value} className="min-w-0">
                  <p className={cn(
                    'text-[11px] font-bold text-center pb-1.5 mb-1.5 border-b',
                    day.blocks.length > 0 ? 'text-emerald-700 border-emerald-100' : 'text-slate-300 border-slate-100',
                  )}>
                    {day.short}
                  </p>
                  <div className="space-y-1.5">
                    {day.blocks.length === 0 ? (
                      <div className="h-12 rounded-xl bg-slate-50 border border-dashed border-slate-100 flex items-center justify-center">
                        <span className="text-[10px] text-slate-200">—</span>
                      </div>
                    ) : (
                      day.blocks.map(b => (
                        <div key={b.id} className="bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                          <p className="text-[10px] font-bold text-emerald-800 leading-none">
                            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                          </p>
                          <p className="text-[9px] text-emerald-500 mt-0.5">{b.slot_duration_minutes} min/slot</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Read-only notice */}
          <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-500">
              Tu horario es gestionado por el administrador del gimnasio.
              Si necesitas cambiar tu disponibilidad, contacta directamente con él.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
