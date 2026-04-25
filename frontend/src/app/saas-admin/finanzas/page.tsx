'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, ArrowUpRight, DollarSign, CreditCard } from 'lucide-react'

// Mock Data
const MOCK_TRANSACTIONS = [
  { id: 1, gym: 'Iron Peak Fitness', plan: 'Plan Pro ($199/mes)', date: '25 Abr 2024', status: 'Pagado' },
  { id: 2, gym: 'Zenith Studio', plan: 'Plan Starter ($99/mes)', date: '24 Abr 2024', status: 'Pagado' },
  { id: 3, gym: 'Urban Fit Base', plan: 'Plan Enterprise ($499/mes)', date: '23 Abr 2024', status: 'Pendiente' },
  { id: 4, gym: 'CrossBox Alpha', plan: 'Plan Pro ($199/mes)', date: '21 Abr 2024', status: 'Pagado' },
]

export default function FinancesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Finanzas y Suscripciones</h1>
          <p className="text-slate-500 mt-1">Monitoriza el MRR (Ingresos Mensuales Recurrentes) y el flujo de caja del SaaS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">MRR Actual</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">$12,450</div>
            <p className="text-xs text-emerald-200 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +14% respecto al mes pasado
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">ARR Proyectado (Anual)</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">$149,400</div>
            <p className="text-xs text-slate-500 mt-1">
              Basado en suscripciones activas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tickets Promedio</CardTitle>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">$259</div>
            <p className="text-xs text-slate-500 mt-1">
              Ingreso promedio por gimnasio
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg text-slate-800">Últimos Pagos de Gimnasios</CardTitle>
          <CardDescription>Historial reciente de facturación B2B simulado.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Gimnasio Cliente</th>
                  <th className="px-6 py-4 font-medium">Plan Suscrito</th>
                  <th className="px-6 py-4 font-medium">Fecha Facturación</th>
                  <th className="px-6 py-4 font-medium">Estado del Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{tx.gym}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.plan}</td>
                    <td className="px-6 py-4 text-slate-500">{tx.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
