'use client'

import { useEffect, useState } from 'react'
import { Users, UserCheck, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import StaffList from '@/components/team/StaffList'
import { api } from '@/lib/api'
import type { CoachAssignment } from '@/lib/types'

export default function CoachesPage() {
  const [assignments, setAssignments] = useState<CoachAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const data = await api.get<any>("/api/gyms/coach-assignments/")
      setAssignments(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <StaffList
        role="coach"
        title="Cuerpo Técnico"
        description="Gestiona a los entrenadores encargados de las rutinas y el progreso de los atletas."
      />

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
        <CardHeader className="border-b border-slate-100 pb-4 px-8 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 font-lexend">
                Asignaciones Coach-Atleta
              </CardTitle>
              <p className="text-sm text-slate-500">Lista de atletas asignados a cada coach</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Users className="w-12 h-12 text-slate-200" />
              <p className="font-bold text-slate-400">Sin asignaciones</p>
              <p className="text-sm text-slate-400">Asigna atletas a coaches desde la gestión de atletas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Coach</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Atleta Asignado</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Estado</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900">{a.coach_name}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-medium text-slate-700">{a.athlete_name}</div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge className={a.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500'}>
                          {a.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm text-slate-500">
                          {new Date(a.assigned_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
