'use client'

import { useEffect, useState } from 'react'
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
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

import { api } from '@/lib/api'
import type { StaffMember, PaginatedResponse } from '@/lib/types'

interface StaffListProps {
  role: 'coach' | 'nutritionist' | 'receptionist'
  title: string
  description: string
}

export default function StaffList({ role, title, description }: StaffListProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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
          <Button className="bg-slate-900 hover:bg-black text-white h-11 px-6 rounded-xl gap-2 shadow-xl shadow-slate-900/10 transition-all active:scale-95">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all">
                              <MoreHorizontal className="h-5 w-5 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2 shadow-2xl border-none rounded-2xl bg-white">
                            <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2">Opciones de Gestión</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Edit className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-slate-700 text-sm">Editar Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-rose-50 group/item">
                              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-rose-600 text-sm">Eliminar Acceso</span>
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
    </div>
  )
}
