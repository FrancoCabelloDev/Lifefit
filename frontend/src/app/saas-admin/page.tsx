'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Building2, Users } from 'lucide-react'

const MOCK_METRICS = {
  mrr: '$12,450',
  mrrGrowth: '+14%',
  activeGyms: 48,
  activeGymsGrowth: '+3 este mes',
  totalAthletes: 12450,
  totalAthletesGrowth: '+850 esta semana'
}

export default function SaaSAdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Resumen General</h1>
          <p className="text-slate-500 mt-1">Métricas clave de tu negocio SaaS y gestión de clientes.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ingresos Recurrentes (MRR)</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{MOCK_METRICS.mrr}</div>
            <p className="text-xs text-emerald-600 mt-1 font-medium bg-emerald-50 inline-flex px-2 py-0.5 rounded-full">
              {MOCK_METRICS.mrrGrowth} respecto al mes pasado
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Gimnasios Activos</CardTitle>
            <Building2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{MOCK_METRICS.activeGyms}</div>
            <p className="text-xs text-slate-500 mt-1">
              {MOCK_METRICS.activeGymsGrowth}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Atletas Globales</CardTitle>
            <Users className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{MOCK_METRICS.totalAthletes.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              {MOCK_METRICS.totalAthletesGrowth}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
