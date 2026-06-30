'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  Plus,
  Eye,
  UserCheck,
  Apple,
  Download,
  Lock,
  Star,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { api, ApiError } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent, getStoredUser, backupAdminTokens } from '@/lib/auth'
import { showError, showSuccess } from '@/lib/toast'
import type { User, PaginatedResponse, GymMembershipPlan, GymSubscription } from '@/lib/types'

const athleteSchema = z.object({
  first_name: z.string().min(1, 'El nombre es obligatorio').max(50),
  last_name: z.string().min(1, 'El apellido es obligatorio').max(50),
  dni: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Correo inválido').min(1, 'El correo es obligatorio'),
  membership_plan_id: z.string().optional(),
  start_date: z.string().optional(),
})
export type AthleteFormData = z.infer<typeof athleteSchema>

export default function AthletesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { gymId } = resolvedParams

  const storedUser = getStoredUser<User>()
  const currentRole = storedUser?.role || 'gym_admin'
  const isStaffPage = currentRole === 'gym_admin' || currentRole === 'super_admin' || currentRole === 'receptionist'
  const isCoach = currentRole === 'coach'
  const isNutritionist = currentRole === 'nutritionist'
  const canDeactivate = currentRole === 'gym_admin' || currentRole === 'receptionist' || currentRole === 'super_admin'
  
  const [athletes, setAthletes] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [membershipPlans, setMembershipPlans] = useState<GymMembershipPlan[]>([])
  const isSubmittingRef = useRef(false)

  const athleteForm = useForm<AthleteFormData>({
    resolver: zodResolver(athleteSchema),
    defaultValues: { first_name: '', last_name: '', dni: '', phone: '', email: '', membership_plan_id: '', start_date: '' },
  })

  const [coaches, setCoaches] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignAthleteId, setAssignAthleteId] = useState<string | null>(null)
  const [selectedCoach, setSelectedCoach] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const [nutritionists, setNutritionists] = useState<User[]>([])
  const [nutritionAssignments, setNutritionAssignments] = useState<Record<string, string>>({})
  const [nutriAssignModalOpen, setNutriAssignModalOpen] = useState(false)
  const [selectedNutritionist, setSelectedNutritionist] = useState('')
  const [isAssigningNutri, setIsAssigningNutri] = useState(false)

  const [coachAthleteIds, setCoachAthleteIds] = useState<Set<string>>(new Set())
  const [nutriAthleteIds, setNutriAthleteIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal confirmación de baja
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [athleteToDelete, setAthleteToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isStaffPage) {
      fetchAthletes()
      fetchCoaches()
      fetchNutritionists()
    } else if (isCoach) {
      fetchCoachAthletes()
    } else if (isNutritionist) {
      fetchNutriAthletes()
    } else {
      setIsLoading(false)
    }
    fetchAssignments()
    fetchNutritionAssignments()
    fetchMembershipPlans()
  }, [])

  const fetchMembershipPlans = async () => {
    try {
      const data = await api.get<PaginatedResponse<GymMembershipPlan>>("/api/gyms/membership-plans/")
      setMembershipPlans(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching membership plans:', error)
    }
  }

  const fetchCoaches = async () => {
    try {
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'coach' }
      })
      setCoaches(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching coaches:', error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const data = await api.get<any>("/api/gyms/coach-assignments/")
      const items = Array.isArray(data) ? data : data.results || []
      const map: Record<string, string> = {}
      items.forEach((a: any) => {
        if (a.is_active) {
          map[a.athlete] = a.coach_name
        }
      })
      setAssignments(map)
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const fetchNutritionists = async () => {
    try {
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'nutritionist' }
      })
      setNutritionists(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching nutritionists:', error)
    }
  }

  const fetchNutritionAssignments = async () => {
    try {
      const data = await api.get<any>("/api/gyms/nutritionist-assignments/")
      const items = Array.isArray(data) ? data : data.results || []
      const map: Record<string, string> = {}
      items.forEach((a: any) => {
        if (a.is_active) {
          map[a.athlete] = a.nutritionist_name
        }
      })
      setNutritionAssignments(map)
    } catch (error) {
      console.error('Error fetching nutrition assignments:', error)
    }
  }

  const fetchCoachAthletes = async () => {
    try {
      const data = await api.get<any>("/api/gyms/coach-assignments/my_athletes/")
      const items = data?.results ?? (Array.isArray(data) ? data : [])
      const ids = new Set<string>(items.map((a: any) => a.id))
      setCoachAthleteIds(ids)
      if (isCoach) setAthletes(items)
    } catch (error) {
      console.error('Error fetching coach athletes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNutriAthletes = async () => {
    try {
      const data = await api.get<any>("/api/gyms/nutritionist-assignments/my_athletes/")
      const items = data?.results ?? (Array.isArray(data) ? data : [])
      const ids = new Set<string>(items.map((a: any) => a.id))
      setNutriAthleteIds(ids)
      if (isNutritionist) setAthletes(items)
    } catch (error) {
      console.error('Error fetching nutritionist athletes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignNutritionist = async () => {
    if (!assignAthleteId || !selectedNutritionist) return
    try {
      setIsAssigningNutri(true)
      await api.post("/api/gyms/nutritionist-assignments/", {
        nutritionist: selectedNutritionist,
        athlete: assignAthleteId,
      })
      setNutriAssignModalOpen(false)
      setSelectedNutritionist('')
      fetchNutritionAssignments()
      showSuccess('Nutricionista asignado correctamente.')
    } catch (error: any) {
      const detail = error?.data?.detail || error?.data?.athlete?.[0] || error?.message || 'Error al asignar nutricionista'
      showError(detail, 'No se pudo asignar el nutricionista')
    } finally {
      setIsAssigningNutri(false)
    }
  }

  const handleRemoveNutritionAssignment = async (athleteId: string) => {
    try {
      const data = await api.get<any>("/api/gyms/nutritionist-assignments/")
      const items = Array.isArray(data) ? data : data.results || []
      const assignment = items.find((a: any) => a.athlete === athleteId && a.is_active)
      if (assignment) {
        await api.delete(`/api/gyms/nutritionist-assignments/${assignment.id}/`)
        fetchNutritionAssignments()
      }
    } catch (error) {
      showError(error, 'Error al quitar el nutricionista')
    }
  }

  const handleAssignCoach = async () => {
    if (!assignAthleteId || !selectedCoach) return
    try {
      setIsAssigning(true)
      await api.post("/api/gyms/coach-assignments/", {
        coach: selectedCoach,
        athlete: assignAthleteId,
      })
      setAssignModalOpen(false)
      setSelectedCoach('')
      fetchAssignments()
    } catch (error: any) {
      showError(error, 'Error al asignar coach')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveAssignment = async (athleteId: string) => {
    try {
      const data = await api.get<any>("/api/gyms/coach-assignments/")
      const items = Array.isArray(data) ? data : data.results || []
      const assignment = items.find((a: any) => a.athlete === athleteId && a.is_active)
      if (assignment) {
        await api.delete(`/api/gyms/coach-assignments/${assignment.id}/`)
        fetchAssignments()
      }
    } catch (error) {
      showError(error, 'Error al quitar el coach')
    }
  }

  const handleCreateAthlete = async (data: AthleteFormData) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    // Cerrar modal optimistamente para que el spinner nunca quede atascado
    setIsModalOpen(false)
    athleteForm.reset()
    try {
      const payload: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: 'athlete',
      }
      if (data.dni) payload.dni = data.dni
      if (data.phone) payload.phone = data.phone
      if (data.membership_plan_id) payload.membership_plan_id = data.membership_plan_id
      if (data.start_date) payload.start_date = data.start_date

      await api.post<any>("/api/auth/gym-members/", payload)
      showSuccess('Atleta registrado correctamente.')
    } catch (error: any) {
      showError(error, 'Error al registrar atleta')
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
      fetchAthletes()
    }
  }

  const handleDeactivateAthlete = (athleteId: string) => {
    const athlete = athletes.find(a => a.id === athleteId) || null
    setAthleteToDelete(athlete)
    setDeleteModalOpen(true)
  }

  const confirmDeleteAthlete = async () => {
    if (!athleteToDelete) return
    setIsDeleting(true)
    try {
      const sub = athleteToDelete.active_membership
      if (sub && sub.status === 'active') {
        await api.patch(`/api/gyms/subscriptions/${sub.id}/`, { status: 'canceled' })
      }
      await api.delete(`/api/auth/gym-members/${athleteToDelete.id}/`)
      fetchAthletes()
      showSuccess('Atleta dado de baja correctamente.')
      setDeleteModalOpen(false)
      setAthleteToDelete(null)
    } catch (error: any) {
      showError(error, 'Error al dar de baja al atleta')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImpersonateStaff = async (staffId: string) => {
    try {
      backupAdminTokens()
      const res: any = await api.post('/api/auth/impersonate-staff/', { staff_id: staffId })
      setTokens(res.access, res.refresh)
      setStoredUser(res.user)
      dispatchAuthEvent()
      if (res.gym_slug) {
        router.push(`/${res.gym_slug}/panel`)
      }
    } catch (e) {
      console.error(e)
      showError(e, 'Error al entrar como este miembro / atleta.')
    }
  }

  const fetchAthletes = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'athlete' }
      })
      setAthletes(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching athletes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAthleteTier = (athlete: User) =>
    athlete.active_membership?.plan_tier ?? null

  const isPremium = (athlete: User) => getAthleteTier(athlete) === 'premium'

  const filteredAthletes = athletes.filter(athlete => {
    if (isCoach && !coachAthleteIds.has(athlete.id)) return false
    if (isNutritionist && !nutriAthleteIds.has(athlete.id)) return false
    return `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.email.toLowerCase().includes(searchTerm.toLowerCase())
  })

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
          {canDeactivate && <Button
            variant="outline"
            className="h-11 px-4 rounded-xl border-slate-200 gap-2"
            onClick={async () => {
              const token = localStorage.getItem('lifefit_access_token')
              const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
              const endpoint = isCoach
                ? '/api/gyms/coach-assignments/export_athletes/'
                : isNutritionist
                  ? '/api/gyms/nutritionist-assignments/export_athletes/'
                  : '/api/gyms/coach-assignments/export_athletes/'
              const res = await fetch(`${base}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `atletas_${new Date().toISOString().slice(0, 10)}.csv`
                a.click(); URL.revokeObjectURL(url)
              }
            }}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>}
          {canDeactivate && <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-xl gap-2 shadow-xl shadow-emerald-600/10 transition-all active:scale-95 font-bold">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Atleta</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-emerald-600 p-8 text-white">
                <DialogTitle className="text-2xl font-bold font-lexend">Registrar Atleta</DialogTitle>
                <DialogDescription className="text-emerald-50/80 font-medium mt-1">
                  Ingresa los datos básicos para el nuevo miembro.
                </DialogDescription>
              </div>
              <form onSubmit={athleteForm.handleSubmit(handleCreateAthlete)} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Nombre</Label>
                    <Input 
                      id="first_name" 
                      placeholder="Juan" 
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      {...athleteForm.register('first_name')}
                    />
                    {athleteForm.formState.errors.first_name && (
                      <p className="text-xs text-rose-500 ml-1">{athleteForm.formState.errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Apellido</Label>
                    <Input 
                      id="last_name" 
                      placeholder="Pérez" 
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      {...athleteForm.register('last_name')}
                    />
                    {athleteForm.formState.errors.last_name && (
                      <p className="text-xs text-rose-500 ml-1">{athleteForm.formState.errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dni" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">DNI / ID</Label>
                    <Input 
                      id="dni" 
                      placeholder="77665544" 
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      {...athleteForm.register('dni')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Celular</Label>
                    <Input 
                      id="phone" 
                      placeholder="999 888 777" 
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      {...athleteForm.register('phone')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Correo Electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="juan@email.com" 
                    className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                    {...athleteForm.register('email')}
                  />
                  {athleteForm.formState.errors.email && (
                    <p className="text-xs text-rose-500 ml-1">{athleteForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="membership_plan_id" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Plan</Label>
                    <Select 
                      value={athleteForm.watch('membership_plan_id')} 
                      onValueChange={(value) => athleteForm.setValue('membership_plan_id', value)}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10 bg-white">
                        <SelectValue placeholder="Sin plan" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                        {membershipPlans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)} className="rounded-xl py-3 cursor-pointer">
                            {plan.name} — S/{plan.price}
                          </SelectItem>
                        ))}
                        {membershipPlans.length === 0 && (
                          <SelectItem value="none" disabled className="text-slate-400">
                            No hay planes disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Inicio</Label>
                    <Input 
                      id="start_date" 
                      type="date"
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      {...athleteForm.register('start_date')}
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>}
        </div>
      </div>

      {canDeactivate && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-semibold text-emerald-800">{selectedIds.size} seleccionados</span>
          <div className="h-4 w-px bg-emerald-200" />
          {isStaffPage && (
            <>
              <button
                onClick={() => { setAssignAthleteId(null); setAssignModalOpen(true) }}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Asignar Coach
              </button>
              <button
                onClick={() => { setNutriAssignModalOpen(true) }}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Asignar Nutricionista
              </button>
              <div className="h-4 w-px bg-emerald-200" />
            </>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 ml-auto"
          >
            Limpiar
          </button>
        </div>
      )}


      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="animate-pulse font-bold uppercase text-xs tracking-widest text-slate-400 font-lexend">Sincronizando Base de Datos...</p>
            </div>
          ) : filteredAthletes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      {canDeactivate && <th className="px-4 py-5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredAthletes.length && filteredAthletes.length > 0}
                          onChange={() => {
                            if (selectedIds.size === filteredAthletes.length) { setSelectedIds(new Set()); return }
                            setSelectedIds(new Set(filteredAthletes.map(a => a.id)))
                          }}
                          className="w-4 h-4 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>}
                      <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Atleta</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Contacto</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Plan de Suscripción</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Coach Asignado</th>
                    {isStaffPage && <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Nutricionista</th>}
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Rendimiento</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Registro</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAthletes.map((athlete) => (
                    <tr
                      key={athlete.id}
                      className={`hover:bg-slate-50/80 transition-all group ${selectedIds.has(athlete.id) ? 'bg-emerald-50/50' : ''} cursor-pointer`}
                      onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${athlete.id}`)}
                    >
                      {canDeactivate && <td className="px-4 py-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(athlete.id)}
                          onChange={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              if (next.has(athlete.id)) next.delete(athlete.id); else next.add(athlete.id)
                              return next
                            })
                          }}
                          className="w-4 h-4 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {athlete.first_name[0]}{athlete.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">{athlete.first_name} {athlete.last_name}</div>
                            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Miembro Activo</div>
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
                        {athlete.active_membership ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`capitalize px-3 py-1 font-semibold w-fit ${
                                athlete.active_membership.status === 'active'
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                  : athlete.active_membership.status === 'expired'
                                  ? 'border-rose-200 text-rose-700 bg-rose-50'
                                  : 'border-slate-200 text-slate-600'
                              }`}>
                                {athlete.active_membership.plan_name || 'Sin Plan'}
                              </Badge>
                              {isPremium(athlete) ? (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-2 py-0.5 text-[10px] font-bold gap-1">
                                  <Star className="w-2.5 h-2.5" /> Premium
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-slate-200 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                                  Básico
                                </Badge>
                              )}
                            </div>
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${
                              athlete.active_membership.status === 'active' ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              {athlete.active_membership.status === 'active'
                                ? `${athlete.active_membership.days_remaining ?? '?'} días restantes`
                                : athlete.active_membership.status}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-400 font-medium">Sin Plan</span>
                            <Badge variant="outline" className="border-slate-200 text-slate-400 px-2 py-0.5 text-[10px] font-bold w-fit">
                              Básico
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {assignments[athlete.id] ? (
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 px-3 py-1 font-semibold">
                              <UserCheck className="w-3 h-3 mr-1" />
                              {assignments[athlete.id]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      {isStaffPage && <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {nutritionAssignments[athlete.id] ? (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 px-3 py-1 font-semibold">
                              <Apple className="w-3 h-3 mr-1" />
                              {nutritionAssignments[athlete.id]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Sin asignar</span>
                          )}
                        </div>
                      </td>}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{athlete.puntos} PTS</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {athlete.date_joined ? new Date(athlete.date_joined).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canDeactivate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleImpersonateStaff(athlete.id)}
                              className="h-10 px-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Ver perspectiva de este atleta"
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all">
                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 shadow-2xl border-none rounded-2xl bg-white">
                              <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2">Opciones de Atleta</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              {canDeactivate && (
                                <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50" onClick={() => handleImpersonateStaff(athlete.id)}>
                                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-slate-700 text-sm">Entrar como Atleta</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-slate-50"
                                onClick={() => router.push(`/${gymId}/panel/gestion/atletas/${athlete.id}`)}>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                  <Edit className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Ver Perfil</span>
                              </DropdownMenuItem>
                              {isStaffPage && (
                                <>
                                  <DropdownMenuItem
                                    className={`gap-3 py-3 rounded-xl ${isPremium(athlete) ? 'cursor-pointer hover:bg-purple-50' : 'opacity-50 cursor-not-allowed'} group/item`}
                                    disabled={!isPremium(athlete)}
                                    onClick={() => {
                                      if (!isPremium(athlete)) return
                                      setAssignAthleteId(athlete.id)
                                      setSelectedCoach('')
                                      setAssignModalOpen(true)
                                    }}
                                  >
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover/item:bg-purple-600 group-hover/item:text-white transition-colors">
                                      {isPremium(athlete) ? <UserCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    </div>
                                    <div>
                                      <span className="font-bold text-sm text-slate-700">Asignar Coach</span>
                                      {!isPremium(athlete) && <p className="text-[10px] text-slate-400">Requiere Plan Premium</p>}
                                    </div>
                                  </DropdownMenuItem>
                                  {assignments[athlete.id] && (
                                    <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-rose-50 group/item text-rose-600"
                                      onClick={() => handleRemoveAssignment(athlete.id)}
                                    >
                                      <div className="p-2 bg-rose-50 rounded-lg group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                      </div>
                                      <span className="font-bold text-sm">Quitar Coach</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              {isStaffPage && (
                                <>
                                  <DropdownMenuItem
                                    className={`gap-3 py-3 rounded-xl ${isPremium(athlete) ? 'cursor-pointer hover:bg-amber-50' : 'opacity-50 cursor-not-allowed'} group/item`}
                                    disabled={!isPremium(athlete)}
                                    onClick={() => {
                                      if (!isPremium(athlete)) return
                                      setAssignAthleteId(athlete.id)
                                      setSelectedNutritionist('')
                                      setNutriAssignModalOpen(true)
                                    }}
                                  >
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover/item:bg-amber-600 group-hover/item:text-white transition-colors">
                                      {isPremium(athlete) ? <Apple className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    </div>
                                    <div>
                                      <span className="font-bold text-sm text-slate-700">Asignar Nutricionista</span>
                                      {!isPremium(athlete) && <p className="text-[10px] text-slate-400">Requiere Plan Premium</p>}
                                    </div>
                                  </DropdownMenuItem>
                                  {nutritionAssignments[athlete.id] && (
                                    <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-rose-50 group/item text-rose-600"
                                      onClick={() => handleRemoveNutritionAssignment(athlete.id)}
                                    >
                                      <div className="p-2 bg-rose-50 rounded-lg group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                      </div>
                                      <span className="font-bold text-sm">Quitar Nutricionista</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              {canDeactivate && (
                                <DropdownMenuItem className="gap-3 py-3 rounded-xl cursor-pointer hover:bg-rose-50 group/item text-rose-600"
                                  onClick={() => handleDeactivateAthlete(athlete.id)}>
                                  <div className="p-2 bg-rose-50 rounded-lg group-hover/item:bg-rose-600 group-hover/item:text-white transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-sm">Dar de Baja</span>
                                </DropdownMenuItem>
                              )}
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

      <Dialog open={nutriAssignModalOpen} onOpenChange={setNutriAssignModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-amber-600 p-8 text-white">
            <DialogTitle className="text-2xl font-bold font-lexend">Asignar Nutricionista</DialogTitle>
            <DialogDescription className="text-amber-50/80 font-medium mt-1">
              Selecciona un nutricionista para este atleta.
            </DialogDescription>
          </div>
          <div className="p-8 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Nutricionista</Label>
              <Select value={selectedNutritionist} onValueChange={setSelectedNutritionist}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11 focus:ring-amber-500/10 bg-white">
                  <SelectValue placeholder="Selecciona un nutricionista" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                  {nutritionists.map((nutri) => (
                    <SelectItem key={nutri.id} value={nutri.id} className="rounded-xl py-3 cursor-pointer">
                      {nutri.first_name} {nutri.last_name}
                    </SelectItem>
                  ))}
                  {nutritionists.length === 0 && (
                    <SelectItem value="none" disabled className="text-slate-400">
                      No hay nutricionistas disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                onClick={() => setNutriAssignModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-95"
                disabled={!selectedNutritionist || isAssigningNutri}
                onClick={handleAssignNutritionist}
              >
                {isAssigningNutri ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Asignar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal — Confirmar baja de atleta */}
      <Dialog open={deleteModalOpen} onOpenChange={open => { if (!isDeleting) setDeleteModalOpen(open) }}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          {/* Cabecera roja */}
          <div className="bg-rose-600 px-8 pt-8 pb-6 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold leading-tight">
              Dar de baja al atleta
            </DialogTitle>
            <DialogDescription className="text-rose-100 mt-1 font-medium">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </div>

          {/* Cuerpo */}
          <div className="px-8 py-6 space-y-5">
            {athleteToDelete && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-bold text-rose-600 text-sm flex-shrink-0">
                  {athleteToDelete.first_name?.charAt(0)}{athleteToDelete.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {athleteToDelete.first_name} {athleteToDelete.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{athleteToDelete.email}</p>
                </div>
              </div>
            )}

            <p className="text-sm text-slate-600 leading-relaxed">
              Al confirmar, se <strong>cancelará su suscripción activa</strong> y el atleta
              perderá acceso al gimnasio. Su historial de datos se conservará.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                onClick={confirmDeleteAthlete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : 'Sí, dar de baja'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-purple-600 p-8 text-white">
            <DialogTitle className="text-2xl font-bold font-lexend">Asignar Coach</DialogTitle>
            <DialogDescription className="text-purple-50/80 font-medium mt-1">
              Selecciona un coach para este atleta.
            </DialogDescription>
          </div>
          <div className="p-8 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Coach</Label>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11 focus:ring-purple-500/10 bg-white">
                  <SelectValue placeholder="Selecciona un coach" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id} className="rounded-xl py-3 cursor-pointer">
                      {coach.first_name} {coach.last_name}
                    </SelectItem>
                  ))}
                  {coaches.length === 0 && (
                    <SelectItem value="none" disabled className="text-slate-400">
                      No hay coaches disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                disabled={!selectedCoach || isAssigning}
                onClick={handleAssignCoach}
              >
                {isAssigning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Asignar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
