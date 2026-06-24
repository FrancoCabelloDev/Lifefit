'use client'

import { useEffect, useState, use, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  Radio,
  Clock,
  UserCheck,
  Search,
  Loader2,
  UserPlus,
  Users,
  UserCog,
  Download,
  QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { api } from '@/lib/api'
import { showError } from '@/lib/toast'
import { roleColors, roleLabels } from '@/lib/constants'
import type { CheckIn, User, PaginatedResponse } from '@/lib/types'
import { useRoleGuard } from '@/hooks/useRoleGuard'


export default function CheckInPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  useRoleGuard(gymId, ['gym_admin', 'super_admin', 'receptionist'])
  const qrRef = useRef<HTMLDivElement>(null)

  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [athletes, setAthletes] = useState<User[]>([])
  const [staffMembers, setStaffMembers] = useState<User[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberFilter, setMemberFilter] = useState<'athlete' | 'staff'>('athlete')

  const checkinUrl = typeof window !== 'undefined' ? `${window.location.origin}/${gymId}/checkin/qr` : `/${gymId}/checkin/qr`

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `checkin-qr-${gymId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  useEffect(() => {
    fetchCheckins()
    fetchAthletes()
    fetchStaff()
    fetchBranches()
  }, [])

  const fetchCheckins = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<CheckIn[] | PaginatedResponse<CheckIn>>("/api/gyms/checkins/")
      setCheckins(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching checkins:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAthletes = async () => {
    try {
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'athlete' }
      })
      setAthletes(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching athletes:', error)
    }
  }

  const fetchStaff = async () => {
    try {
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'coach' }
      })
      const coaches = Array.isArray(data) ? data : data.results || []
      const data2 = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'nutritionist' }
      })
      const nutritionists = Array.isArray(data2) ? data2 : data2.results || []
      const data3 = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'receptionist' }
      })
      const receptionists = Array.isArray(data3) ? data3 : data3.results || []
      setStaffMembers([...coaches, ...nutritionists, ...receptionists])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const data: any = await api.get("/api/gyms/branches/")
      setBranches(Array.isArray(data) ? data : data?.results || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  const handleRegisterCheckin = async () => {
    if (!selectedUserId) return
    try {
      setIsSubmitting(true)
      await api.post("/api/gyms/checkins/register/", {
        user_id: selectedUserId,
        branch_id: selectedBranch === '__none__' ? undefined : selectedBranch,
        method: 'manual',
      })
      setSelectedUserId('')
      setSelectedBranch('')
      setSearchTerm('')
      fetchCheckins()
    } catch (error: any) {
      showError(error, 'Error al registrar check-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeMembers = memberFilter === 'athlete' ? athletes : staffMembers
  const filteredMembers = activeMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const uniqueAthletesToday = new Set(checkins.map(c => c.user)).size

  const todayCheckins = checkins.filter(c => {
    const today = new Date().toDateString()
    return new Date(c.timestamp || c.created_at).toDateString() === today
  })

  const selectedUser = [...athletes, ...staffMembers].find(m => m.id === selectedUserId)

  return (
    <div className="space-y-8 font-inter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-lexend">
          Registro de Asistencia
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Gestiona los check-in de atletas y personal del gimnasio.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{todayCheckins.length}</p>
              <p className="text-xs text-slate-500 font-medium">Check-ins hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{uniqueAthletesToday}</p>
              <p className="text-xs text-slate-500 font-medium">Personas únicas hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{checkins.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total registros</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
          <CardHeader className="border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-600 rounded-xl text-white shadow-lg shadow-violet-600/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Código QR — Auto-Registro</CardTitle>
                <CardDescription>Tus miembros escanean y registran su entrada automáticamente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <div ref={qrRef} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner">
              <QRCodeCanvas
                value={checkinUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                marginSize={2}
              />
            </div>
            <p className="text-xs text-slate-400 text-center max-w-sm break-all font-mono bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              {checkinUrl}
            </p>
            <Button
              onClick={handleDownloadQR}
              variant="outline"
              className="border-slate-200 rounded-xl h-10 px-6 gap-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </Button>
            <div className="text-xs text-slate-500 text-center space-y-1 border-t border-slate-100 pt-4 w-full">
              <p className="font-semibold text-slate-700">Instrucciones:</p>
              <p>1. Descarga la imagen QR</p>
              <p>2. Imprime y colócalo en la entrada del gimnasio</p>
              <p>3. Los miembros escanean con su celular para registrar su ingreso</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
          <CardHeader className="border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-600/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Registrar Nuevo Check-in</CardTitle>
                <CardDescription>Busca y selecciona un miembro del gimnasio para registrar su entrada</CardDescription>
              </div>
            </div>
          </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Tabs value={memberFilter} onValueChange={(v) => { setMemberFilter(v as 'athlete' | 'staff'); setSearchTerm(''); setSelectedUserId('') }}>
            <TabsList className="bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="athlete" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
                <Users className="w-4 h-4 mr-2" />
                Atletas
              </TabsTrigger>
              <TabsTrigger value="staff" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
                <UserCog className="w-4 h-4 mr-2" />
                Staff (Personal)
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                {memberFilter === 'athlete' ? 'Atleta' : 'Staff'}
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={memberFilter === 'athlete' ? 'Buscar atleta por nombre o email...' : 'Buscar personal por nombre o email...'}
                  className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSelectedUserId('') }}
                />
              </div>
              {searchTerm && !selectedUserId && filteredMembers.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl" style={{ width: 'calc(100% - 2rem)' }}>
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(m.id)
                        setSearchTerm(`${m.first_name} ${m.last_name}`)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors text-sm font-medium text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between"
                    >
                      <span>{m.first_name} {m.last_name} — {m.email}</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold border ${roleColors[m.role] || 'border-slate-200'}`}>
                        {roleLabels[m.role] || m.role}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && selectedUser && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-semibold text-emerald-800 text-sm">{selectedUser.first_name} {selectedUser.last_name}</span>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold border ${roleColors[selectedUser.role] || 'border-slate-200'}`}>
                    {roleLabels[selectedUser.role] || selectedUser.role}
                  </Badge>
                </div>
              )}
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Sucursal</p>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Principal" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                  <SelectItem value="__none__" className="rounded-xl py-3 cursor-pointer">Principal</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="rounded-xl py-3 cursor-pointer">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleRegisterCheckin}
              disabled={!selectedUserId || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8 rounded-xl gap-2 shadow-xl shadow-emerald-600/10 transition-all active:scale-95 font-bold"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
              Registrar Entrada
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Check-ins de Hoy</CardTitle>
          <CardDescription>{todayCheckins.length} registros de asistencia hoy</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="animate-pulse font-bold uppercase text-xs tracking-widest text-slate-400 font-lexend">Cargando registros...</p>
            </div>
          ) : todayCheckins.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Miembro</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Rol</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Sucursal</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Método</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayCheckins.map((checkin) => (
                    <tr key={checkin.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm">
                            {checkin.user_name?.charAt(0) || '?'}
                          </div>
                          <div className="font-semibold text-slate-900">{checkin.user_name || 'Usuario'}</div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2.5 py-1 font-bold border ${roleColors[checkin.user_role] || 'border-slate-200 text-slate-600'}`}
                        >
                          {roleLabels[checkin.user_role] || checkin.user_role}
                        </Badge>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-medium text-slate-600">{checkin.branch_name || 'Principal'}</span>
                      </td>
                      <td className="px-8 py-5">
                        <Badge
                          variant="outline"
                          className={`capitalize border-slate-200 px-3 py-1 font-semibold ${
                            checkin.method === 'manual' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                            checkin.method === 'qr' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                            'text-blue-600 border-blue-200 bg-blue-50'
                          }`}
                        >
                          {checkin.method === 'manual' ? 'Manual' :
                           checkin.method === 'qr' ? 'QR' : 'Autoregistro'}
                        </Badge>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          {new Date(checkin.timestamp || checkin.created_at).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
                <Radio className="w-10 h-10 text-slate-200" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Sin check-ins hoy</h3>
                <p className="text-sm text-slate-500 max-w-[280px] mx-auto">Todavía no se han registrado entradas para hoy.</p>
              </div>
              <Button
                variant="outline"
                className="mt-4 border-slate-200 rounded-xl h-11 px-8 font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => fetchCheckins()}
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
