'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Dumbbell, Activity, TrendingUp, Calendar, CreditCard } from 'lucide-react'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, Gym, PaginatedResponse } from '@/lib/types'

export default function GymAdminDashboard() {
  const [gymName, setGymName] = useState('tu Gimnasio')
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const user = getStoredUser<User>()
    if (user) {
      setAdminName(user.first_name || 'Admin')
    }

    const fetchGymData = async () => {
      try {
        const data = await api.get<PaginatedResponse<Gym>>("/api/gyms/gyms/")
        const myGym = data.results?.[0] || (Array.isArray(data) ? data[0] : null)
        if (myGym) {
          setGymName(myGym.name)
        }
      } catch (error) {
        console.error("Error fetching gym", error)
      }
    }

    fetchGymData()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Hola, {adminName} 👋
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Este es el resumen general de <span className="font-semibold text-emerald-700">{gymName}</span>.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI: Atletas Activos */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Atletas Activos</p>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">0</h2>
              <span className="text-xs font-medium text-emerald-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> +0%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Nuevos este mes: 0</p>
          </CardContent>
        </Card>

        {/* KPI: Coaches */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Staff & Coaches</p>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">0</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Activos en plataforma</p>
          </CardContent>
        </Card>

        {/* KPI: Retención simulada */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Asistencia Hoy</p>
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">0</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Check-ins registrados</p>
          </CardContent>
        </Card>

        {/* KPI: Ingresos (Si es que aplica) */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Membresías al día</p>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-900">0%</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Tasa de morosidad: 0%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Actividad Reciente</CardTitle>
            <CardDescription>Eventos y notificaciones de tu gimnasio</CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center text-slate-500 py-12">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>Todavía no hay actividad registrada.</p>
            <p className="text-sm mt-1">Comienza añadiendo atletas a tu gimnasio.</p>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Atletas Destacados</CardTitle>
            <CardDescription>Top 3 atletas del mes según sistema de puntos</CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center text-slate-500 py-12">
            <p>Módulo de Ranking vacío.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
