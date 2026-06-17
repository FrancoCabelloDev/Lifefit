'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users2,
  UserPlus,
  Search,
  MoreHorizontal,
  Mail,
  Loader2,
  Trash2,
  Edit,
  Award,
  Apple,
  Headphones,
  Plus,
  Eye,
  CalendarRange,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { setTokens, setStoredUser, dispatchAuthEvent, backupAdminTokens } from '@/lib/auth'
import type { StaffMember, PaginatedResponse } from '@/lib/types'

// ── Availability schedule drawer ──────────────────────────────────────────────

interface AvailabilityBlock {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
}

const DAYS = [
  { value: 0, short: 'Lun', label: 'Lunes' },
  { value: 1, short: 'Mar', label: 'Martes' },
  { value: 2, short: 'Mié', label: 'Miércoles' },
  { value: 3, short: 'Jue', label: 'Jueves' },
  { value: 4, short: 'Vie', label: 'Viernes' },
  { value: 5, short: 'Sáb', label: 'Sábado' },
  { value: 6, short: 'Dom', label: 'Domingo' },
]
const SLOT_DURATIONS = [15, 20, 30, 45, 60]

function ScheduleDrawer({ member, open, onClose }: { member: StaffMember | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [day, setDay]           = useState(0)
  const [start, setStart]       = useState('09:00')
  const [end, setEnd]           = useState('12:00')
  const [duration, setDuration] = useState(30)

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['nutri-availability', member?.id],
    queryFn: async () => {
      const res = await api.get<any>('/api/gyms/availability/', { params: { nutritionist_id: member!.id } })
      return (res?.results ?? res ?? []) as AvailabilityBlock[]
    },
    enabled: !!member?.id && open,
  })

  const addMutation = useMutation({
    mutationFn: () => api.post('/api/gyms/availability/', {
      nutritionist_id: member!.id,
      day_of_week: day,
      start_time: start,
      end_time: end,
      slot_duration_minutes: duration,
    }),
    onSuccess: () => {
      showSuccess('Bloque agregado')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['nutri-availability', member?.id] })
    },
    onError: (err) => showError(err, 'No se pudo agregar el bloque'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/gyms/availability/${id}/`),
    onSuccess: () => {
      showSuccess('Bloque eliminado')
      queryClient.invalidateQueries({ queryKey: ['nutri-availability', member?.id] })
    },
    onError: (err) => showError(err, 'No se pudo eliminar'),
  })

  const blocksByDay = DAYS.map(d => ({
    ...d,
    blocks: (blocks ?? []).filter(b => b.day_of_week === d.value),
  }))

  const totalSlots = (blocks ?? []).reduce((acc, b) => {
    const [sh, sm] = b.start_time.split(':').map(Number)
    const [eh, em] = b.end_time.split(':').map(Number)
    return acc + Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / b.slot_duration_minutes)
  }, 0)

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              {member?.first_name[0]}{member?.last_name[0]}
            </div>
            <div>
              <SheetTitle className="text-base">{member?.first_name} {member?.last_name}</SheetTitle>
              <SheetDescription className="text-xs">Horario semanal de disponibilidad</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando horario...
            </div>
          ) : (
            <>
              {blocks && blocks.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Días activos', value: blocksByDay.filter(d => d.blocks.length > 0).length },
                    { label: 'Bloques', value: blocks.length },
                    { label: 'Slots/sem.', value: totalSlots },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
                      <p className="text-xl font-black text-slate-800">{s.value}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-7 gap-1.5">
                {blocksByDay.map(d => (
                  <div key={d.value} className="min-w-0">
                    <p className={cn(
                      'text-[10px] font-bold text-center pb-1.5 mb-1.5 border-b',
                      d.blocks.length > 0 ? 'text-emerald-700 border-emerald-100' : 'text-slate-300 border-slate-100',
                    )}>
                      {d.short}
                    </p>
                    <div className="space-y-1">
                      {d.blocks.length === 0 ? (
                        <div className="h-10 rounded-lg bg-slate-50 border border-dashed border-slate-100 flex items-center justify-center">
                          <span className="text-[9px] text-slate-200">—</span>
                        </div>
                      ) : (
                        d.blocks.map(b => (
                          <div key={b.id} className="bg-emerald-50 border border-emerald-100 rounded-lg p-1.5 group relative">
                            <p className="text-[9px] font-bold text-emerald-800 leading-none">
                              {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                            </p>
                            <p className="text-[8px] text-emerald-500 mt-0.5">{b.slot_duration_minutes}m</p>
                            <button
                              onClick={() => deleteMutation.mutate(b.id)}
                              disabled={deleteMutation.isPending}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded bg-rose-100 hover:bg-rose-200 text-rose-500 flex items-center justify-center"
                            >
                              <Trash2 className="w-2 h-2" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {showForm ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-emerald-700">Nuevo bloque horario</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Día</label>
                      <select value={day} onChange={e => setDay(Number(e.target.value))}
                        className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Duración slot</label>
                      <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                        className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        {SLOT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Desde</label>
                      <input type="time" value={start} onChange={e => setStart(e.target.value)}
                        className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Hasta</label>
                      <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                        className="w-full h-9 rounded-xl text-sm border border-slate-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
                    <Button size="sm" disabled={addMutation.isPending} onClick={() => addMutation.mutate()}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                      {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                      Agregar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowForm(true)} size="sm" variant="outline"
                  className="w-full border-dashed border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar bloque horario
                </Button>
              )}

              <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">Los atletas solo podrán agendar citas dentro de estos bloques.</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface StaffListProps {
  role: 'coach' | 'nutritionist' | 'receptionist'
  title: string
  description: string
}

export default function StaffList({ role, title, description }: StaffListProps) {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Schedule drawer
  const [scheduleTarget, setScheduleTarget] = useState<StaffMember | null>(null)

  // Edit modal
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' })
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const openEdit = (member: StaffMember) => {
    setEditTarget(member)
    setEditForm({ first_name: member.first_name, last_name: member.last_name, email: member.email })
    setEditError(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setIsEditSubmitting(true)
    setEditError(null)
    try {
      await api.patch(`/api/auth/gym-members/${editTarget.id}/`, editForm)
      showSuccess('Perfil actualizado')
      setEditTarget(null)
      fetchStaff()
    } catch (err: any) {
      setEditError(err?.message || 'Error al actualizar el perfil.')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  })

  useEffect(() => {
    fetchStaff()
  }, [role])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<StaffMember[]>("/api/auth/gym-members/", {
        params: { role }
      })
      setStaff(Array.isArray(data) ? data : (data as any)?.results || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setInviteError(null)

    // Cerrar modal optimistamente — evita que el spinner quede atascado
    // si el servidor tarda en responder (ej. envío de email)
    setIsInviteModalOpen(false)
    const savedForm = { ...inviteForm }
    setInviteForm({ first_name: '', last_name: '', email: '' })

    try {
      await api.post("/api/auth/gym-members/", { ...savedForm, role })
    } catch (err: any) {
      console.error(err)
      setInviteForm(savedForm)
      setIsInviteModalOpen(true)
      setInviteError(err?.message || 'Error al enviar la invitación. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
      fetchStaff()
    }
  }

  const handleImpersonateStaff = async (staffId: string | number) => {
    try {
      backupAdminTokens()
      const res: any = await api.post('/api/auth/impersonate-staff/', { staff_id: String(staffId) })
      setTokens(res.access, res.refresh)
      setStoredUser(res.user)
      dispatchAuthEvent()
      if (res.gym_slug) {
        router.push(`/${res.gym_slug}/panel`)
      }
    } catch (e) {
      console.error(e)
      showError(e, 'Error al entrar como este miembro del staff.')
    }
  }

  const handleDeleteMember = async (memberId: string | number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del equipo?')) return
    try {
      await api.delete(`/api/auth/gym-members/${String(memberId)}/`)
      fetchStaff()
    } catch (error) {
      console.error('Error deleting staff member:', error)
      showError(error, 'Error al eliminar al miembro del equipo.')
    }
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'coach': 
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100 flex gap-1 items-center px-3 py-1"><Award className="w-3.5 h-3.5"/> Coach</Badge>
      case 'nutritionist': 
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 flex gap-1 items-center px-3 py-1"><Apple className="w-3.5 h-3.5"/> Nutricionista</Badge>
      case 'receptionist': 
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 flex gap-1 items-center px-3 py-1"><Headphones className="w-3.5 h-3.5"/> Atención</Badge>
      default: 
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const filteredStaff = staff.filter(member => 
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 font-inter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-lexend">
            {title}
          </h1>
          <p className="text-slate-500 font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              placeholder="Buscar por nombre..." 
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-emerald-500/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-slate-900 hover:bg-black text-white h-11 px-6 rounded-xl gap-2 shadow-xl shadow-slate-900/10 transition-all active:scale-95 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Añadir</span>
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="animate-pulse font-bold uppercase text-xs tracking-widest text-slate-400">Sincronizando Base de Datos...</p>
            </div>
          ) : filteredStaff.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Identidad</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rol Asignado</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contacto</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">{member.first_name} {member.last_name}</div>
                            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Miembro Activo</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded-lg">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          {member.email}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImpersonateStaff(member.id)}
                            className="h-10 px-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Ver perspectiva de este miembro"
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all">
                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 shadow-2xl border-none rounded-2xl bg-white">
                              <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2">Opciones de Gestión</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50" onClick={() => handleImpersonateStaff(member.id)}>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                  <Eye className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Ver Perspectiva</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50" onClick={() => openEdit(member)}>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                  <Edit className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Editar Perfil</span>
                              </DropdownMenuItem>
                              {member.role === 'nutritionist' && (
                                <DropdownMenuItem
                                  className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-emerald-50"
                                  onClick={() => setScheduleTarget(member)}
                                >
                                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <CalendarRange className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-slate-700 text-sm">Gestionar Horario</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-rose-50 group/item" onClick={() => handleDeleteMember(member.id)}>
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-rose-600 text-sm">Eliminar Acceso</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                <Users2 className="w-10 h-10 text-slate-200" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Sin registros encontrados</h3>
                <p className="text-sm text-slate-500 max-w-[280px] mx-auto">Todavía no has registrado personal en esta categoría de equipo.</p>
              </div>
              <Button 
                variant="outline" 
                className="mt-4 border-slate-200 rounded-xl h-11 px-8 font-bold text-slate-600 hover:bg-slate-50" 
                onClick={() => fetchStaff()}
              >
                Actualizar Lista
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleDrawer
        member={scheduleTarget}
        open={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
      />

      {/* Edit member modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white/95 shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 rounded-3xl">
            <div className="bg-slate-950 p-6 text-white border-b border-slate-800">
              <CardTitle className="text-xl flex items-center gap-2 font-bold font-lexend">
                <Edit className="w-5 h-5 text-blue-400" />
                Editar Perfil
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {editTarget.first_name} {editTarget.last_name}
              </p>
            </div>
            <div className="p-6 bg-white">
              <form id="edit-staff-form" onSubmit={handleEditSubmit} className="space-y-4">
                {editError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 font-semibold">
                    {editError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_first_name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre</Label>
                    <Input
                      id="edit_first_name"
                      required
                      value={editForm.first_name}
                      onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="border-slate-200 focus-visible:ring-blue-500 rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_last_name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Apellidos</Label>
                    <Input
                      id="edit_last_name"
                      required
                      value={editForm.last_name}
                      onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="border-slate-200 focus-visible:ring-blue-500 rounded-xl h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    required
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="border-slate-200 focus-visible:ring-blue-500 rounded-xl h-11"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)} className="border-slate-200 rounded-xl font-bold h-11 text-slate-500 hover:bg-slate-100">
                Cancelar
              </Button>
              <Button
                type="submit"
                form="edit-staff-form"
                disabled={isEditSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2 items-center rounded-xl font-bold h-11 shadow-lg shadow-blue-600/10 transition-all active:scale-95"
              >
                {isEditSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Centered glassmorphic invite modal with backdrop blur */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white/95 shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 rounded-3xl">
            <div className="bg-slate-950 p-6 text-white border-b border-slate-800">
              <CardTitle className="text-xl flex items-center gap-2 font-bold font-lexend">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                Invitar Miembro
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Registra a un nuevo {role === 'coach' ? 'entrenador' : role === 'nutritionist' ? 'nutricionista' : 'personal de apoyo'}. Le enviaremos una invitación para configurar su contraseña.
              </p>
            </div>
            <div className="overflow-y-auto p-6 bg-white">
              <form id="invite-staff-form" onSubmit={handleInviteSubmit} className="space-y-4">
                {inviteError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 font-semibold">
                    {inviteError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre</Label>
                    <Input 
                      id="first_name" 
                      required 
                      value={inviteForm.first_name} 
                      onChange={e => setInviteForm({...inviteForm, first_name: e.target.value})} 
                      placeholder="Ej. Carlos" 
                      className="border-slate-200 focus-visible:ring-emerald-500 rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Apellidos</Label>
                    <Input 
                      id="last_name" 
                      required 
                      value={inviteForm.last_name} 
                      onChange={e => setInviteForm({...inviteForm, last_name: e.target.value})} 
                      placeholder="Ej. Gómez" 
                      className="border-slate-200 focus-visible:ring-emerald-500 rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={inviteForm.email} 
                    onChange={e => setInviteForm({...inviteForm, email: e.target.value})} 
                    placeholder="carlos@gym.com" 
                    className="border-slate-200 focus-visible:ring-emerald-500 rounded-xl h-11"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)} className="border-slate-200 rounded-xl font-bold h-11 text-slate-500 hover:bg-slate-100">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                form="invite-staff-form" 
                disabled={isSubmitting} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-2 items-center rounded-xl font-bold h-11 shadow-lg shadow-emerald-600/10 transition-all active:scale-95"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar Invitación
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
