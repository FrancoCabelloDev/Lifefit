'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText, Search, Plus, MoreHorizontal, Eye, Package, RotateCcw, XCircle, CreditCard
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import type { Subscription, SubscriptionPlan, PaginatedResponse, Gym } from '@/lib/types'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: 'Activa', class: 'bg-emerald-100 text-emerald-800' },
  past_due: { label: 'Atrasada', class: 'bg-amber-100 text-amber-800' },
  canceled: { label: 'Cancelada', class: 'bg-red-100 text-red-800' },
  incomplete: { label: 'Incompleta', class: 'bg-slate-100 text-slate-600' },
}

export default function SuscripcionesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [gyms, setGyms] = useState<Gym[]>([])
  const [metrics, setMetrics] = useState({
    active: 0,
    past_due: 0,
    canceled: 0,
    mrr: 0,
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const search = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || ''
  const planFilter = searchParams.get('plan') || ''

  // Modales states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [form, setForm] = useState({
    owner_gym: '',
    plan: '',
    start_date: new Date().toISOString().split('T')[0],
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  const [newPlanId, setNewPlanId] = useState('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (planFilter) params.plan = planFilter

      const [subsData, plansData] = await Promise.all([
        api.get<PaginatedResponse<Subscription>>('/api/subscriptions/subscriptions/', { params }),
        api.get<PaginatedResponse<SubscriptionPlan>>('/api/subscriptions/plans/'),
      ])

      setSubscriptions(subsData.results)
      setTotalPages(Math.ceil(subsData.count / 20))
      setPlans(plansData.results || [])

      // Calculate simple metrics from current page or would ideally be a separate endpoint
      // For now we just use the loaded data or a dedicated analytics endpoint.
      // Assuming a dedicated endpoint isn't fully ready yet, we will just use the loaded data for the demo.
      // In a real scenario, this should come from a /metrics endpoint.
      let active = 0, past_due = 0, canceled = 0, mrr = 0
      subsData.results.forEach(sub => {
        if (sub.status === 'active') {
          active++
          mrr += parseFloat(sub.plan_detail.price)
        }
        if (sub.status === 'past_due') past_due++
        if (sub.status === 'canceled') canceled++
      })
      setMetrics({ active, past_due, canceled, mrr })
      
    } catch {
      setError('Error al cargar datos. Verifica que el servidor esté funcionando.')
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, planFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const loadGyms = async () => {
    try {
      const res = await api.get<PaginatedResponse<Gym>>('/api/gyms/gyms/')
      setGyms(res.results || [])
    } catch (err) {
      console.error('Failed to load gyms', err)
    }
  }

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/panel-saas/suscripciones?${params.toString()}`)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/subscriptions/subscriptions/', form)
      setIsCreateOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Error al crear suscripción')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSub || !newPlanId) return
    setSaving(true)
    try {
      await api.post(`/api/subscriptions/subscriptions/${selectedSub.id}/change_plan/`, {
        plan_id: newPlanId
      })
      setIsChangePlanOpen(false)
      setIsDetailOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Error al cambiar plan')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedSub) return
    if (!confirm('¿Seguro que deseas cancelar esta suscripción al final del período?')) return
    try {
      await api.post(`/api/subscriptions/subscriptions/${selectedSub.id}/cancel/`)
      setIsDetailOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Error al cancelar suscripción')
    }
  }

  const handleRenew = async () => {
    if (!selectedSub) return
    try {
      await api.post(`/api/subscriptions/subscriptions/${selectedSub.id}/renew/`)
      setIsDetailOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Error al reactivar suscripción')
    }
  }

  const openDetail = (sub: Subscription) => {
    setSelectedSub(sub)
    setIsDetailOpen(true)
  }

  const openChangePlan = (sub?: Subscription) => {
    if (sub) setSelectedSub(sub)
    setNewPlanId('')
    setIsChangePlanOpen(true)
  }

  const selectedPlanPreview = plans.find(p => p.id === form.plan)

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suscripciones</h1>
          <p className="text-slate-500 mt-1">Gestión de contratos y planes de gimnasios.</p>
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suscripciones</h1>
          <p className="text-slate-500 mt-1">Gestión de contratos y planes de gimnasios.</p>
        </div>
        <Button onClick={() => { loadGyms(); setIsCreateOpen(true); }} className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nueva Suscripción
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Activas</CardTitle>
                <FileText className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics.active}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Atrasadas</CardTitle>
                <FileText className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics.past_due}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Canceladas</CardTitle>
                <XCircle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics.canceled}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">MRR (Estimado)</CardTitle>
                <CreditCard className="w-4 h-4 text-indigo-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  S/ {metrics.mrr.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg text-slate-800">Directorio de Suscripciones</CardTitle>
                <CardDescription>Busca y filtra todas las suscripciones.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar gym, plan..."
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
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="past_due">Atrasadas</SelectItem>
                    <SelectItem value="canceled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={planFilter}
                  onValueChange={(v) => updateFilter('plan', v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full sm:w-32">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subscriptions.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center px-4">
                  <FileText className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No hay suscripciones</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md">
                    Las suscripciones vinculan un gimnasio con un plan de precio.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => { loadGyms(); setIsCreateOpen(true); }}>
                    + Crear Primera Suscripción
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-medium">Gimnasio</th>
                        <th className="px-6 py-4 font-medium">Plan</th>
                        <th className="px-6 py-4 font-medium">Estado</th>
                        <th className="px-6 py-4 font-medium">Próx. Pago</th>
                        <th className="px-6 py-4 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subscriptions.map((sub) => (
                        <tr key={sub.id} className="bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openDetail(sub)}>
                          <td className="px-6 py-4 font-medium text-slate-900">{sub.gym_name || '—'}</td>
                          <td className="px-6 py-4 text-slate-600">{sub.plan_detail?.name || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[sub.status]?.class || 'bg-slate-100 text-slate-800'}`}>
                              {STATUS_CONFIG[sub.status]?.label || sub.status}
                            </span>
                            {sub.cancel_at_period_end && <span className="ml-2 text-[10px] text-red-500 uppercase font-bold">Cancela pronto</span>}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('es-PE', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            }) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(sub)}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openChangePlan(sub)}>
                                  <Package className="mr-2 h-4 w-4" /> Cambiar Plan
                                </DropdownMenuItem>
                                {sub.status === 'active' && !sub.cancel_at_period_end && (
                                  <DropdownMenuItem onClick={() => { setSelectedSub(sub); handleCancel(); }} className="text-red-600">
                                    <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                  </DropdownMenuItem>
                                )}
                                {(sub.status === 'canceled' || sub.cancel_at_period_end) && (
                                  <DropdownMenuItem onClick={() => { setSelectedSub(sub); handleRenew(); }} className="text-emerald-600">
                                    <RotateCcw className="mr-2 h-4 w-4" /> Reactivar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Modal: Crear Suscripción */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Suscripción</DialogTitle>
            <DialogDescription>
              Asigna un plan de precio a un gimnasio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Gimnasio</Label>
                <Select value={form.owner_gym} onValueChange={(v) => setForm({...form, owner_gym: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un gimnasio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gyms.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({...form, plan: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — S/ {p.price}/{p.billing_cycle === 'monthly' ? 'mes' : 'año'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPlanPreview && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="font-semibold">{selectedPlanPreview.name}</p>
                  <p className="text-slate-500">{selectedPlanPreview.description}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <span>🏋️ Atletas: {selectedPlanPreview.max_athletes}</span>
                    <span>👨‍🏫 Coaches: {selectedPlanPreview.max_coaches}</span>
                    <span>🍎 Nutricionistas: {selectedPlanPreview.max_nutritionists}</span>
                    <span>💰 S/ {selectedPlanPreview.price}/{selectedPlanPreview.billing_cycle === 'monthly' ? 'mes' : 'año'}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de inicio</Label>
                  <Input type="date" className="mt-1" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} required />
                </div>
                <div>
                  <Label>Próxima facturación</Label>
                  <Input type="date" className="mt-1" value={form.next_billing_date} onChange={(e) => setForm({...form, next_billing_date: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.owner_gym || !form.plan}>
                {saving ? 'Guardando...' : 'Crear Suscripción'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Cambiar Plan */}
      <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Plan</DialogTitle>
            <DialogDescription>
              {selectedSub?.gym_name} — actualmente en {selectedSub?.plan_detail?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePlan}>
            <div className="py-4">
              <Label>Nuevo Plan</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona el nuevo plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active && p.id !== selectedSub?.plan).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — S/ {p.price}/{p.billing_cycle === 'monthly' ? 'mes' : 'año'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                El cambio aplica inmediatamente. La diferencia de precio se prorratea.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChangePlanOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !newPlanId}>
                {saving ? 'Cambiando...' : 'Cambiar Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drawer: Detalle */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedSub?.gym_name}</SheetTitle>
            <SheetDescription>Suscripción desde {selectedSub?.start_date}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Info del plan */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Plan Actual</p>
              <p className="text-2xl font-bold mt-1 text-slate-900">{selectedSub?.plan_detail?.name}</p>
              <p className="text-sm text-slate-500">
                S/ {selectedSub?.plan_detail?.price}/{selectedSub?.plan_detail?.billing_cycle === 'monthly' ? 'mes' : 'año'}
              </p>
            </div>

            {/* Timeline de estados */}
            <div>
              <p className="text-sm font-semibold mb-3 text-slate-700">Línea de Tiempo</p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Creada</p>
                    <p className="text-xs text-slate-500">{new Date(selectedSub?.created_at || '').toLocaleString('es-PE')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    selectedSub?.status === 'active' ? 'bg-emerald-500' :
                    selectedSub?.status === 'past_due' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {STATUS_CONFIG[selectedSub?.status || '']?.label || selectedSub?.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedSub?.cancel_at_period_end ? 'Se cancelará al final del período' : 'Renovación automática activa'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fechas clave */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Inicio</p>
                <p className="font-medium text-slate-900 mt-1">{selectedSub?.start_date}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Fin</p>
                <p className="font-medium text-slate-900 mt-1">{selectedSub?.end_date || '—'}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Próximo pago</p>
                <p className="font-medium text-slate-900 mt-1">{selectedSub?.next_billing_date || '—'}</p>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex flex-col gap-2 pt-4">
              <Button variant="outline" className="w-full justify-start text-slate-700 bg-white" onClick={() => openChangePlan(selectedSub!)}>
                <Package className="mr-2 h-4 w-4" /> Cambiar Plan
              </Button>
              {selectedSub?.status === 'active' && !selectedSub?.cancel_at_period_end && (
                <Button variant="outline" className="w-full justify-start text-red-600 bg-red-50 hover:bg-red-100 border-red-200" onClick={handleCancel}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar al final del período
                </Button>
              )}
              {(selectedSub?.status === 'canceled' || selectedSub?.cancel_at_period_end) && (
                <Button variant="outline" className="w-full justify-start text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200" onClick={handleRenew}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reactivar Suscripción
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
