'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText, Search, Plus, MoreHorizontal, Eye, Package,
  RotateCcw, XCircle, CreditCard, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, CheckCircle2, ArrowUpCircle, X,
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
import type { Subscription, SubscriptionPlan, PaginatedResponse, Gym } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  active:     { label: 'Activa',     dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  past_due:   { label: 'Atrasada',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200'     },
  canceled:   { label: 'Cancelada',  dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200'         },
  incomplete: { label: 'Incompleta', dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 border-slate-200'      },
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Subscription Detail Sheet ─────────────────────────────────────────────

type SheetAction = 'idle' | 'change-plan' | 'cancel-confirm'

function SubscriptionSheet({
  sub,
  plans,
  open,
  onClose,
  onRefresh,
}: {
  sub: Subscription | null
  plans: SubscriptionPlan[]
  open: boolean
  onClose: () => void
  onRefresh: () => void
}) {
  const [action, setAction] = useState<SheetAction>('idle')
  const [newPlanId, setNewPlanId] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset inner state when sheet opens with a new sub
  useEffect(() => {
    if (open) { setAction('idle'); setNewPlanId('') }
  }, [open, sub?.id])

  const handleChangePlan = async () => {
    if (!sub || !newPlanId) return
    setSaving(true)
    try {
      await api.post(`/api/subscriptions/subscriptions/${sub.id}/change_plan/`, { plan_id: newPlanId })
      showSuccess('Plan actualizado correctamente')
      onRefresh()
      onClose()
    } catch (err) {
      showError(err, 'Error al cambiar plan')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!sub) return
    setSaving(true)
    try {
      await api.post(`/api/subscriptions/subscriptions/${sub.id}/cancel/`)
      showSuccess('Suscripción cancelada al final del período')
      onRefresh()
      onClose()
    } catch (err) {
      showError(err, 'Error al cancelar')
    } finally {
      setSaving(false)
    }
  }

  const handleRenew = async () => {
    if (!sub) return
    setSaving(true)
    try {
      await api.post(`/api/subscriptions/subscriptions/${sub.id}/renew/`)
      showSuccess('Suscripción reactivada')
      onRefresh()
      onClose()
    } catch (err) {
      showError(err, 'Error al reactivar')
    } finally {
      setSaving(false)
    }
  }

  if (!sub) return null

  const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.incomplete
  const isActive = sub.status === 'active'
  const isCanceled = sub.status === 'canceled'
  const availablePlans = plans.filter(p => p.is_active && p.id !== sub.plan)

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0 overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <SheetTitle className="text-lg font-bold text-slate-900">
                  {sub.gym_name}
                </SheetTitle>
              </div>
              <SheetDescription className="text-xs text-slate-400">
                Suscripción activa desde {fmtDate(sub.start_date)}
              </SheetDescription>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
                {sub.cancel_at_period_end && (
                  <span className="ml-1 font-normal text-rose-500">· cancela pronto</span>
                )}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Plan card */}
          <div className="mx-5 mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan actual</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-bold text-slate-900">{sub.plan_detail?.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  S/ {sub.plan_detail?.price}/{sub.plan_detail?.billing_cycle === 'monthly' ? 'mes' : 'año'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-400">Inicio</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtDate(sub.start_date)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-400">Próx. pago</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtDate(sub.next_billing_date)}</p>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="mx-5 mt-4 space-y-2">

            {/* Cambiar plan — expandible inline */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setAction(a => a === 'change-plan' ? 'idle' : 'change-plan')}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all text-slate-700 font-semibold text-sm"
              >
                <ArrowUpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Cambiar plan</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-300 ml-auto transition-transform duration-200 ${action === 'change-plan' ? 'rotate-180' : ''}`}
                />
              </button>

              {action === 'change-plan' && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white space-y-3">
                  <Select value={newPlanId} onValueChange={setNewPlanId}>
                    <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm">
                      <SelectValue placeholder="Selecciona el nuevo plan..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-1.5">
                      {availablePlans.length === 0
                        ? <div className="py-3 text-center text-xs text-slate-400">No hay otros planes disponibles</div>
                        : availablePlans.map(p => (
                          <SelectItem key={p.id} value={p.id} className="rounded-xl py-2.5 text-sm cursor-pointer">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-slate-400 ml-1.5">
                              S/ {p.price}/{p.billing_cycle === 'monthly' ? 'mes' : 'año'}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    El cambio aplica inmediatamente. La diferencia de precio se prorratea.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAction('idle'); setNewPlanId('') }}
                      className="rounded-xl flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleChangePlan}
                      disabled={saving || !newPlanId}
                      className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-all text-white"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                      Confirmar cambio
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Reactivar — solo si cancelada */}
            {(isCanceled || sub.cancel_at_period_end) && (
              <button
                onClick={handleRenew}
                disabled={saving}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] transition-all text-emerald-700 font-semibold text-sm disabled:opacity-60"
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RotateCcw className="w-4 h-4" />}
                <span>Reactivar suscripción</span>
                <ChevronRight className="w-4 h-4 text-emerald-200 ml-auto" />
              </button>
            )}

            {/* Zona de riesgo — solo si activa */}
            {isActive && !sub.cancel_at_period_end && action !== 'change-plan' && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-300 font-medium">zona de riesgo</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Cancelar — expandible inline */}
                <div className="rounded-2xl border border-rose-100 overflow-hidden">
                  <button
                    onClick={() => setAction(a => a === 'cancel-confirm' ? 'idle' : 'cancel-confirm')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-rose-50 active:scale-[0.99] transition-all text-rose-600 font-semibold text-sm"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Cancelar al final del período</span>
                    <ChevronDown
                      className={`w-4 h-4 text-rose-200 ml-auto transition-transform duration-200 ${action === 'cancel-confirm' ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {action === 'cancel-confirm' && (
                    <div className="px-4 pb-4 pt-1 border-t border-rose-100 bg-rose-50/50 space-y-3">
                      <div className="flex gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-500" />
                        <span>
                          El gimnasio conservará acceso hasta el fin del período actual
                          ({fmtDate(sub.next_billing_date)}). No se realizarán más cobros.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAction('idle')}
                          className="rounded-xl flex-1"
                        >
                          Mantener
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCancel}
                          disabled={saving}
                          className="rounded-xl flex-1 bg-rose-600 hover:bg-rose-700 active:scale-[0.97] transition-all text-white"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                          Sí, cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Plan detail */}
          {sub.plan_detail && (
            <div className="mx-5 mt-5 mb-8 rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Capacidad del plan
              </p>
              {[
                { label: 'Atletas', value: sub.plan_detail.max_athletes },
                { label: 'Coaches', value: sub.plan_detail.max_coaches },
                { label: 'Nutricionistas', value: sub.plan_detail.max_nutritionists },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function SuscripcionesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [gyms, setGyms] = useState<Gym[]>([])
  const [metrics, setMetrics] = useState({ active: 0, past_due: 0, canceled: 0, mrr: 0 })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const search = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || ''
  const planFilter = searchParams.get('plan') || ''

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    owner_gym: '',
    plan: '',
    start_date: new Date().toISOString().split('T')[0],
    next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  })

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

      let active = 0, past_due = 0, canceled = 0, mrr = 0
      subsData.results.forEach(sub => {
        if (sub.status === 'active') { active++; mrr += parseFloat(sub.plan_detail.price) }
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

  useEffect(() => { fetchData() }, [fetchData])

  const loadGyms = async () => {
    try {
      const res = await api.get<PaginatedResponse<Gym>>('/api/gyms/gyms/')
      setGyms(res.results || [])
    } catch { /* silent */ }
  }

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    value ? params.set(key, value) : params.delete(key)
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
      showError(err, 'Error al crear suscripción')
    } finally {
      setSaving(false)
    }
  }

  const openDetail = (sub: Subscription) => {
    setSelectedSub(sub)
    setIsDetailOpen(true)
  }

  const selectedPlanPreview = plans.find(p => p.id === form.plan)

  if (error) return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suscripciones</h1>
        <p className="text-slate-500 mt-1">Gestión de contratos y planes de gimnasios.</p>
      </div>
      <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">{error}</div>
    </div>
  )

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suscripciones</h1>
            <p className="text-slate-500 mt-1">Gestión de contratos y planes de gimnasios.</p>
          </div>
          <Button
            onClick={() => { loadGyms(); setIsCreateOpen(true) }}
            className="bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-transform text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Suscripción
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-28" /></CardContent></Card>
              ))}
            </div>
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Activas',    value: metrics.active,   icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Atrasadas',  value: metrics.past_due, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50'    },
                { label: 'Canceladas', value: metrics.canceled,  icon: XCircle,      color: 'text-rose-600 bg-rose-50'       },
                { label: 'MRR Est.',   value: `S/ ${metrics.mrr.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`, icon: CreditCard, color: 'text-slate-600 bg-slate-100' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border-slate-200 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-900">{value}</p>
                      <p className="text-xs text-slate-400 font-medium">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table */}
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
                      className="pl-8 h-9 w-full sm:w-48 rounded-xl"
                      defaultValue={search}
                      onBlur={e => updateFilter('search', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') updateFilter('search', (e.target as HTMLInputElement).value) }}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={v => updateFilter('status', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 w-full sm:w-32 rounded-xl">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activas</SelectItem>
                      <SelectItem value="past_due">Atrasadas</SelectItem>
                      <SelectItem value="canceled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={planFilter} onValueChange={v => updateFilter('plan', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 w-full sm:w-32 rounded-xl">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {subscriptions.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center px-4">
                    <FileText className="h-10 w-10 text-slate-200 mb-3" />
                    <h3 className="text-base font-semibold text-slate-700">No hay suscripciones</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-md">Las suscripciones vinculan un gimnasio con un plan de precio.</p>
                    <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { loadGyms(); setIsCreateOpen(true) }}>
                      + Crear primera suscripción
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3.5 font-medium">Gimnasio</th>
                          <th className="px-6 py-3.5 font-medium">Plan</th>
                          <th className="px-6 py-3.5 font-medium">Estado</th>
                          <th className="px-6 py-3.5 font-medium">Próx. Pago</th>
                          <th className="px-6 py-3.5 font-medium text-right sr-only">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subscriptions.map(sub => {
                          const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.incomplete
                          return (
                            <tr
                              key={sub.id}
                              onClick={() => openDetail(sub)}
                              className="bg-white hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900">{sub.gym_name || '—'}</td>
                              <td className="px-6 py-4 text-slate-600">{sub.plan_detail?.name || '—'}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.label}
                                </span>
                                {sub.cancel_at_period_end && (
                                  <span className="ml-2 text-[10px] text-rose-500 font-bold uppercase tracking-wide">· cancela pronto</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-slate-500">{fmtDate(sub.next_billing_date)}</td>
                              <td className="px-6 py-4 text-right">
                                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors ml-auto" />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-sm text-slate-400">Página {page} de {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* ── Detail Sheet (single surface, no secondary modal) ── */}
      <SubscriptionSheet
        sub={selectedSub}
        plans={plans}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={fetchData}
      />

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Nueva Suscripción</DialogTitle>
            <DialogDescription className="text-slate-500">
              Asigna un plan de precio a un gimnasio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gimnasio</Label>
                <Select value={form.owner_gym} onValueChange={v => setForm({ ...form, owner_gym: v })}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Selecciona un gimnasio..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                    {gyms.map(g => <SelectItem key={g.id} value={g.id} className="rounded-xl py-3">{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Selecciona un plan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                    {plans.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id} className="rounded-xl py-3">
                        {p.name} — S/ {p.price}/{p.billing_cycle === 'monthly' ? 'mes' : 'año'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPlanPreview && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-2">
                  <p className="font-bold text-slate-900">{selectedPlanPreview.name}</p>
                  <p className="text-slate-500 text-xs">{selectedPlanPreview.description}</p>
                  <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600 pt-1">
                    <span>Atletas: <strong>{selectedPlanPreview.max_athletes}</strong></span>
                    <span>Coaches: <strong>{selectedPlanPreview.max_coaches}</strong></span>
                    <span>Nutricionistas: <strong>{selectedPlanPreview.max_nutritionists}</strong></span>
                    <span>Precio: <strong>S/ {selectedPlanPreview.price}</strong></span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha de inicio</Label>
                  <Input type="date" className="rounded-xl border-slate-200" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Próxima facturación</Label>
                  <Input type="date" className="rounded-xl border-slate-200" value={form.next_billing_date} onChange={e => setForm({ ...form, next_billing_date: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={saving || !form.owner_gym || !form.plan} className="rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-transform text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Crear suscripción
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
