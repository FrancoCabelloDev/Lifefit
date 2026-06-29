'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign,
  CreditCard, Search, Building2, Calendar, Download,
} from 'lucide-react'
import {
  Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api, downloadFile } from '@/lib/api'
import type { Payment, PaymentMetrics, RevenuePoint, PaginatedResponse } from '@/lib/types'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  success: { label: 'Pagado', class: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Fallido', class: 'bg-red-100 text-red-800' },
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

function formatPrice(value: number) {
  return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos Mensuales</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) => MONTH_LABELS[m.split('-')[1]] || m}
                className="text-xs text-slate-500"
              />
              <YAxis
                tickFormatter={formatPrice}
                className="text-xs text-slate-500"
                width={80}
              />
              <Tooltip
                formatter={(value: any) => [formatPrice(Number(value)), 'Ingresos']}
                labelFormatter={(label: any) => {
                  const labelStr = String(label || '')
                  if (!labelStr.includes('-')) return labelStr
                  const [y, m] = labelStr.split('-')
                  return `${MONTH_LABELS[m] || m} ${y}`
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 4, fill: '#059669' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FinancesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const search = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || ''

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter

      const [metricsData, paymentsData, revenueData] = await Promise.all([
        api.get<PaymentMetrics>('/api/subscriptions/payments/metrics/'),
        api.get<PaginatedResponse<Payment>>('/api/subscriptions/payments/', { params }),
        api.get<RevenuePoint[]>('/api/subscriptions/payments/revenue_history/'),
      ])

      setMetrics(metricsData)
      setPayments(paymentsData.results)
      setTotalPages(Math.ceil(paymentsData.count / 20))
      setRevenueData(revenueData)
    } catch {
      setError('Error al cargar datos de facturación. Verifica que el servidor esté funcionando.')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/panel-saas/finanzas?${params.toString()}`)
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Facturación</h1>
          <p className="text-slate-500 mt-1">Historial de pagos e ingresos del SaaS.</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Facturación</h1>
          <p className="text-slate-500 mt-1">Historial de pagos e ingresos del SaaS.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-emerald-100">MRR</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatPrice(metrics?.mrr || 0)}
                </div>
                {metrics && metrics.mrr_change !== 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${metrics.mrr_change > 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                    {metrics.mrr_change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(metrics.mrr_change)}% vs mes anterior
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">ARR</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {formatPrice(metrics?.arr || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Proyectado anual</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Este Mes</CardTitle>
                <CreditCard className="w-4 h-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {formatPrice(metrics?.monthly_income || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Ingresos del mes</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Pendientes</CardTitle>
                <Calendar className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {metrics?.pending_payments ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pagos pendientes</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Gimnasios</CardTitle>
                <Building2 className="w-4 h-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {metrics?.total_gyms_with_subscriptions ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Con suscripción activa</p>
              </CardContent>
            </Card>
          </div>

          <RevenueChart data={revenueData} />

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg text-slate-800">Historial de Pagos</CardTitle>
                <CardDescription>Todas las transacciones registradas en el sistema.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar gym, plan, ID..."
                    className="pl-8 h-9 w-full sm:w-48"
                    defaultValue={search}
                    onBlur={(e) => updateFilter('search', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateFilter('search', (e.target as HTMLInputElement).value)
                    }}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-32">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Pagado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center px-4">
                  <CreditCard className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No hay pagos registrados</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md">
                    Los pagos aparecerán aquí cuando los gimnasios realicen sus pagos de suscripción.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-medium">Gimnasio</th>
                        <th className="px-6 py-4 font-medium">Plan</th>
                        <th className="px-6 py-4 font-medium">Monto</th>
                        <th className="px-6 py-4 font-medium">Estado</th>
                        <th className="px-6 py-4 font-medium">Fecha</th>
                        <th className="px-6 py-4 font-medium">Proveedor</th>
                        <th className="px-6 py-4 font-medium">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{payment.gym_name}</td>
                          <td className="px-6 py-4 text-slate-600">{payment.plan_name}</td>
                          <td className="px-6 py-4 text-slate-900 font-medium">S/ {parseFloat(payment.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[payment.status]?.class || 'bg-slate-100 text-slate-800'}`}>
                              {STATUS_CONFIG[payment.status]?.label || payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(payment.paid_at).toLocaleDateString('es-PE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-slate-500 capitalize">{payment.provider}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => downloadFile(
                                `/api/subscriptions/payments/${payment.id}/invoice/`,
                                `comprobante-lifefit-${payment.id.slice(0, 8)}.pdf`
                              )}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 active:scale-[0.97] transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-sm text-slate-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
