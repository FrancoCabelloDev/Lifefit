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
import { useRoleGuard } from '@/hooks/useRoleGuard'

const TODAY = startOfDay(new Date())
const MAX_DATE = addDays(TODAY, 60)

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

// ── ActionModal (shared base) ─────────────────────────────────────────────────

function ActionModal({
  open, onClose, icon, iconBg, title, subtitle, children, onConfirm, confirmLabel, confirmClass, loading,
}: {
  open: boolean
  onClose: () => void
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  children?: React.ReactNode
  onConfirm: () => void
  confirmLabel: React.ReactNode
  confirmClass: string
  loading: boolean
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (open) requestAnimationFrame(() => setMounted(true))
    else setMounted(false)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[3px] transition-opacity duration-200"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 transition-all duration-200 overflow-hidden"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        {/* Header strip */}
        <div className={cn('px-5 pt-5 pb-4 flex items-start gap-3', iconBg)}>
          <div className="shrink-0 mt-0.5">{icon}</div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg hover:bg-black/5 flex items-center justify-center text-slate-400 transition-all active:scale-90 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {children && <div className="px-5 py-4">{children}</div>}

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50',
              confirmClass,
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CancelModal ───────────────────────────────────────────────────────────────

function CancelModal({
  appt, open, onClose, onSuccess,
}: {
  appt: NutritionistAppointment
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await api.post(`/api/gyms/appointments/${appt.id}/cancel/`, { reason })
      showSuccess('Cita cancelada')
      onSuccess()
      onClose()
    } catch (err) {
      showError(err, 'No se pudo cancelar la cita')
    } finally {
      setSaving(false)
    }
  }

  const apptLabel = format(new Date(appt.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      icon={<X className="w-5 h-5 text-rose-500" />}
      iconBg="bg-rose-50/60"
      title="Cancelar cita"
      subtitle={apptLabel}
      onConfirm={handleConfirm}
      confirmLabel="Sí, cancelar cita"
      confirmClass="bg-rose-500 hover:bg-rose-600"
      loading={saving}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Tu nutricionista será notificada. Si quieres reagendar, usa "Solicitar reprogramación" en su lugar.
        </p>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Motivo <span className="font-normal normal-case">(opcional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="Ej: Tengo un imprevisto ese día..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 text-slate-700 placeholder:text-slate-300"
          />
        </div>
      </div>
    </ActionModal>
  )
}

// ── RescheduleModal ───────────────────────────────────────────────────────────

function RescheduleModal({
  appt, open, onClose, onSuccess,
}: {
  appt: NutritionistAppointment
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await api.post(`/api/gyms/appointments/${appt.id}/request-reschedule/`, { note })
      showSuccess('Solicitud enviada — tu nutricionista te propondrá un nuevo horario')
      onSuccess()
      onClose()
    } catch (err) {
      showError(err, 'No se pudo enviar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  const apptLabel = format(new Date(appt.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })

  return (
    <ActionModal
      open={open}
      onClose={onClose}
      icon={<RefreshCw className="w-5 h-5 text-amber-500" />}
      iconBg="bg-amber-50/60"
      title="Solicitar reprogramación"
      subtitle={apptLabel}
      onConfirm={handleConfirm}
      confirmLabel="Enviar solicitud"
      confirmClass="bg-amber-500 hover:bg-amber-600"
      loading={saving}
    >
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Motivo <span className="font-normal normal-case">(opcional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Ej: Tengo un compromiso inesperado ese día..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-slate-700 placeholder:text-slate-300"
          />
        </div>
        <p className="text-xs text-slate-400">
          Tu nutricionista recibirá la solicitud y te propondrá un nuevo horario.
        </p>
      </div>
    </ActionModal>
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
  const showCancel     = isFuture && isActive && appt.status !== 'reschedule_requested'

  const isRescheduleReq = appt.status === 'reschedule_requested'

  return (
    <div className={cn(
      'bg-white rounded-2xl border transition-all duration-150 p-4',
      isRescheduleReq
        ? 'border-amber-200 bg-amber-50/20'
        : 'border-slate-100 hover:border-slate-200 hover:shadow-sm',
    )}>
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 w-11 text-center pt-0.5">
          <p className="text-xl font-bold text-slate-800 leading-none">
            {new Date(appt.scheduled_at).getDate()}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">
            {new Date(appt.scheduled_at).toLocaleDateString('es', { month: 'short' })}
          </p>
        </div>

        <div className="w-px self-stretch bg-slate-100 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {appt.appointment_type === 'first' ? 'Primera Consulta' : 'Seguimiento'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 truncate">{appt.nutritionist_name ?? 'Nutricionista'}</p>
              </div>
            </div>
            <Badge className={cn('text-[10px] font-bold flex items-center gap-1 shrink-0 border', STATUS_STYLES[appt.status] ?? '')}>
              {STATUS_ICONS[appt.status]}
              {appt.status_display}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{formatTime(appt.scheduled_at)} – {formatTime(end.toISOString())}</span>
            <span className="text-slate-300">·</span>
            <span>{appt.duration_minutes} min</span>
          </div>

          {appt.notes && (
            <p className="text-xs text-slate-400 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 line-clamp-2 italic">
              "{appt.notes}"
            </p>
          )}

          {isRescheduleReq && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 flex items-start gap-2">
              <RefreshCw className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                {appt.reschedule_note
                  ? <><span className="font-semibold">Tu nota:</span> {appt.reschedule_note}</>
                  : 'Esperando respuesta de tu nutricionista...'
                }
              </p>
            </div>
          )}

          {/* Actions */}
          {(showConfirm || showReschedule || showCancel) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
              {showConfirm && onConfirm && (
                <button
                  onClick={onConfirm}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-700 font-semibold transition-all active:scale-[0.97]"
                >
                  <ThumbsUp className="w-3 h-3" /> Confirmar asistencia
                </button>
              )}
              {showReschedule && onReschedule && (
                <button
                  onClick={onReschedule}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs text-amber-700 font-semibold transition-all active:scale-[0.97]"
                >
                  <RefreshCw className="w-3 h-3" /> Reprogramar
                </button>
              )}
              {showCancel && onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 text-xs text-rose-400 hover:text-rose-600 font-semibold transition-all active:scale-[0.97] ml-auto"
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
    const d = startOfDay(day)
    const dayStr = format(day, 'yyyy-MM-dd')
    return (
      d < TODAY ||
      d > MAX_DATE ||
      (availableDays ? !availableDays.has(dayStr) : false)
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-emerald-600" />
            Agendar nueva cita
          </DialogTitle>
          <p className="text-sm text-slate-500">Elige un día y horario disponible</p>
        </DialogHeader>

        <div className="space-y-4 py-1 overflow-y-auto flex-1 pr-1">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Selecciona un día
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDisabledDay}
              locale={es}
              defaultMonth={TODAY}
              showOutsideDays
              className="rounded-xl border border-slate-100 bg-slate-50/50"
            />
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
  useRoleGuard(gymId, ['athlete'])
  const queryClient = useQueryClient()
  const [bookingOpen, setBookingOpen]           = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<NutritionistAppointment | null>(null)
  const [cancelTarget, setCancelTarget]         = useState<NutritionistAppointment | null>(null)

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
      const res = await api.get<any>('/api/gyms/nutritionist-assignments/')
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
                onCancel={() => setCancelTarget(a)}
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

      {cancelTarget && (
        <CancelModal
          appt={cancelTarget}
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
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
