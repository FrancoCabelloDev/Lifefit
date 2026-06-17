'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Clock, CheckCircle2, X, AlertCircle,
  User, ChevronDown, ChevronUp, Plus, Loader2, CalendarClock,
  RefreshCw, ThumbsUp,
} from 'lucide-react'
import { format, addDays, parseISO, isAfter, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import type { NutritionistAppointment } from '@/lib/types'
import { cn } from '@/lib/utils'

const TODAY = startOfDay(new Date())
const MAX_DATE = addDays(TODAY, 21)

const STATUS_STYLES: Record<string, string> = {
  scheduled:             'bg-blue-50 text-blue-700 border-blue-100',
  confirmed:             'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed:             'bg-slate-100 text-slate-600 border-slate-200',
  cancelled:             'bg-rose-50 text-rose-600 border-rose-100',
  no_show:               'bg-slate-100 text-slate-500 border-slate-200',
  reschedule_requested:  'bg-amber-50 text-amber-700 border-amber-100',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled:             <Clock className="w-3 h-3" />,
  confirmed:             <CheckCircle2 className="w-3 h-3" />,
  completed:             <CheckCircle2 className="w-3 h-3" />,
  cancelled:             <X className="w-3 h-3" />,
  no_show:               <AlertCircle className="w-3 h-3" />,
  reschedule_requested:  <RefreshCw className="w-3 h-3" />,
}

const ACTIVE_STATUSES = new Set(['scheduled', 'confirmed', 'reschedule_requested'])

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function slotLabel(isoSlot: string) {
  return format(parseISO(isoSlot), 'HH:mm')
}

// ── RescheduleModal ───────────────────────────────────────────────────────────

function RescheduleModal({
  appt,
  open,
  onClose,
  onSuccess,
}: {
  appt: NutritionistAppointment
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await api.post(`/api/gyms/appointments/${appt.id}/request-reschedule/`, { note })
      showSuccess('Solicitud de reprogramación enviada')
      onSuccess()
      onClose()
    } catch (err) {
      showError(err, 'No se pudo enviar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            Solicitar reprogramación
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Cita del {format(new Date(appt.scheduled_at), "d 'de' MMMM, HH:mm", { locale: es })}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Motivo <span className="font-normal normal-case">(opcional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Tengo un compromiso inesperado ese día..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <p className="text-xs text-slate-400">
            Tu nutricionista recibirá la solicitud y te propondrá un nuevo horario.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Enviando...</>
              : <><RefreshCw className="w-4 h-4 mr-1.5" /> Solicitar reprogramación</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── AppointmentCard ───────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  onConfirm,
  onCancel,
  onReschedule,
}: {
  appt: NutritionistAppointment
  onConfirm?: () => void
  onCancel?: () => void
  onReschedule?: () => void
}) {
  const end = new Date(new Date(appt.scheduled_at).getTime() + appt.duration_minutes * 60000)
  const isFuture = new Date(appt.scheduled_at) > new Date()
  const isActive = ACTIVE_STATUSES.has(appt.status)

  const showConfirm    = isFuture && appt.status === 'scheduled'
  const showReschedule = isFuture && (appt.status === 'scheduled' || appt.status === 'confirmed')
  const showCancel     = isFuture && isActive

  return (
    <div className={cn(
      'bg-white rounded-2xl border transition-all p-4',
      appt.status === 'reschedule_requested'
        ? 'border-amber-200 bg-amber-50/30'
        : 'border-slate-100 hover:border-slate-200',
    )}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 text-center">
          <p className="text-lg font-bold text-slate-800 leading-none">
            {new Date(appt.scheduled_at).getDate()}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
            {new Date(appt.scheduled_at).toLocaleDateString('es', { month: 'short' })}
          </p>
        </div>

        <div className="w-px self-stretch bg-slate-100" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {appt.appointment_type === 'first' ? 'Primera Consulta' : 'Consulta de Seguimiento'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="w-3 h-3 text-slate-400" />
                <p className="text-xs text-slate-500">{appt.nutritionist_name ?? 'Nutricionista'}</p>
              </div>
            </div>
            <Badge className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ${STATUS_STYLES[appt.status] ?? ''}`}>
              {STATUS_ICONS[appt.status]}
              {appt.status_display}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(appt.scheduled_at)} – {formatTime(end.toISOString())}
            </span>
            <span className="text-slate-300">·</span>
            <span>{appt.duration_minutes} min</span>
          </div>

          {appt.notes && (
            <p className="text-xs text-slate-400 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 line-clamp-2">
              {appt.notes}
            </p>
          )}

          {appt.status === 'reschedule_requested' && appt.reschedule_note && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              <span className="font-semibold">Tu nota:</span> {appt.reschedule_note}
            </p>
          )}

          {appt.status === 'reschedule_requested' && !appt.reschedule_note && (
            <p className="text-xs text-amber-600 mt-2 italic">
              Esperando respuesta del nutricionista...
            </p>
          )}

          {/* Action buttons */}
          {(showConfirm || showReschedule || showCancel) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
              {showConfirm && onConfirm && (
                <button
                  onClick={onConfirm}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  <ThumbsUp className="w-3 h-3" /> Confirmar asistencia
                </button>
              )}
              {showReschedule && onReschedule && (
                <button
                  onClick={onReschedule}
                  className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 font-semibold transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Reprogramar
                </button>
              )}
              {showCancel && onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 font-semibold transition-colors ml-auto"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── BookingModal ──────────────────────────────────────────────────────────────

function BookingModal({
  open, gymId, nutritionistId, onClose, onSuccess,
}: {
  open: boolean
  gymId: string
  nutritionistId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [apptType, setApptType]         = useState<'first' | 'followup'>('followup')
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)

  useEffect(() => { setSelectedSlot(null) }, [selectedDate])

  const { data: availableDays } = useQuery({
    queryKey: ['availability-days', nutritionistId],
    queryFn: async () => {
      const res = await api.get<string[]>('/api/gyms/availability/days/', {
        params: { nutritionist_id: nutritionistId },
      })
      return new Set(res ?? [])
    },
    staleTime: 5 * 60 * 1000,
  })

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability-slots', nutritionistId, dateStr],
    queryFn: async () => {
      const res = await api.get<string[]>('/api/gyms/availability/slots/', {
        params: { nutritionist_id: nutritionistId, date: dateStr! },
      })
      return res ?? []
    },
    enabled: !!dateStr,
  })

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedDate) return
    setSaving(true)
    try {
      await api.post('/api/gyms/appointments/', {
        scheduled_at:     selectedSlot,
        duration_minutes: 30,
        appointment_type: apptType,
        notes,
      })
      showSuccess('¡Cita agendada!')
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg =
        err?.data?.scheduled_at?.[0] ||
        err?.data?.non_field_errors?.[0] ||
        err?.data?.detail ||
        err?.message ||
        'No se pudo agendar la cita'
      showError(err, msg)
    } finally {
      setSaving(false)
    }
  }

  const isDisabledDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return (
      !isAfter(startOfDay(day), TODAY) ||
      isAfter(startOfDay(day), MAX_DATE) ||
      (availableDays ? !availableDays.has(dayStr) : false)
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-600" />
            Agendar nueva cita
          </DialogTitle>
          <p className="text-sm text-slate-500">Elige un día y horario disponible</p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Selecciona un día
            </Label>
            <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50/50">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDisabledDay}
                locale={es}
                defaultMonth={addDays(TODAY, 1)}
                className="rounded-xl"
              />
            </div>
            {availableDays !== undefined && (
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Los días en gris no tienen disponibilidad
              </p>
            )}
          </div>

          {selectedDate && (
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                Horarios — {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </Label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando horarios...
                </div>
              ) : !slots?.length ? (
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 py-5 text-center">
                  <p className="text-sm text-slate-400">Sin horarios disponibles este día</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all',
                        selectedSlot === slot
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
                      )}
                    >
                      {slotLabel(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                Tipo de consulta
              </Label>
              <div className="flex gap-2">
                {([
                  { value: 'followup', label: 'Seguimiento' },
                  { value: 'first',    label: 'Primera Consulta' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setApptType(opt.value)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                      apptType === opt.value
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSlot && (
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                Notas <span className="font-normal normal-case">(opcional)</span>
              </Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Quiero consultar sobre mi plan de hidratación..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!selectedSlot || saving}
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Agendando...</>
              : <><CalendarClock className="w-4 h-4 mr-1.5" /> Confirmar cita</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MisCitasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId }   = use(params)
  const queryClient = useQueryClient()
  const [bookingOpen, setBookingOpen]   = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<NutritionistAppointment | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments', gymId],
    queryFn: async () => {
      const res = await api.get<any>('/api/gyms/appointments/')
      return (res?.results || res || []) as NutritionistAppointment[]
    },
    refetchInterval: 60000,
  })

  const { data: assignments } = useQuery({
    queryKey: ['my-nutritionist-assignment', gymId],
    queryFn: async () => {
      const res = await api.get<any>('/api/gyms/nutritionist-assignments/').catch(() => null)
      return (res?.results ?? res ?? []) as import('@/lib/types').NutritionistAssignment[]
    },
  })

  const nutritionistId: string | null =
    assignments?.find(a => a.nutritionist)?.nutritionist ?? null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['my-appointments', gymId] })

  const handleConfirm = async (apptId: string) => {
    try {
      await api.post(`/api/gyms/appointments/${apptId}/confirm/`, {})
      showSuccess('Asistencia confirmada')
      invalidate()
    } catch (err) {
      showError(err, 'No se pudo confirmar')
    }
  }

  const handleCancel = async (apptId: string) => {
    try {
      await api.post(`/api/gyms/appointments/${apptId}/cancel/`, {})
      showSuccess('Cita cancelada')
      invalidate()
    } catch (err) {
      showError(err, 'No se pudo cancelar la cita')
    }
  }

  const now = new Date()
  const upcoming = (data || [])
    .filter(a => new Date(a.scheduled_at) >= now && ACTIVE_STATUSES.has(a.status))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const past = (data || [])
    .filter(a => new Date(a.scheduled_at) < now || !ACTIVE_STATUSES.has(a.status))
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Citas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Consultas con tu nutricionista</p>
        </div>
        {nutritionistId && (
          <Button
            onClick={() => setBookingOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nueva cita
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Próximas</h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Sin citas próximas</p>
            {nutritionistId ? (
              <button
                onClick={() => setBookingOpen(true)}
                className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                + Agendar una cita ahora
              </button>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Tu nutricionista programará la próxima consulta</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                onConfirm={() => handleConfirm(a.id)}
                onCancel={() => handleCancel(a.id)}
                onReschedule={() => setRescheduleTarget(a)}
              />
            ))}
          </div>
        )}
      </section>

      {!isLoading && past.length > 0 && (
        <HistorialSection appointments={past} />
      )}

      {nutritionistId !== null && (
        <BookingModal
          open={bookingOpen}
          gymId={gymId}
          nutritionistId={nutritionistId}
          onClose={() => setBookingOpen(false)}
          onSuccess={invalidate}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          appt={rescheduleTarget}
          open={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  )
}

function HistorialSection({ appointments }: { appointments: NutritionistAppointment[] }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
      >
        Historial ({appointments.length})
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="space-y-2">
          {appointments.map(a => <AppointmentCard key={a.id} appt={a} />)}
        </div>
      )}
    </section>
  )
}
