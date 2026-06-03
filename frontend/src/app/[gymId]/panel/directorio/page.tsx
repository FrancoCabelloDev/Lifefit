'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, CheckCircle2, Star, Briefcase, UserCheck,
  Apple, Dumbbell,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { showError, showSuccess } from '@/lib/toast'
import type { User, StaffProfile } from '@/lib/types'

function getInitials(f: string, l: string) {
  return `${f[0] || ''}${l[0] || ''}`.toUpperCase()
}

interface StaffCardProps {
  staff: StaffProfile
  isAssigned: boolean
  onAssign: (id: string) => void
  assigning: boolean
  role: 'coach' | 'nutritionist'
}

function StaffCard({ staff, isAssigned, onAssign, assigning, role }: StaffCardProps) {
  const capacityPct = staff.max_clients > 0
    ? Math.min((staff.current_clients / staff.max_clients) * 100, 100)
    : 0

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:shadow-md ${isAssigned ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-100'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {staff.profile_picture ? (
            <img
              src={staff.profile_picture}
              alt={`${staff.first_name} ${staff.last_name}`}
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xl">
              {getInitials(staff.first_name, staff.last_name)}
            </div>
          )}
          {isAssigned && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-tight">
            {staff.first_name} {staff.last_name}
          </p>
          {staff.specialty && (
            <Badge className="mt-1 bg-slate-100 text-slate-600 border-0 text-[10px] px-2 py-0.5 font-medium">
              {staff.specialty}
            </Badge>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {staff.years_experience != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Star className="w-2.5 h-2.5" /> {staff.years_experience} años
              </span>
            )}
            {!staff.is_available && (
              <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[10px] px-2 py-0">
                Completo
              </Badge>
            )}
            {staff.is_available && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] px-2 py-0">
                Disponible
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {staff.bio ? (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{staff.bio}</p>
      ) : (
        <p className="text-xs text-slate-300 italic">Sin descripción disponible.</p>
      )}

      {/* Capacidad */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Users className="w-2.5 h-2.5" /> Clientes
          </span>
          <span className="text-[10px] font-semibold text-slate-600">
            {staff.current_clients} / {staff.max_clients}
          </span>
        </div>
        <Progress
          value={capacityPct}
          className={`h-1.5 ${capacityPct >= 90 ? '[&>div]:bg-rose-500' : capacityPct >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
        />
      </div>

      {/* Botón */}
      {isAssigned ? (
        <button
          disabled
          className="w-full h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-default"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {role === 'coach' ? 'Tu coach actual' : 'Tu nutricionista actual'}
        </button>
      ) : (
        <button
          disabled={!staff.is_available || assigning}
          onClick={() => onAssign(staff.id)}
          className={`w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            staff.is_available
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {assigning ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : staff.is_available ? (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              Elegirlo
            </>
          ) : (
            'Sin cupo disponible'
          )}
        </button>
      )}
    </div>
  )
}

type TabType = 'coach' | 'nutritionist'

export default function DirectorioPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const queryClient = useQueryClient()
  const user = getStoredUser<User>()
  const [tab, setTab] = useState<TabType>('coach')
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const coachesQuery = useQuery({
    queryKey: ['staff-directory', gymId, 'coach'],
    queryFn: () => api.get<StaffProfile[]>('/api/gyms/staff-directory/', { params: { role: 'coach' } }),
    staleTime: 30000,
  })

  const nutritionistsQuery = useQuery({
    queryKey: ['staff-directory', gymId, 'nutritionist'],
    queryFn: () => api.get<StaffProfile[]>('/api/gyms/staff-directory/', { params: { role: 'nutritionist' } }),
    staleTime: 30000,
  })

  const myAssignmentsQuery = useQuery({
    queryKey: ['my-assignments', gymId],
    queryFn: async () => {
      const [coachData, nutriData] = await Promise.all([
        api.get<any>('/api/gyms/coach-assignments/', { params: { is_active: 'true' } }),
        api.get<any>('/api/gyms/nutritionist-assignments/', { params: { is_active: 'true' } }),
      ])
      const coaches: any[] = Array.isArray(coachData) ? coachData : coachData?.results || []
      const nutris: any[] = Array.isArray(nutriData) ? nutriData : nutriData?.results || []
      return {
        coachId: coaches.find((a: any) => a.is_active)?.coach ?? null,
        nutritionistId: nutris.find((a: any) => a.is_active)?.nutritionist ?? null,
      }
    },
  })

  const assignCoachMutation = useMutation({
    mutationFn: (coachId: string) =>
      api.post('/api/gyms/coach-assignments/self_assign/', { coach_id: coachId }),
    onSuccess: (data: any) => {
      showSuccess(data?.detail || 'Coach asignado correctamente')
      queryClient.invalidateQueries({ queryKey: ['my-assignments', gymId] })
      queryClient.invalidateQueries({ queryKey: ['staff-directory', gymId, 'coach'] })
      queryClient.invalidateQueries({ queryKey: ['athlete-dashboard', gymId] })
    },
    onError: (err: any) => showError(err, 'No se pudo asignar el coach'),
    onSettled: () => setAssigningId(null),
  })

  const assignNutriMutation = useMutation({
    mutationFn: (nutId: string) =>
      api.post('/api/gyms/nutritionist-assignments/self_assign/', { nutritionist_id: nutId }),
    onSuccess: (data: any) => {
      showSuccess(data?.detail || 'Nutricionista asignado correctamente')
      queryClient.invalidateQueries({ queryKey: ['my-assignments', gymId] })
      queryClient.invalidateQueries({ queryKey: ['staff-directory', gymId, 'nutritionist'] })
      queryClient.invalidateQueries({ queryKey: ['athlete-dashboard', gymId] })
    },
    onError: (err: any) => showError(err, 'No se pudo asignar el nutricionista'),
    onSettled: () => setAssigningId(null),
  })

  if (!user || user.role !== 'athlete') return null

  const coaches = coachesQuery.data || []
  const nutritionists = nutritionistsQuery.data || []
  const currentCoachId = myAssignmentsQuery.data?.coachId ?? null
  const currentNutriId = myAssignmentsQuery.data?.nutritionistId ?? null
  const activeList = tab === 'coach' ? coaches : nutritionists
  const isLoading = tab === 'coach' ? coachesQuery.isLoading : nutritionistsQuery.isLoading

  function handleAssign(id: string) {
    setAssigningId(id)
    if (tab === 'coach') assignCoachMutation.mutate(id)
    else assignNutriMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio</h1>
        <p className="text-sm text-slate-500 mt-0.5">Elige tu coach y nutricionista</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setTab('coach')}
          className={`flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-semibold transition-all ${
            tab === 'coach'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          Coaches
          {coaches.length > 0 && (
            <span className={`text-[10px] rounded-full px-1.5 py-0 font-bold ${tab === 'coach' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {coaches.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('nutritionist')}
          className={`flex items-center gap-2 px-5 h-9 rounded-xl text-sm font-semibold transition-all ${
            tab === 'nutritionist'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Apple className="w-4 h-4" />
          Nutricionistas
          {nutritionists.length > 0 && (
            <span className={`text-[10px] rounded-full px-1.5 py-0 font-bold ${tab === 'nutritionist' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {nutritionists.length}
            </span>
          )}
        </button>
      </div>

      {/* Asignación actual */}
      {((tab === 'coach' && currentCoachId) || (tab === 'nutritionist' && currentNutriId)) && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 w-fit">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-medium text-emerald-800">
            Ya tienes {tab === 'coach' ? 'un coach' : 'una nutricionista'} asignado.
            Puedes cambiarlo eligiendo otro de la lista.
          </p>
        </div>
      )}

      {/* Grid de cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="h-12 bg-slate-50 rounded-xl animate-pulse" />
              <div className="h-8 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          <p className="font-medium">No hay {tab === 'coach' ? 'coaches' : 'nutricionistas'} disponibles</p>
          <p className="text-xs mt-1">El gimnasio aún no tiene {tab === 'coach' ? 'coaches' : 'nutricionistas'} registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeList.map(staff => (
            <StaffCard
              key={staff.id}
              staff={staff}
              role={tab}
              isAssigned={tab === 'coach' ? staff.id === currentCoachId : staff.id === currentNutriId}
              onAssign={handleAssign}
              assigning={assigningId === staff.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
