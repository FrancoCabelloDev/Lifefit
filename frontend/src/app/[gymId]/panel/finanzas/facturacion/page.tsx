'use client'

import { useEffect, useState, use, useCallback } from 'react'
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign,
  CreditCard, Search, Calendar,
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
import { api } from '@/lib/api'
import { showError } from '@/lib/toast'
import type {
  GymPayment, GymPaymentMetrics, GymPaymentStatus,
  RevenuePoint, PaginatedResponse,
} from '@/lib/types'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  success: { label: 'Pagado', class: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Fallido', class: 'bg-red-100 text-red-800' },
  refunded: { label: 'Reembolsado', class: 'bg-slate-100 text-slate-800' },
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
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Ingresos Mensuales</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
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

export default function FacturacionPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [metrics, setMetrics] = useState<GymPaymentMetrics | null>(null)
  const [payments, setPayments] = useState<GymPayment[]>([])
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const pageSize = 15

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(pageSize) }
      if (statusFilter) params.status = statusFilter

      const [metricsData, paymentsData, revenueData] = await Promise.all([
        api.get<GymPaymentMetrics>('/api/gyms/payments/metrics/'),
        api.get<PaginatedResponse<GymPayment>>('/api/gyms/payments/', { params }),
        api.get<RevenuePoint[]>('/api/gyms/payments/revenue_history/'),
      ])

      setMetrics(metricsData)
      setPayments(paymentsData.results || [])
      setTotalPages(Math.ceil((paymentsData.count || 0) / pageSize))
      setRevenueData(revenueData)
    } catch (err) {
      showError(err, 'Error al cargar los datos de facturación')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => { setPage(1) }, [statusFilter])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Facturación</h1>
        <p className="text-slate-500 mt-1">Historial de pagos e ingresos del gimnasio.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-slate-200 shadow-sm">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-emerald-100">Total Cobrado</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatPrice(metrics?.total_collected || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Este Mes</CardTitle>
                <CreditCard className="w-4 h-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {formatPrice(metrics?.this_month || 0)}
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
                  {metrics?.pending_count ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pagos pendientes</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Fallidos</CardTitle>
                <TrendingUp className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {metrics?.failed_count ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pagos fallidos</p>
              </CardContent>
            </Card>
          </div>

          <RevenueChart data={revenueData} />

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg text-slate-800">Historial de Pagos</CardTitle>
                <CardDescription>Todas las transacciones registradas.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-32">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Pagado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
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
                    Los pagos aparecerán aquí cuando los atletas realicen sus pagos de membresía.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-medium">Atleta</th>
                        <th className="px-6 py-4 font-medium">Plan</th>
                        <th className="px-6 py-4 font-medium">Monto</th>
                        <th className="px-6 py-4 font-medium">Estado</th>
                        <th className="px-6 py-4 font-medium">Fecha</th>
                        <th className="px-6 py-4 font-medium">Método</th>
                        <th className="px-6 py-4 font-medium">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{payment.athlete_name || '—'}</td>
                          <td className="px-6 py-4 text-slate-600">{payment.plan_name || '—'}</td>
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
                          <td className="px-6 py-4 text-slate-500 capitalize">{payment.payment_method}</td>
                          <td className="px-6 py-4 text-slate-500 font-mono">{payment.reference || '—'}</td>
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
