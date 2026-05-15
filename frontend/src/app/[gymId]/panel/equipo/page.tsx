'use client'

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import type { StaffMember, PaginatedResponse } from '@/lib/types'

export default function EquipoPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  const searchParams = useSearchParams()
  const roleFilter = searchParams.get('role') || 'all'
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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
        <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-lg shadow-slate-900/20">
          <UserPlus className="w-4 h-4" />
          Añadir Miembro
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
                            <DropdownMenuItem className="gap-2 text-sm font-medium text-rose-600">
                              <Trash2 className="w-4 h-4" /> Eliminar del Equipo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
    </div>
  )
}
