'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Plus, Trash2, CalendarDays, Dumbbell,
  Clock, Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { levelColors, levelLabels } from '@/lib/constants'
import type { WorkoutRoutine, PaginatedResponse } from '@/lib/types'

interface WeeklySlot {
  id: string
  routine: string
  routine_detail: WorkoutRoutine
  day_of_week: number
  day_label: string
  suggested_time: string | null
  notes: string
}

const DAYS = [
  { value: 0, label: 'Lunes',     short: 'Lun' },
  { value: 1, label: 'Martes',    short: 'Mar' },
  { value: 2, label: 'Miércoles', short: 'Mié' },
  { value: 3, label: 'Jueves',    short: 'Jue' },
  { value: 4, label: 'Viernes',   short: 'Vie' },
  { value: 5, label: 'Sábado',    short: 'Sáb' },
  { value: 6, label: 'Domingo',   short: 'Dom' },
]

const todayDow = (() => {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
})()

function SlotCard({ slot, onDelete }: { slot: WeeklySlot; onDelete: (id: string) => void }) {
  const r = slot.routine_detail
  const exCount = r?.routine_exercises?.length ?? 0
  const time = slot.suggested_time?.slice(0, 5)

  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150">
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-emerald-500" />

      <div className="flex items-start justify-between gap-1 mt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Dumbbell className="w-3 h-3 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-slate-800 leading-tight truncate">
            {r?.name ?? 'Rutina'}
          </p>
        </div>
        <button
          onClick={() => onDelete(slot.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all active:scale-90 shrink-0 p-0.5 rounded-lg hover:bg-rose-50"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {r?.duration_minutes && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" /> {r.duration_minutes}m
          </span>
        )}
        {exCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
            <Dumbbell className="w-2.5 h-2.5" /> {exCount} ej.
          </span>
        )}
      </div>

      {(time || slot.notes) && (
        <div className="mt-2 space-y-0.5 pt-2 border-t border-slate-100">
          {time && (
            <p className="text-[10px] font-semibold text-emerald-600">{time}</p>
          )}
          {slot.notes && (
            <p className="text-[10px] text-slate-400 italic leading-relaxed line-clamp-2">
              {slot.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function DayColumn({
  day, slots, isToday, onAddClick, onDelete,
}: {
  day: { value: number; label: string; short: string }
  slots: WeeklySlot[]
  isToday: boolean
  onAddClick: (dayValue: number) => void
  onDelete: (id: string) => void
}) {
  const hasSlots = slots.length > 0
  const totalMins = slots.reduce((s, sl) => s + (sl.routine_detail?.duration_minutes ?? 0), 0)

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className={cn(
        'rounded-xl px-2 py-2.5 text-center transition-colors',
        isToday
          ? 'bg-emerald-600 text-white'
          : hasSlots
          ? 'bg-slate-800 text-white'
          : 'bg-slate-100 text-slate-400',
      )}>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{day.short}</p>
        {hasSlots && (
          <p className="text-[9px] mt-0.5 opacity-60">
            {totalMins > 0 ? `${totalMins}m` : `${slots.length} rutina${slots.length > 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {slots.map(slot => (
          <SlotCard key={slot.id} slot={slot} onDelete={onDelete} />
        ))}

        <button
          onClick={() => onAddClick(day.value)}
          className={cn(
            'group flex items-center justify-center rounded-2xl border-2 border-dashed py-5 transition-all duration-150',
            hasSlots
              ? 'border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.98]'
              : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.98]',
          )}
        >
          <span className={cn(
            'flex flex-col items-center gap-1 transition-colors',
            hasSlots ? 'text-slate-300 group-hover:text-emerald-500' : 'text-slate-300 group-hover:text-emerald-500',
          )}>
            <Plus className="w-3.5 h-3.5" />
            {!hasSlots && (
              <span className="text-[9px] font-semibold uppercase tracking-wide">Descanso</span>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function WeeklyPlanTab({ gymId, athleteId }: { gymId: string; athleteId: string }) {
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formDay, setFormDay] = useState('')
  const [formRoutine, setFormRoutine] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPlan = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<{ results: WeeklySlot[] } | WeeklySlot[]>(
        '/api/workouts/weekly-plan/', { params: { athlete: athleteId } }
      )
      setSlots(Array.isArray(data) ? data : data.results || [])
    } catch {
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    api.get<PaginatedResponse<WorkoutRoutine>>('/api/workouts/routines/')
      .then(d => { setRoutines(Array.isArray(d) ? d : d.results || []) })
      .catch(() => {})
  }, [gymId])

  useEffect(() => {
    if (athleteId) fetchPlan()
  }, [athleteId])

  const openDialog = (dayValue?: number) => {
    if (dayValue !== undefined) setFormDay(String(dayValue))
    setDialogOpen(true)
  }

  const handleAddSlot = async () => {
    if (!formDay || !formRoutine) return
    setSaving(true)
    try {
      await api.post('/api/workouts/weekly-plan/', {
        athlete: athleteId,
        routine: formRoutine,
        day_of_week: parseInt(formDay),
        suggested_time: formTime || null,
        notes: formNotes,
      })
      showSuccess('Rutina agregada al plan')
      setDialogOpen(false)
      setFormDay(''); setFormRoutine(''); setFormTime(''); setFormNotes('')
      fetchPlan()
    } catch (err) {
      showError(err, 'Error al agregar rutina')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slotId: string) => {
    try {
      await api.delete(`/api/workouts/weekly-plan/${slotId}/`)
      showSuccess('Rutina eliminada del plan')
      fetchPlan()
    } catch (err) {
      showError(err, 'Error al eliminar')
    }
  }

  const activeDays = new Set(slots.map(s => s.day_of_week)).size
  const totalMins = slots.reduce((s, sl) => s + (sl.routine_detail?.duration_minutes ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Stats + add button */}
      <div className="flex items-center justify-between gap-4">
        {slots.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-base font-black text-slate-900">{activeDays}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">días/sem</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-slate-900">{totalMins}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">min/sem</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-slate-900">{slots.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">sesiones</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sin plan semanal asignado</p>
        )}
        <Button
          onClick={() => openDialog()}
          className="bg-emerald-600 hover:bg-emerald-700 h-9 rounded-xl text-sm active:scale-[0.97] shadow-sm shadow-emerald-600/20 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar rutina
        </Button>
      </div>

      {/* Weekly grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => (
            <DayColumn
              key={day.value}
              day={day}
              slots={slots.filter(s => s.day_of_week === day.value)}
              isToday={day.value === todayDow}
              onAddClick={openDialog}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Agregar rutina al plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Día</Label>
                <Select value={formDay} onValueChange={setFormDay}>
                  <SelectTrigger className="h-9 rounded-xl text-sm">
                    <SelectValue placeholder="Día…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DAYS.map(d => (
                      <SelectItem key={d.value} value={String(d.value)} className="rounded-lg">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Hora <span className="font-normal text-slate-400">(opcional)</span>
                </Label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="h-9 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Rutina</Label>
              <Select value={formRoutine} onValueChange={setFormRoutine}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona la rutina…" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {routines.map(r => (
                    <SelectItem key={r.id} value={r.id} className="rounded-lg">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-slate-400 ml-1.5 text-xs">
                        {r.duration_minutes}m · {r.routine_exercises?.length ?? 0} ej.
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formRoutine && (() => {
              const r = routines.find(r => r.id === formRoutine)
              if (!r) return null
              return (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', levelColors[r.level])}>
                        {levelLabels[r.level]}
                      </span>
                      <span className="text-xs text-slate-400">{r.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nota para el atleta <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Ej: Enfocarse en la técnica, descansar 90 seg entre series…"
                rows={2}
                className="rounded-xl text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddSlot}
              disabled={saving || !formDay || !formRoutine}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-9 text-sm active:scale-[0.97] shadow-sm shadow-emerald-600/20"
            >
              {saving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : <Plus className="w-3.5 h-3.5 mr-1.5" />
              }
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
