'use client'

import { useEffect, useState, use } from 'react'
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Calendar,
  Shield,
  Loader2,
  Trash2,
  Edit,
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

interface Athlete {
  id: number
  email: string
  first_name: string
  last_name: string
  date_joined: string
  nivel: number
  puntos: number
}

export default function AthletesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAthletes()
  }, [])

  const fetchAthletes = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('access_token')
      // Corregido: La ruta correcta es /api/auth/gym-members/
      const response = await fetch(`http://localhost:8000/api/auth/gym-members/?role=athlete`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Manejar datos paginados o arrays planos
        setAthletes(Array.isArray(data) ? data : data.results || [])
      }
    } catch (error) {
      console.error('Error fetching athletes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAthletes = athletes.filter(athlete => 
    `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 font-inter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-lexend">
            Gestión de Atletas
          </h1>
          <p className="text-slate-500 font-medium">Administra los miembros y clientes de tu gimnasio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              placeholder="Buscar atleta..." 
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-emerald-500/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-xl gap-2 shadow-xl shadow-emerald-600/10 transition-all active:scale-95 font-bold">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Atleta</span>
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="animate-pulse font-black uppercase text-xs tracking-widest text-slate-400 font-lexend">Sincronizando Base de Datos...</p>
            </div>
          ) : filteredAthletes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-lexend">Atleta</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-lexend">Contacto</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-lexend">Rendimiento</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-lexend">Registro</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-lexend text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAthletes.map((athlete) => (
                    <tr key={athlete.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {athlete.first_name[0]}{athlete.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">{athlete.first_name} {athlete.last_name}</div>
                            <div className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Miembro Activo</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400 group-hover:text-emerald-500 transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          {athlete.email}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 font-bold">
                            Nivel {athlete.nivel}
                          </Badge>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{athlete.puntos} PTS</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {new Date(athlete.date_joined).toLocaleDateString()}
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
                            <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2">Opciones de Atleta</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Edit className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-slate-700 text-sm">Ver Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-rose-50 group/item text-rose-600">
                              <div className="p-2 bg-rose-50 rounded-lg group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-sm">Dar de Baja</span>
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
                <Users className="w-10 h-10 text-slate-200" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Sin Atletas registrados</h3>
                <p className="text-sm text-slate-500 max-w-[280px] mx-auto">Todavía no has registrado atletas en tu gimnasio.</p>
              </div>
              <Button 
                variant="outline" 
                className="mt-4 border-slate-200 rounded-xl h-11 px-8 font-bold text-slate-600 hover:bg-slate-50" 
                onClick={() => fetchAthletes()}
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
