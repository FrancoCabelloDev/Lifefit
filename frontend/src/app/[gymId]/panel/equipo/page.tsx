'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Users2, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Shield,
  Loader2,
  Trash2,
  Edit,
  Award,
  Apple,
  Headphones,
  Filter,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { api } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent, backupAdminTokens } from '@/lib/auth'
import type { StaffMember } from '@/lib/types'

export default function EquipoPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  const searchParams = useSearchParams()
  const router = useRouter()
  const roleFilter = searchParams.get('role') || 'all'
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'coach'
  })

  useEffect(() => {
    fetchStaff()
  }, [roleFilter])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      const params: Record<string, string> = {}
      if (roleFilter !== 'all') {
        params.role = roleFilter
      }
      const data = await api.get<any>("/api/accounts/gym-members/", { params })
      const members: StaffMember[] = Array.isArray(data) ? data : data?.results ?? []
      const filteredData = roleFilter === 'all'
        ? members.filter((m) => m.role !== 'athlete')
        : members
      setStaff(filteredData)
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setInviteError(null)
    try {
      await api.post("/api/accounts/gym-members/", inviteForm)
      setIsInviteModalOpen(false)
      setInviteForm({
        first_name: '',
        last_name: '',
        email: '',
        role: 'coach'
      })
      fetchStaff()
    } catch (err: any) {
      console.error(err)
      setInviteError(err?.message || 'Error al enviar la invitación. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMember = async (memberId: string | number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del equipo?')) return
    try {
      await api.delete(`/api/accounts/gym-members/${String(memberId)}/`)
      fetchStaff()
    } catch (error) {
      console.error('Error deleting staff member:', error)
      alert('Error al eliminar al miembro del equipo.')
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
      alert('Error al entrar como este miembro del staff.')
    }
  }

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'coach': 
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none flex gap-1 items-center"><Award className="w-3 h-3"/> Coach</Badge>
      case 'nutritionist': 
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none flex gap-1 items-center"><Apple className="w-3 h-3"/> Nutricionista</Badge>
      case 'receptionist': 
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none flex gap-1 items-center"><Headphones className="w-3 h-3"/> Atención</Badge>
      default: 
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const filteredStaff = staff.filter(member => 
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mi Equipo</h1>
          <p className="text-slate-500">Gestiona a tus entrenadores, nutricionistas y personal de apoyo.</p>
        </div>
        <Button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-lg shadow-slate-900/20"
        >
          <UserPlus className="w-4 h-4" />
          Invitar Miembro
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <Tabs defaultValue={roleFilter} className="w-full sm:w-auto">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="all" onClick={() => window.history.pushState(null, '', `/${gymId}/panel/equipo`)}>Todos</TabsTrigger>
            <TabsTrigger value="coach" onClick={() => window.history.pushState(null, '', `/${gymId}/panel/equipo?role=coach`)}>Coaches</TabsTrigger>
            <TabsTrigger value="nutritionist" onClick={() => window.history.pushState(null, '', `/${gymId}/panel/equipo?role=nutritionist`)}>Nutricionistas</TabsTrigger>
            <TabsTrigger value="receptionist" onClick={() => window.history.pushState(null, '', `/${gymId}/panel/equipo?role=receptionist`)}>Atención</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre..." 
            className="pl-10 bg-white border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="animate-pulse font-medium">Cargando equipo...</p>
            </div>
          ) : filteredStaff.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Miembro</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rol</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contacto</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shadow-inner ring-2 ring-white">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{member.first_name} {member.last_name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">ID: #{member.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 flex items-center gap-2">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {member.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImpersonateStaff(member.id)}
                            className="h-8 px-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Ver perspectiva de este miembro"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 shadow-xl border-slate-200">
                              <DropdownMenuLabel className="text-xs text-slate-500">Acciones de Staff</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-sm font-medium">
                                <Edit className="w-4 h-4 text-slate-400" /> Editar Miembro
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteMember(member.id)} className="gap-2 text-sm font-medium text-rose-600 cursor-pointer">
                                <Trash2 className="w-4 h-4" /> Eliminar del Equipo
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Users2 className="w-16 h-16 text-slate-100 mb-2" />
              <h3 className="font-bold text-slate-900">No hay miembros en esta categoría</h3>
              <p className="text-sm text-slate-500">Añade personal a tu equipo para empezar a delegar tareas.</p>
              <Button variant="outline" className="mt-4 border-slate-200" onClick={() => fetchStaff()}>
                Recargar lista
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Centered glassmorphic invite modal with backdrop blur */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-white/95 shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 font-bold">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Invitar Miembro de Staff
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Registra a un nuevo entrenador, nutricionista o personal de apoyo. Le enviaremos una invitación para configurar su contraseña.
              </CardDescription>
            </CardHeader>
            <div className="overflow-y-auto p-6">
              <form id="invite-staff-form" onSubmit={handleInviteSubmit} className="space-y-4">
                {inviteError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg p-3">
                    {inviteError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-xs font-semibold text-slate-600">Nombre</Label>
                    <Input 
                      id="first_name" 
                      required 
                      value={inviteForm.first_name} 
                      onChange={e => setInviteForm({...inviteForm, first_name: e.target.value})} 
                      placeholder="Ej. Carlos" 
                      className="border-slate-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-xs font-semibold text-slate-600">Apellidos</Label>
                    <Input 
                      id="last_name" 
                      required 
                      value={inviteForm.last_name} 
                      onChange={e => setInviteForm({...inviteForm, last_name: e.target.value})} 
                      placeholder="Ej. Gómez" 
                      className="border-slate-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-600">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={inviteForm.email} 
                    onChange={e => setInviteForm({...inviteForm, email: e.target.value})} 
                    placeholder="carlos@gym.com" 
                    className="border-slate-200 focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs font-semibold text-slate-600">Rol del Miembro</Label>
                  <Select 
                    value={inviteForm.role} 
                    onValueChange={(val) => setInviteForm({...inviteForm, role: val})}
                  >
                    <SelectTrigger className="border-slate-200 bg-white">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-md">
                      <SelectItem value="coach">Entrenador (Coach)</SelectItem>
                      <SelectItem value="nutritionist">Nutricionista</SelectItem>
                      <SelectItem value="receptionist">Atención al Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)} className="border-slate-200">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                form="invite-staff-form" 
                disabled={isSubmitting} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-2 items-center"
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
