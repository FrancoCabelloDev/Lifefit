'use client'

import { useEffect, useState, use, useCallback } from 'react'
import {
  Users, UserCheck, Clock, Loader2, Search, RefreshCw,
  PauseCircle, XCircle, ChevronRight, CheckCircle2,
  CreditCard, ArrowUpCircle, Star, Calendar, Banknote,
  AlertTriangle, RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

import { api } from '@/lib/api'
import type { GymSubscription, GymMembershipPlan, PaginatedResponse } from '@/lib/types'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { showSuccess, showError } from '@/lib/toast'

// ─── Types ─────────────────────────────────────────────────────────────────

type TabStatus = 'all' | 'active' | 'expired' | 'paused' | 'canceled'

type PaymentRecord = {
  id: string
  amount: string
  currency: string
  status: string
  payment_method: string
  paid_at: string | null
  plan_name: string | null
}

// ─── Config ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  active:   { label: 'Activa',    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired:  { label: 'Vencida',   dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 border-slate-200' },
  paused:   { label: 'Pausada',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  canceled: { label: 'Cancelada', dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', izipay: 'Izipay',
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success:  { label: 'Pagado',      color: 'text-emerald-600' },
  pending:  { label: 'Pendiente',   color: 'text-amber-600'   },
  failed:   { label: 'Fallido',     color: 'text-rose-600'    },
  refunded: { label: 'Reembolsado', color: 'text-slate-500'   },
}

const TABS: { key: TabStatus; label: string }[] = [
  { key: 'all',      label: 'Todas'     },
  { key: 'active',   label: 'Activas'   },
  { key: 'expired',  label: 'Vencidas'  },
  { key: 'paused',   label: 'Pausadas'  },
  { key: 'canceled', label: 'Canceladas'},
]

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00').toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtMoney(n: number | null) {
  if (n === null) return '—'
  return `S/ ${n.toFixed(2)}`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function DaysBar({ days, total }: { days: number | null; total: number | null }) {
  if (!days || !total) return null
  const pct = Math.min(100, Math.round((days / total) * 100))
  const color =
    pct > 50 ? 'bg-emerald-500' :
    pct > 20 ? 'bg-amber-400' :
    'bg-rose-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{days} días restantes</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }[size]
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover ring-2 ring-white`} />
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white ring-2 ring-white`}>
      {initials(name)}
    </div>
  )
}

// ─── Cancel Dialog ─────────────────────────────────────────────────────────

function CancelDialog({
  open, sub, onClose, onConfirm, loading,
}: {
  open: boolean
  sub: GymSubscription | null
  onClose: () => void
  onConfirm: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-1">
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900">Cancelar membresía</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Esta acción notificará al atleta. El acceso se detendrá hoy.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">{sub?.athlete_name}</span> — {sub?.plan_name ?? 'Sin plan'}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Motivo <span className="text-slate-400 font-normal normal-case tracking-normal">(opcional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: El atleta solicitó baja voluntaria..."
              className="rounded-xl border-slate-200 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl flex-1">
            Volver
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="rounded-xl flex-1 bg-rose-600 hover:bg-rose-700 active:scale-[0.97] transition-transform text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            Cancelar membresía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Pause Dialog ──────────────────────────────────────────────────────────

function PauseDialog({
  open, sub, onClose, onConfirm, loading,
}: {
  open: boolean
  sub: GymSubscription | null
  onClose: () => void
  onConfirm: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-1">
            <PauseCircle className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900">Pausar membresía</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            La membresía quedará pausada. Podrás reactivarla cuando el atleta vuelva.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">{sub?.athlete_name}</span> — {sub?.plan_name ?? 'Sin plan'}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Motivo <span className="text-slate-400 font-normal normal-case tracking-normal">(opcional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Lesión, viaje, motivo personal..."
              className="rounded-xl border-slate-200 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="rounded-xl flex-1 bg-amber-500 hover:bg-amber-600 active:scale-[0.97] transition-transform text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PauseCircle className="w-4 h-4 mr-2" />}
            Pausar membresía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ChangePlan Dialog ─────────────────────────────────────────────────────

function ChangePlanDialog({
  open, sub, plans, onClose, onConfirm, loading,
}: {
  open: boolean
  sub: GymSubscription | null
  plans: GymMembershipPlan[]
  onClose: () => void
  onConfirm: (planId: string) => void
  loading: boolean
}) {
  const [planId, setPlanId] = useState('')
  const available = plans.filter(p => p.id !== sub?.plan)
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setPlanId('') } }}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-1">
            <ArrowUpCircle className="w-6 h-6 text-blue-600" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900">Cambiar plan</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            El nuevo plan se activa hoy y recalcula la fecha de vencimiento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">{sub?.athlete_name}</span>
            <span className="text-slate-400"> · Plan actual: </span>
            {sub?.plan_name ?? 'Sin plan'}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nuevo plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="rounded-xl border-slate-200 h-11">
                <SelectValue placeholder="Selecciona un plan..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                {available.length === 0
                  ? <div className="py-3 text-center text-sm text-slate-400">No hay otros planes disponibles</div>
                  : available.map(p => (
                    <SelectItem key={p.id} value={p.id} className="rounded-xl py-3">
                      <div className="flex items-center gap-2">
                        {p.tier === 'premium' && <Star className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{p.name}</span>
                        <span className="text-slate-400 text-xs">· S/ {p.price} / {p.duration_days}d</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onClose(); setPlanId('') }} className="rounded-xl flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(planId)}
            disabled={loading || !planId}
            className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-transform text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
            Cambiar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Subscription Sheet ────────────────────────────────────────────────────

function SubscriptionSheet({
  sub,
  plans,
  open,
  onClose,
  onUpdated,
}: {
  sub: GymSubscription | null
  plans: GymMembershipPlan[]
  open: boolean
  onClose: () => void
  onUpdated: (updated: GymSubscription) => void
}) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [showCancel, setShowCancel] = useState(false)
  const [showPause, setShowPause] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)

  useEffect(() => {
    if (!sub || !open) return
    setLoadingPayments(true)
    api.get<PaginatedResponse<PaymentRecord> | PaymentRecord[]>('/api/gyms/payments/', {
      params: { athlete: sub.athlete, subscription: sub.id },
    })
      .then(d => setPayments(Array.isArray(d) ? d : d.results || []))
      .catch(() => setPayments([]))
      .finally(() => setLoadingPayments(false))
  }, [sub?.id, open])

  const doAction = useCallback(async (
    action: string,
    body: Record<string, string>,
    successMsg: string,
  ) => {
    if (!sub) return
    setActionLoading(action)
    try {
      const updated = await api.post<GymSubscription>(`/api/gyms/subscriptions/${sub.id}/${action}/`, body)
      onUpdated(updated)
      showSuccess(successMsg)
      setShowCancel(false)
      setShowPause(false)
      setShowChangePlan(false)
    } catch (e: any) {
      showError(e, `Error al ${action === 'renew' ? 'renovar' : action === 'pause' ? 'pausar' : action === 'cancel' ? 'cancelar' : 'cambiar plan'}`)
    } finally {
      setActionLoading(null)
    }
  }, [sub, onUpdated])

  if (!sub) return null

  const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.expired
  const isActive = sub.status === 'active'
  const isPaused = sub.status === 'paused'
  const isCanceled = sub.status === 'canceled'

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-[440px] p-0 flex flex-col gap-0 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={sub.athlete_name} src={sub.athlete_avatar} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="text-lg font-bold text-slate-900 leading-tight">
                    {sub.athlete_name}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-400 mt-0.5 truncate">
                    {sub.athlete_email}
                  </SheetDescription>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mt-0.5"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* Plan card */}
            <div className="mx-5 mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan actual</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{sub.plan_name ?? '—'}</p>
                </div>
                {sub.plan_tier === 'premium' && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Precio</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtMoney(sub.plan_price)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Vencimiento</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtDate(sub.end_date)}</p>
                </div>
              </div>

              {isActive && <DaysBar days={sub.days_remaining} total={sub.plan_duration_days} />}

              {sub.pause_reason && isPaused && (
                <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <span><span className="font-semibold">Pausada:</span> {sub.pause_reason}</span>
                </div>
              )}
              {sub.cancel_reason && isCanceled && (
                <div className="flex gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 text-xs text-rose-800">
                  <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-500" />
                  <span><span className="font-semibold">Motivo:</span> {sub.cancel_reason}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mx-5 mt-4 space-y-2">
              {/* Renovar */}
              <button
                onClick={() => doAction('renew', { payment_method: 'cash' }, 'Membresía renovada correctamente')}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all text-white font-semibold text-sm disabled:opacity-60"
              >
                {actionLoading === 'renew'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                <span>Renovar membresía</span>
                <span className="ml-auto text-emerald-200 text-xs">{sub.plan_duration_days ? `+${sub.plan_duration_days}d` : ''}</span>
              </button>

              {/* Cambiar plan */}
              <button
                onClick={() => setShowChangePlan(true)}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.97] transition-all text-slate-700 font-semibold text-sm disabled:opacity-60"
              >
                <ArrowUpCircle className="w-4 h-4 text-blue-500" />
                <span>Cambiar plan</span>
                <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
              </button>

              {/* Pausar — solo si está activa */}
              {isActive && (
                <button
                  onClick={() => setShowPause(true)}
                  disabled={!!actionLoading}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-200 active:scale-[0.97] transition-all text-slate-700 hover:text-amber-700 font-semibold text-sm disabled:opacity-60"
                >
                  <PauseCircle className="w-4 h-4 text-amber-500" />
                  <span>Pausar membresía</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </button>
              )}

              {/* Reactivar — si está pausada */}
              {isPaused && (
                <button
                  onClick={() => doAction('renew', { payment_method: 'cash' }, 'Membresía reactivada')}
                  disabled={!!actionLoading}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-amber-200 hover:bg-amber-50 active:scale-[0.97] transition-all text-amber-700 font-semibold text-sm disabled:opacity-60"
                >
                  {actionLoading === 'renew'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RotateCcw className="w-4 h-4" />}
                  <span>Reactivar membresía</span>
                  <ChevronRight className="w-4 h-4 text-amber-300 ml-auto" />
                </button>
              )}

              {/* Separator + Cancelar */}
              {!isCanceled && (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-300 font-medium">zona de riesgo</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <button
                    onClick={() => setShowCancel(true)}
                    disabled={!!actionLoading}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-rose-100 hover:bg-rose-50 hover:border-rose-200 active:scale-[0.97] transition-all text-rose-600 font-semibold text-sm disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancelar membresía</span>
                    <ChevronRight className="w-4 h-4 text-rose-200 ml-auto" />
                  </button>
                </>
              )}
            </div>

            {/* Payment history */}
            <div className="mx-5 mt-6 mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Historial de pagos
              </p>
              {loadingPayments ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                  <CreditCard className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Sin registros de pago</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 8).map((p, i) => {
                    const pStatus = PAYMENT_STATUS_CONFIG[p.status] ?? { label: p.status, color: 'text-slate-500' }
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-slate-100"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                            <Banknote className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              S/ {parseFloat(p.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
                              {p.paid_at ? ` · ${fmtDate(p.paid_at.slice(0, 10))}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold ${pStatus.color}`}>
                          {pStatus.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CancelDialog
        open={showCancel}
        sub={sub}
        onClose={() => setShowCancel(false)}
        onConfirm={reason => doAction('cancel', { reason }, 'Membresía cancelada')}
        loading={actionLoading === 'cancel'}
      />
      <PauseDialog
        open={showPause}
        sub={sub}
        onClose={() => setShowPause(false)}
        onConfirm={reason => doAction('pause', { reason }, 'Membresía pausada')}
        loading={actionLoading === 'pause'}
      />
      <ChangePlanDialog
        open={showChangePlan}
        sub={sub}
        plans={plans}
        onClose={() => setShowChangePlan(false)}
        onConfirm={planId => doAction('change_plan', { plan_id: planId }, 'Plan actualizado correctamente')}
        loading={actionLoading === 'change_plan'}
      />
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function SuscripcionesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['gym_admin', 'super_admin', 'receptionist'])

  const [subscriptions, setSubscriptions] = useState<GymSubscription[]>([])
  const [plans, setPlans] = useState<GymMembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabStatus>('all')
  const [selected, setSelected] = useState<GymSubscription | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      api.get<GymSubscription[] | PaginatedResponse<GymSubscription>>('/api/gyms/subscriptions/'),
      api.get<GymMembershipPlan[] | PaginatedResponse<GymMembershipPlan>>('/api/gyms/membership-plans/'),
    ])
      .then(([subs, pl]) => {
        setSubscriptions(Array.isArray(subs) ? subs : subs.results || [])
        setPlans(Array.isArray(pl) ? pl : pl.results || [])
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [gymId])

  const counts = {
    all: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    paused: subscriptions.filter(s => s.status === 'paused').length,
    canceled: subscriptions.filter(s => s.status === 'canceled').length,
  }

  const filtered = subscriptions.filter(s => {
    const matchTab = tab === 'all' || s.status === tab
    const matchSearch = s.athlete_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.athlete_email?.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const handleRowClick = (sub: GymSubscription) => {
    setSelected(sub)
    setSheetOpen(true)
  }

  const handleUpdated = useCallback((updated: GymSubscription) => {
    setSubscriptions(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelected(updated)
  }, [])

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suscripciones</h1>
          <p className="text-slate-500 mt-1">Gestiona las membresías de tus atletas.</p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Activas',    count: counts.active,   icon: UserCheck,   color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Vencidas',   count: counts.expired,  icon: Clock,       color: 'bg-slate-50 text-slate-500'    },
            { label: 'Pausadas',   count: counts.paused,   icon: PauseCircle, color: 'bg-amber-50 text-amber-600'    },
            { label: 'Total',      count: counts.all,      icon: Users,       color: 'bg-blue-50 text-blue-600'      },
          ].map(({ label, count, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 space-y-4 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg text-slate-800">Atletas suscritos</CardTitle>
                <CardDescription>{filtered.length} registros</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  className="pl-10 h-9 bg-white border-slate-200"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status tabs */}
            <div className="flex gap-1 overflow-x-auto pb-px">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl whitespace-nowrap
                    transition-colors duration-150
                    ${tab === t.key
                      ? 'text-slate-900 bg-white border border-b-white border-slate-200 -mb-px'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/60'
                    }
                  `}
                >
                  {t.label}
                  <span className={`
                    min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center font-bold
                    ${tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}
                  `}>
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center px-4">
                <Users className="h-10 w-10 text-slate-200 mb-3" />
                <h3 className="text-base font-semibold text-slate-700">Sin resultados</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                  {search ? 'Ningún atleta coincide con tu búsqueda.' : 'No hay suscripciones en esta categoría.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 font-medium">Atleta</th>
                      <th className="px-6 py-3.5 font-medium">Plan</th>
                      <th className="px-6 py-3.5 font-medium">Estado</th>
                      <th className="px-6 py-3.5 font-medium">Vencimiento</th>
                      <th className="px-6 py-3.5 font-medium">Días restantes</th>
                      <th className="px-6 py-3.5 font-medium sr-only">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(sub => {
                      const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.expired
                      const urgent = sub.status === 'active' && sub.days_remaining !== null && sub.days_remaining <= 7
                      return (
                        <tr
                          key={sub.id}
                          onClick={() => handleRowClick(sub)}
                          className="bg-white hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={sub.athlete_name} src={sub.athlete_avatar} size="sm" />
                              <div>
                                <p className="font-semibold text-slate-900 leading-tight">{sub.athlete_name}</p>
                                <p className="text-xs text-slate-400">{sub.athlete_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              {sub.plan_tier === 'premium' && <Star className="w-3 h-3 text-amber-500" />}
                              <span className="text-slate-700">{sub.plan_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{fmtDate(sub.end_date)}</td>
                          <td className="px-6 py-4">
                            {sub.days_remaining !== null ? (
                              <span className={`font-semibold text-sm ${urgent ? 'text-rose-600' : 'text-slate-700'}`}>
                                {urgent && <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                                {sub.days_remaining}d
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
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
        </Card>
      </div>

      <SubscriptionSheet
        sub={selected}
        plans={plans}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpdated={handleUpdated}
      />
    </>
  )
}
