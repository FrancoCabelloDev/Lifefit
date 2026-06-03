'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays,
  Clock, CheckCircle2, X, AlertCircle, Search,
  MoreVertical, UserPlus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, NutritionistAppointment, NutritionistAthlete } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-100',
  no_show: 'bg-slate-100 text-slate-500 border-slate-200',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled: <Clock className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
  no_show: <AlertCircle className="w-3 h-3" />,
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  let day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday-based
}

interface NewAppointmentFormProps {
  gymId: string
  onClose: () => void
  onSuccess: () => void
}

function NewAppointmentForm({ gymId, onClose, onSuccess }: NewAppointmentFormProps) {
  const [athleteSearch, setAthleteSearch] = useState('')
  const [selectedAthlete, setSelectedAthlete] = useState<{ id: string; name: string } | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState('30')
  const [type, setType] = useState('followup')
  const [notes, setNotes] = useState('')

  const athletesQuery = useQuery({
    queryKey: ['nutri-athletes-search', athleteSearch],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/nutritionist-assignments/my_athletes/', {
        params: { search: athleteSearch, page: '1', page_size: '8' },
      })
      return (data.results || []) as NutritionistAthlete[]
    },
    enabled: athleteSearch.length > 0 || !selectedAthlete,
  })

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/api/gyms/appointments/', payload),
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAthlete || !date) return
    const scheduled_at = new Date(`${date}T${time}:00`).toISOString()
    mutation.mutate({
      athlete: selectedAthlete.id,
      scheduled_at,
      duration_minutes: parseInt(duration),
      appointment_type: type,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Nueva cita</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Athlete selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Cliente</label>
            {selectedAthlete ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {getInitials(selectedAthlete.name)}
                </div>
                <span className="text-sm font-medium text-slate-800 flex-1">{selectedAthlete.name}</span>
                <button type="button" onClick={() => setSelectedAthlete(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-9 h-9 rounded-xl text-sm border-slate-200"
                  value={athleteSearch}
                  onChange={e => setAthleteSearch(e.target.value)}
                />
                {athletesQuery.data && athletesQuery.data.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                    {athletesQuery.data.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setSelectedAthlete({ id: a.id, name: `${a.first_name} ${a.last_name}` }); setAthleteSearch('') }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {a.first_name[0]}{a.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{a.first_name} {a.last_name}</p>
                          <p className="text-[10px] text-slate-400">{a.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Fecha</label>
              <Input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9 rounded-xl text-sm border-slate-200"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Hora</label>
              <Input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-9 rounded-xl text-sm border-slate-200"
              />
            </div>
          </div>

          {/* Duration + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Duración</label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1.5 horas</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                <option value="first">Primera consulta</option>
                <option value="followup">Seguimiento</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Objetivos, recordatorios..."
              className="w-full rounded-xl text-sm border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedAthlete || !date || mutation.isPending}
              className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-95"
            >
              {mutation.isPending ? 'Guardando...' : 'Crear cita'}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-rose-600 text-center">Error al crear la cita. Intenta de nuevo.</p>
          )}
        </form>
      </div>
    </div>
  )
}

export default function AgendaPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = getStoredUser<User>()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const now = new Date()
  const [viewDate, setViewDate] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', gymId],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/appointments/')
      return (data?.results || data || []) as NutritionistAppointment[]
    },
    refetchInterval: 60000,
  })

  const allAppointments = appointmentsQuery.data || []

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/gyms/appointments/${id}/`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', gymId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/gyms/appointments/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', gymId] }),
  })

  const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month)
  const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month)
  const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const appointmentsByDay: Record<number, NutritionistAppointment[]> = {}
  allAppointments.forEach(a => {
    const d = new Date(a.scheduled_at)
    if (d.getFullYear() === viewDate.year && d.getMonth() === viewDate.month) {
      const day = d.getDate()
      if (!appointmentsByDay[day]) appointmentsByDay[day] = []
      appointmentsByDay[day].push(a)
    }
  })

  const dayAppointments = selectedDay
    ? (appointmentsByDay[selectedDay] || []).filter(a => {
        if (filterStatus !== 'all' && a.status !== filterStatus) return false
        if (searchQuery && !a.athlete_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    : []

  const prevMonth = () => setViewDate(v => {
    const m = v.month === 0 ? 11 : v.month - 1
    const y = v.month === 0 ? v.year - 1 : v.year
    return { year: y, month: m }
  })

  const nextMonth = () => setViewDate(v => {
    const m = v.month === 11 ? 0 : v.month + 1
    const y = v.month === 11 ? v.year + 1 : v.year
    return { year: y, month: m }
  })

  if (!user || user.role !== 'nutritionist') return null

  return (
    <div className="space-y-6">
      {showForm && (
        <NewAppointmentForm
          gymId={gymId}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['appointments', gymId] })
            queryClient.invalidateQueries({ queryKey: ['next-appointment', gymId] })
            queryClient.invalidateQueries({ queryKey: ['upcoming-appointments', gymId] })
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona tus consultas y citas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-800">{MONTHS[viewDate.month]} {viewDate.year}</h2>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-[10px] font-semibold text-slate-400 text-center py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = now.getDate() === day && now.getMonth() === viewDate.month && now.getFullYear() === viewDate.year
                const isSelected = selectedDay === day
                const hasAppts = !!appointmentsByDay[day]
                const apptCount = appointmentsByDay[day]?.length || 0

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`
                      relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-sm font-medium transition-all
                      ${isSelected ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : isToday ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}
                    `}
                  >
                    <span>{day}</span>
                    {hasAppts && (
                      <div className={`flex gap-0.5 mt-0.5 ${isSelected ? 'opacity-80' : ''}`}>
                        {Array.from({ length: Math.min(apptCount, 3) }).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" />Citas programadas</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-600" />Hoy</div>
            </div>
          </div>
        </div>

        {/* Day appointments */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {selectedDay
                ? `${selectedDay} de ${MONTHS[viewDate.month]}`
                : 'Selecciona un día'}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8 h-8 text-xs rounded-xl border-slate-200 w-36"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="h-8 rounded-xl text-xs border border-slate-200 px-2 bg-white focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="scheduled">Programadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>
          </div>

          {!selectedDay ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Selecciona un día del calendario</p>
            </div>
          ) : dayAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Sin citas para este día</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                + Crear nueva cita
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map(a => {
                const d = new Date(a.scheduled_at)
                const endTime = new Date(d.getTime() + a.duration_minutes * 60000)

                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all p-4">
                    <div className="flex items-start gap-3">
                      {/* Time indicator */}
                      <div className="flex-shrink-0 text-right w-14">
                        <p className="text-sm font-bold text-slate-800">{formatTime(a.scheduled_at)}</p>
                        <p className="text-[10px] text-slate-400">{formatTime(endTime.toISOString())}</p>
                      </div>

                      <div className="w-px self-stretch bg-slate-100 mx-1" />

                      {/* Athlete info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {getInitials(a.athlete_name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{a.athlete_name}</p>
                              <p className="text-[10px] text-slate-400">{a.duration_minutes} min · {a.appointment_type === 'first' ? '1ª consulta' : 'Seguimiento'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-[10px] font-bold flex items-center gap-1 ${STATUS_STYLES[a.status]}`}>
                              {STATUS_ICONS[a.status]}
                              {a.status_display}
                            </Badge>
                          </div>
                        </div>

                        {a.notes && (
                          <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 line-clamp-2">{a.notes}</p>
                        )}

                        {a.status === 'scheduled' && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => statusMutation.mutate({ id: a.id, status: 'completed' })}
                              className="flex items-center gap-1 h-7 px-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completar
                            </button>
                            <button
                              onClick={() => statusMutation.mutate({ id: a.id, status: 'cancelled' })}
                              className="flex items-center gap-1 h-7 px-3 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                            <button
                              onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${a.athlete}`)}
                              className="ml-auto h-7 px-3 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-medium transition-colors"
                            >
                              Ver perfil
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
