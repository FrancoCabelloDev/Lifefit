# Semana 3: Facturación (Pagos e Ingresos)

## Objetivo

Reemplazar los mock data de la página de Finanzas con datos reales desde la base de datos. Crear un módulo que muestre el **historial de pagos**, **métricas de ingresos** (MRR, ARR) y un **revenue chart** mensual. Este módulo consume los registros del modelo `Payment` que se generan cuando un gimnasio paga su suscripción.

---

## Diferencia con los otros módulos financieros

```
Planes de Precio → Suscripciones → Facturación
   (catálogo)       (contrato)      (pagos reales)
```

| Módulo | Pregunta que responde |
|---|---|
| Planes de Precio | ¿Cuánto cuesta cada plan? |
| Suscripciones | ¿Qué plan tiene cada gimnasio? |
| **Facturación** | **¿Pagaron? ¿Cuánto? ¿Cuándo?** |

---

## Estado actual

### Backend — `Payment`

| Archivo | Estado |
|---|---|
| `backend/subscriptions/models.py:72` | ✅ Modelo `Payment` con `subscription` FK, `amount`, `currency`, `status`, `paid_at`, `provider`, `external_id` |
| `backend/subscriptions/serializers.py:55` | ✅ `PaymentSerializer` con `subscription_detail` anidado (incluye `SubscriptionSerializer` completo) |
| `backend/subscriptions/views.py:116` | ⚠️ `PaymentViewSet` básico — solo `get_queryset` filtrado por rol, **sin search, sin filters, sin actions** |
| `backend/subscriptions/urls.py:9` | ✅ `router.register("payments", ...)` → `GET /api/subscriptions/payments/` |

### Frontend — `finanzas/page.tsx`

| Archivo | Estado |
|---|---|
| `frontend/src/app/panel-saas/finanzas/page.tsx` | ❌ **Mock data** — 4 transacciones hardcodeadas, 3 cards con valores fijos ($12,450 MRR), no conecta con API real |

### Types

| Archivo | Estado |
|---|---|
| `frontend/src/lib/types.ts` | ❌ No existe tipo `Payment` ni métricas de facturación |

---

## Arquitectura de datos

### Modelo `Payment` (ya existe, no se modifica)

```python
class Payment(BaseModel):
    class PaymentStatus(models.TextChoices):
        SUCCESS = "success", "Pagado"
        PENDING = "pending", "Pendiente"
        FAILED = "failed", "Fallido"

    subscription = models.ForeignKey(Subscription, related_name="payments", on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=10, default="PEN")
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.SUCCESS)
    paid_at = models.DateTimeField()
    provider = models.CharField(max_length=50, default="manual")
    external_id = models.CharField(max_length=120, blank=True)
```

Cada pago pertenece a una suscripción. La suscripción pertenece a un gimnasio. Cadena: `Payment → Subscription → Gym`.

---

## Paso 1: Mejorar el serializer (`backend/subscriptions/serializers.py`)

Agregar campos planos para mostrar en tabla sin tener que acceder a objetos anidados:

```python
class PaymentSerializer(serializers.ModelSerializer):
    subscription_detail = SubscriptionSerializer(source="subscription", read_only=True)
    gym_name = serializers.CharField(source="subscription.owner_gym.name", read_only=True)
    gym_slug = serializers.CharField(source="subscription.owner_gym.slug", read_only=True)
    plan_name = serializers.CharField(source="subscription.plan.name", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "subscription",
            "subscription_detail",
            "gym_name",       # NUEVO
            "gym_slug",       # NUEVO
            "plan_name",      # NUEVO
            "amount",
            "currency",
            "status",
            "paid_at",
            "provider",
            "external_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at",
            "subscription_detail", "gym_name", "gym_slug", "plan_name"
        ]
```

**Importante:** El viewset ya usa `.select_related("subscription", "subscription__plan")`, pero para acceder a `owner_gym.name` se necesita también `.select_related("subscription__owner_gym")`. Se actualiza en el Paso 2.

---

## Paso 2: Mejorar el ViewSet (`backend/subscriptions/views.py`)

```python
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from datetime import date, timedelta


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "subscription__owner_gym__name",
        "subscription__plan__name",
        "external_id",
    ]
    ordering_fields = ["paid_at", "amount", "status"]
    ordering = ["-paid_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related(
            "subscription",
            "subscription__plan",
            "subscription__owner_gym",
        )

        # Filtros desde query params
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        gym_id = self.request.query_params.get("gym")
        if gym_id:
            qs = qs.filter(subscription__owner_gym_id=gym_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(paid_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(paid_at__date__lte=date_to)

        # Permisos por rol
        if user.role == user.Role.SUPER_ADMIN:
            return qs
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return qs.filter(subscription__owner_gym=user.gym)
        return qs.filter(subscription__owner_user=user)

    def perform_create(self, serializer):
        # Solo super_admin puede crear pagos manuales
        if self.request.user.role != user.Role.SUPER_ADMIN:
            raise PermissionDenied("No tienes permisos para registrar pagos.")
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied("No puedes eliminar pagos.")

    @action(detail=False, methods=["get"])
    def metrics(self, request):
        """Cards de métricas financieras"""
        today = date.today()
        first_day_of_month = today.replace(day=1)
        six_months_ago = today - timedelta(days=180)

        # MRR = suma de precios de suscripciones activas
        mrr = (
            Subscription.objects
            .filter(status="active")
            .aggregate(total=Sum("plan__price"))
        )["total"] or 0

        # Ingresos del mes actual
        monthly_income = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=first_day_of_month)
            .aggregate(total=Sum("amount"))
        )["total"] or 0

        # Ingresos del mes anterior (para calcular variación)
        last_month_start = (first_day_of_month - timedelta(days=1)).replace(day=1)
        last_month_income = (
            Payment.objects
            .filter(
                status="success",
                paid_at__date__gte=last_month_start,
                paid_at__date__lt=first_day_of_month,
            )
            .aggregate(total=Sum("amount"))
        )["total"] or 0

        mrr_change = 0
        if last_month_income > 0:
            mrr_change = round((monthly_income - last_month_income) / last_month_income * 100, 1)

        pending = Payment.objects.filter(status="pending").count()
        total_gyms = (
            Subscription.objects
            .filter(status="active")
            .values("owner_gym")
            .distinct()
            .count()
        )

        return Response({
            "mrr": float(mrr),
            "arr": float(mrr) * 12,
            "monthly_income": float(monthly_income),
            "mrr_change": mrr_change,
            "pending_payments": pending,
            "total_gyms_with_subscriptions": total_gyms,
            "currency": "PEN",
        })

    @action(detail=False, methods=["get"])
    def revenue_history(self, request):
        """Datos para el chart de ingresos mensuales"""
        six_months_ago = date.today() - timedelta(days=180)
        monthly = (
            Payment.objects
            .filter(status="success", paid_at__date__gte=six_months_ago)
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )
        return Response([
            {"month": m["month"].strftime("%Y-%m"), "total": float(m["total"])}
            for m in monthly
        ])
```

### Queries generadas por cada acción

| Acción | SQL generado |
|---|---|
| `GET /payments/` | `SELECT ... FROM payments INNER JOIN subscriptions INNER JOIN plans INNER JOIN gyms ORDER BY paid_at DESC LIMIT 20` |
| `GET /payments/?status=pending` | `... WHERE status = 'pending' ...` |
| `GET /payments/?gym=<uuid>` | `... WHERE subscription.owner_gym_id = <uuid> ...` |
| `GET /payments/metrics/` | `SELECT SUM(plan.price) FROM subscriptions WHERE status='active'` + `SELECT SUM(amount) FROM payments WHERE status='success' AND month = current` |
| `GET /payments/revenue_history/` | `SELECT DATE_TRUNC('month', paid_at), SUM(amount) FROM payments WHERE status='success' GROUP BY 1 ORDER BY 1` |

Todas son **queries agregadas en SQL** — sin loops en Python, sin N+1.

---

## Paso 3: Agregar tipos a `frontend/src/lib/types.ts`

```typescript
export type PaymentStatus = 'success' | 'pending' | 'failed'

export type Payment = {
  id: string
  subscription: string
  subscription_detail: Subscription
  gym_name: string
  gym_slug: string
  plan_name: string
  amount: string
  currency: string
  status: PaymentStatus
  paid_at: string
  provider: string
  external_id: string
  created_at: string
  updated_at: string
}

export type PaymentMetrics = {
  mrr: number
  arr: number
  monthly_income: number
  mrr_change: number
  pending_payments: number
  total_gyms_with_subscriptions: number
  currency: string
}

export type RevenuePoint = {
  month: string    // "2026-05"
  total: number
}
```

---

## Paso 4: Data fetching (`frontend/src/app/panel-saas/finanzas/page.tsx`)

```typescript
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Payment, PaymentMetrics, RevenuePoint, PaginatedResponse } from '@/lib/types'

// Estado
const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
const [payments, setPayments] = useState<Payment[]>([])
const [revenueData, setRevenueData] = useState<RevenuePoint[]>([])
const [isLoading, setIsLoading] = useState(true)
const [page, setPage] = useState(1)
const [search, setSearch] = useState('')
const [statusFilter, setStatusFilter] = useState('')
const [totalPages, setTotalPages] = useState(1)

// Cargar métricas
const fetchMetrics = async () => {
  const data = await api.get<PaymentMetrics>("/api/subscriptions/payments/metrics/")
  setMetrics(data)
}

// Cargar payments con paginación y filtros
const fetchPayments = async () => {
  const params: Record<string, string> = { page: String(page) }
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter

  const data = await api.get<PaginatedResponse<Payment>>(
    "/api/subscriptions/payments/",
    { params }
  )
  setPayments(data.results)
  setTotalPages(Math.ceil(data.count / 20))
}

// Cargar revenue history para el chart
const fetchRevenueHistory = async () => {
  const data = await api.get<RevenuePoint[]>("/api/subscriptions/payments/revenue_history/")
  setRevenueData(data)
}

useEffect(() => {
  Promise.all([fetchMetrics(), fetchPayments(), fetchRevenueHistory()])
    .finally(() => setIsLoading(false))
}, [page, search, statusFilter])
```

---

## Paso 5: UI — Layout completo

```
┌────────────────────────────────────────────────────────────────────┐
│  📑 Facturación                                                    │
│  Historial de pagos e ingresos del SaaS.                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐           │
│  │  MRR  │  │  ARR │  │ Este │  │ Var. │  │ Pend.    │           │
│  │S/12.4k│  │S/149k│  │ mes  │  │ vs   │  │ 3        │           │
│  │       │  │      │  │S/10.2│  │ mes  │  │          │           │
│  │       │  │      │  │  k   │  │ ▲12% │  │          │           │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────────┘           │
│                                                                    │
│  ┌──── Revenue Chart ─────────────────────────────────────────┐    │
│  │  Ingresos Mensuales (últimos 6 meses)                      │    │
│  │                                                            │    │
│  │  S/ 15k ┤                                                  │    │
│  │  S/ 12k ┤       ╱──╲                                       │    │
│  │  S/ 10k ┤  ╱──╲╱    ╲──╲   ╱──╲                            │    │
│  │  S/  7k ┤ ╱              ╲─╱    ╲──╲                       │    │
│  │  S/  5k ┤╱                      ╲──╱                       │    │
│  │         └──────────────────────────────────                  │    │
│  │           Ene  Feb  Mar  Abr  May  Jun                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌──── Filtros ───────────────────────────────────────────────┐    │
│  │ [🔍 Buscar gym/plan/ID...]  [Estado: ▼ Todos]  [📅 Fecha]│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌──── Tabla de Pagos ─────────────────────────────────────────┐    │
│  │ Gimnasio       │ Plan     │ Monto     │ Estado   │ Fecha    │    │
│  ├────────────────┼──────────┼───────────┼──────────┼──────────┤    │
│  │ 🏢 FitCenter   │ Pro      │ S/ 249.00 │ ✅ Pagado│ 15/05    │    │
│  │ 🏢 IronGym     │ Starter  │ S/ 99.00  │ ⏳ Pend. │ 14/05    │    │
│  │ 🏢 CrossBox    │ Enterpr. │ S/ 499.00 │ ❌ Fall. │ 13/05    │    │
│  │ 🏢 FitCenter   │ Pro      │ S/ 249.00 │ ✅ Pagado│ 15/04    │    │
│  └────────────────┴──────────┴───────────┴──────────┴──────────┘    │
│                                                                    │
│  [← Anterior]  Página 1 de 8  [Siguiente →]                      │
└────────────────────────────────────────────────────────────────────┘
```

### Status badges

```tsx
const STATUS_CONFIG = {
  success: { label: 'Pagado', class: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Fallido', class: 'bg-red-100 text-red-800' },
}

<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[payment.status].class}`}>
  {STATUS_CONFIG[payment.status].label}
</span>
```

---

## Paso 6: Revenue Chart (Recharts + shadcn/ui)

```tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts'

function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const chartConfig = {
    total: {
      label: 'Ingresos',
      color: 'hsl(var(--chart-1))',
    },
  }

  const formatPrice = (value: number) => `S/ ${value.toLocaleString('es-PE')}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos Mensuales</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => {
                  const months: Record<string, string> = {
                    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
                    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
                    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
                  }
                  return months[m.split('-')[1]] || m
                }}
                className="text-xs text-slate-500"
              />
              <YAxis
                tickFormatter={formatPrice}
                className="text-xs text-slate-500"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: number) => formatPrice(value)}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--color-total)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

---

## Paso 7: States de UI

### Loading (esqueletos)

```tsx
{isLoading ? (
  <div className="space-y-4">
    {/* Esqueletos de cards */}
    <div className="grid grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
    {/* Esqueleto del chart */}
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-72 w-full" />
      </CardContent>
    </Card>
    {/* Esqueleto de la tabla */}
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
) : (
  // contenido real
)}
```

### Empty state

```tsx
{payments.length === 0 && !isLoading && (
  <Card>
    <CardContent className="flex flex-col items-center py-12 text-center">
      <CreditCard className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900">No hay pagos registrados</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md">
        Los pagos aparecerán aquí cuando los gimnasios realicen sus pagos de suscripción.
      </p>
    </CardContent>
  </Card>
)}
```

### Error state

```tsx
{error && (
  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
    {error}
  </div>
)}
```

### Filtros activos en URL

```tsx
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
```

---

## Paso 8: Seed Data

Para tener datos reales que mostrar sin esperar pagos reales:

```python
# backend/subscriptions/management/commands/seed_payments.py

from datetime import date, timedelta, datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from subscriptions.models import Subscription, Payment


class Command(BaseCommand):
    help = "Crea pagos de prueba para los últimos 3 meses"

    def handle(self, *args, **options):
        subscriptions = Subscription.objects.filter(status="active")
        created = 0
        today = date.today()

        for sub in subscriptions:
            for months_ago in range(3):
                pay_date = today - timedelta(days=months_ago * 30 + 5)

                # Saltar pagos futuros
                if pay_date > today:
                    continue

                # Verificar si ya existe un pago para ese período
                existing = Payment.objects.filter(
                    subscription=sub,
                    paid_at__date__year=pay_date.year,
                    paid_at__date__month=pay_date.month,
                ).exists()

                if existing:
                    self.stdout.write(f"  ⏩ {sub.owner_gym} - mes {pay_date.month} ya existe")
                    continue

                Payment.objects.create(
                    subscription=sub,
                    amount=sub.plan.price,
                    currency="PEN",
                    status=Payment.PaymentStatus.SUCCESS,
                    paid_at=datetime.combine(pay_date, datetime.min.time()),
                    provider="izipay",
                    external_id=f"IXP-{sub.owner_gym.slug}-{pay_date.year}{pay_date.month:02d}",
                )
                created += 1
                self.stdout.write(f"  ✅ {sub.owner_gym} - S/ {sub.plan.price} - {pay_date.isoformat()}")

        self.stdout.write(self.style.SUCCESS(f"\n{created} pagos creados."))
```

Ejecutar:
```bash
python manage.py seed_payments
```

---

## Paso 9: Verificación

```bash
# Backend
python manage.py check

# Probar endpoints
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/subscriptions/payments/metrics/

curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/subscriptions/payments/revenue_history/

curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/subscriptions/payments/?status=failed"

# Frontend
cd frontend && npm run build
```

---

## Resumen de archivos

| Archivo | Acción |
|---|---|
| `backend/subscriptions/serializers.py` | MODIFICAR: agregar `gym_name`, `gym_slug`, `plan_name` a `PaymentSerializer` |
| `backend/subscriptions/views.py` | MODIFICAR: mejorar `PaymentViewSet` con search, filters, metrics, revenue_history |
| `frontend/src/lib/types.ts` | MODIFICAR: agregar `Payment`, `PaymentMetrics`, `RevenuePoint` |
| `frontend/src/app/panel-saas/finanzas/page.tsx` | REEMPLAZAR: mock data por datos reales desde API con cards, chart, tabla, filtros |
| `frontend/src/app/panel-saas/layout.tsx` | VERIFICAR: el sidebar ya tiene "Facturación" apuntando a `/panel-saas/finanzas` |
| `backend/subscriptions/management/commands/seed_payments.py` | CREAR: seed de pagos de prueba |

Orden de ejecución: Serializer → ViewSet → Types → Frontend → Seed → Verificar.
