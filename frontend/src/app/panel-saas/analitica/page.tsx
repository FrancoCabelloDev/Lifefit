'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Dumbbell, ArrowUpRight } from 'lucide-react'
import { api } from '@/lib/api'

interface ChartDataPoint {
  date: string;
  workouts: number;
}

interface UsageAnalytics {
  workoutsToday: number;
  workoutsThisWeek: number;
  chartData: ChartDataPoint[];
}

export default function AnaliticaPage() {
  const [data, setData] = useState<UsageAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/api/system/analytics/usage/')
        setData(res as any)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading || !data) {
    return <div className="p-8 text-slate-500">Cargando analítica de uso...</div>
  }

  // Find max workouts to scale the bars
  const maxWorkouts = Math.max(...data.chartData.map(d => d.workouts), 10) // minimum scale of 10

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analítica de Uso</h1>
          <p className="text-slate-500 mt-1">Métricas de interacción y uso de la plataforma por parte de los atletas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Entrenamientos Completados (Hoy)</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data.workoutsToday.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              Sesiones finalizadas en toda la plataforma hoy
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Entrenamientos Completados (Esta Semana)</CardTitle>
            <Dumbbell className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data.workoutsThisWeek.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              Tendencia positiva
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Volumen de Entrenamientos (Últimos 7 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-2 pt-4">
            {data.chartData.map((point, index) => {
              const heightPercentage = (point.workouts / maxWorkouts) * 100
              return (
                <div key={index} className="flex-1 flex flex-col justify-end items-center group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-xs px-2 py-1 rounded">
                    {point.workouts}
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-colors"
                    style={{ height: `${Math.max(heightPercentage, 2)}%` }} // minimum 2% height for visibility
                  ></div>
                  {/* Label */}
                  <span className="text-xs text-slate-500 mt-2 rotate-45 sm:rotate-0 origin-left">
                    {point.date}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
