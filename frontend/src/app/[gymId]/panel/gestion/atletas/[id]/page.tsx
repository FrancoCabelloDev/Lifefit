'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Dumbbell, Apple, Target, Award, Calendar, Zap, TrendingUp, Activity, UserCheck, Medal, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User } from '@/lib/types'
import { ProfileSkeleton } from '@/components/ui/skeletons'

export default function AthleteProfilePage({ params }: { params: Promise<{ gymId: string; id: string }> }) {
  const { gymId, id } = use(params)
  const router = useRouter()
  const storedUser = getStoredUser<User>()
  const isAdmin = storedUser?.role === 'gym_admin' || storedUser?.role === 'super_admin'

  const { data, isLoading } = useQuery({
    queryKey: ['athlete-profile', id],
    queryFn: () => api.get<any>(`/api/gyms/athlete-profile/${id}/`),
  })

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Atleta no encontrado</h2>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    )
  }

  const d = data
  const a = d.athlete
  const s = d.stats

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{a.first_name} {a.last_name}</h1>
          <p className="text-slate-500 mt-1">{a.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl">
                  {a.first_name[0]}{a.last_name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{a.first_name} {a.last_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                      Nivel {a.nivel}
                    </Badge>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 font-bold">
                      {a.puntos} pts
                    </Badge>
                    <Badge className={a.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500'}>
                      {a.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">DNI</p>
                <p className="font-medium text-slate-700">{a.dni || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Celular</p>
                <p className="font-medium text-slate-700">{a.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Miembro desde</p>
                <p className="font-medium text-slate-700">{a.date_joined ? new Date(a.date_joined).toLocaleDateString('es-PE') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Check-ins totales</p>
                <p className="font-medium text-slate-700">{s.checkins_total}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              {d.coach && (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-slate-600">Coach: <strong>{d.coach.name}</strong></span>
                </div>
              )}
              {d.nutritionist && (
                <div className="flex items-center gap-2">
                  <Apple className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-slate-600">Nutricionista: <strong>{d.nutritionist.name}</strong></span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg border-none">
          <CardContent className="p-6">
            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Puntos Totales</p>
            <p className="text-4xl font-bold mt-2">{s.total_points_earned}</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-emerald-100">
                <span>Check-ins este mes</span>
                <span className="font-bold">{s.checkins_month}</span>
              </div>
              <Progress value={Math.min((s.checkins_month / 30) * 100, 100)} className="h-1.5 bg-white/20 [&>div]:bg-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-3">
              <Dumbbell className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.sessions_week}</p>
            <p className="text-xs text-slate-500">Sesiones esta semana</p>
            <p className="text-[10px] text-slate-400">{s.sessions_month} este mes · {s.sessions_total} total</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 mx-auto bg-amber-100 rounded-xl flex items-center justify-center mb-3">
              <Apple className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.meals_week}</p>
            <p className="text-xs text-slate-500">Comidas registradas (7d)</p>
            <p className="text-[10px] text-slate-400">{s.completed_plans} planes completados</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 mx-auto bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.active_challenges}</p>
            <p className="text-xs text-slate-500">Retos activos</p>
            <p className="text-[10px] text-slate-400">Participaciones vigentes</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 mx-auto bg-rose-100 rounded-xl flex items-center justify-center mb-3">
              <Award className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.badges_earned}</p>
            <p className="text-xs text-slate-500">Insignias ganadas</p>
            <p className="text-[10px] text-slate-400">Logros desbloqueados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {d.routine && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">Rutina Activa</CardTitle>
                  <CardDescription>Asignada por {d.routine.assigned_by || 'el sistema'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-lg">{d.routine.name}</p>
                  <p className="text-sm text-slate-500">Inicio: {d.routine.start_date ? new Date(d.routine.start_date).toLocaleDateString('es-PE') : '—'}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push(`/${gymId}/panel/entrenamiento/rutinas`)}>
                  Ver rutina
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {d.nutrition_plan && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-800">Plan Nutricional</CardTitle>
                  <CardDescription>Asignado por {d.nutrition_plan.assigned_by || 'el sistema'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-900 text-lg">{d.nutrition_plan.name}</p>
                  <p className="text-sm text-slate-500">Inicio: {d.nutrition_plan.start_date ? new Date(d.nutrition_plan.start_date).toLocaleDateString('es-PE') : '—'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cumplimiento</span>
                  <span className={`font-bold ${d.nutrition_plan.compliance_percentage >= 80 ? 'text-emerald-600' : d.nutrition_plan.compliance_percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {d.nutrition_plan.compliance_percentage}%
                  </span>
                </div>
                <Progress value={d.nutrition_plan.compliance_percentage} className={`h-2 ${d.nutrition_plan.compliance_percentage >= 80 ? '[&>div]:bg-emerald-500' : d.nutrition_plan.compliance_percentage >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500'}`} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {d.points_history && d.points_history.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">Historial de Puntos</CardTitle>
                <CardDescription>Últimas 20 transacciones</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase">Fecha</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase">Descripción</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase">Fuente</th>
                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.points_history.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(p.created_at).toLocaleDateString('es-PE')}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.description || '—'}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] capitalize border-slate-200 text-slate-500">
                          {p.source?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-emerald-600">+{p.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
