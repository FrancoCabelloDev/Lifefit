'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Dumbbell, Building2, Users, TrendingUp, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

interface ChartDataPoint {
  date: string
  workouts: number
}

interface UsageAnalytics {
  workoutsToday: number
  workoutsThisWeek: number
  chartData: ChartDataPoint[]
}

interface RoleCount {
  role: string
  label: string
  count: number
}

interface Engagement {
  checkins: { dau: number; wau: number; mau: number }
  workouts: { dau: number; mau: number }
}

export default function AnaliticaPage() {
  const [usage, setUsage] = useState<UsageAnalytics | null>(null)
  const [gyms, setGyms] = useState<{ month: string; count: number }[]>([])
  const [roles, setRoles] = useState<RoleCount[]>([])
  const [engagement, setEngagement] = useState<Engagement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usageRes, gymsRes, rolesRes, engagementRes] = await Promise.all([
          api.get('/api/system/analytics/usage/'),
          api.get('/api/system/analytics/gyms/'),
          api.get('/api/system/analytics/users/'),
          api.get('/api/system/analytics/engagement/'),
        ])
        setUsage(usageRes as any)
        setGyms(gymsRes as any)
        setRoles(rolesRes as any)
        setEngagement(engagementRes as any)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading || !usage) {
    return <div className="p-8 text-slate-500">Cargando analítica de uso...</div>
  }

  const maxWorkouts = Math.max(...usage.chartData.map(d => d.workouts), 10)
  const totalUsers = roles.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analítica de Uso</h1>
          <p className="text-slate-500 mt-1">Métricas de interacción y uso de la plataforma por parte de los atletas.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Entrenamientos (Hoy)</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{usage.workoutsToday.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Entrenamientos (Semana)</CardTitle>
            <Dumbbell className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{usage.workoutsThisWeek.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Check-ins DAU</CardTitle>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{engagement?.checkins.dau ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">MAU: {engagement?.checkins.mau ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Usuarios</CardTitle>
            <Users className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workouts 7-day chart */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Volumen de Entrenamientos (Últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage.chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="workouts" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Users by role pie */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Usuarios por Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roles}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {roles.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {roles.map((r, i) => (
                <div key={r.role} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {r.label}: {r.count}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gym creation history + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Gimnasios Creados por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gyms}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(v) => {
                    const [, m] = v.split('-')
                    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
                    return months[parseInt(m) - 1] || v
                  }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Engagement (Usuarios Activos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Check-ins\nDAU', value: engagement?.checkins.dau ?? 0 },
                    { name: 'Check-ins\nWAU', value: engagement?.checkins.wau ?? 0 },
                    { name: 'Check-ins\nMAU', value: engagement?.checkins.mau ?? 0 },
                    { name: 'Workouts\nDAU', value: engagement?.workouts.dau ?? 0 },
                    { name: 'Workouts\nMAU', value: engagement?.workouts.mau ?? 0 },
                  ]}
                  layout="vertical"
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
