# Semana 2: Suscripciones (Asignación de Planes a Gimnasios)

## Objetivo

Crear el módulo de Suscripciones en el panel admin (`/panel-saas/suscripciones`) que permita al super_admin **asignar un plan de precio a un gimnasio**, cambiar de plan, renovar, pausar y cancelar suscripciones. Cada suscripción vincula un gimnasio con un plan y lleva registro del estado, fechas y próximos pagos.

---

## Diferencia con otros módulos

| Módulo | Rol |
|---|---|
| **Planes de Precio** | Catálogo — define qué planes existen (Starter, Pro, Enterprise) |
| **Suscripciones** | Contratos — asigna un plan a un gimnasio específico |
| **Gimnasios** | Perfil del tenant — datos del gimnasio como cliente |
| **Facturación** | Transacciones — pagos recibidos, facturas |

**Flujo completo:**
1. Super admin crea planes en **Planes de Precio**
2. Super admin crea gimnasio en **Gimnasios**
3. Super admin asigna plan al gimnasio en **Suscripciones** → nace una suscripción
4. Cada mes, la suscripción genera un pago → se ve en **Facturación**

---

## Estado actual (qué ya existe)

| Capa | Archivo | Estado |
|---|---|---|
| Modelo `Subscription` | `backend/subscriptions/models.py:36` | `owner_gym`, `plan`, `status`, `start_date`, `end_date`, `next_billing_date`, `cancel_at_period_end` |
| Serializer `SubscriptionSerializer` | `backend/subscriptions/serializers.py:33` | Incluye `plan_detail` (plan anidado) |
| ViewSet `SubscriptionViewSet` | `backend/subscriptions/views.py:78` | CRUD completo, permisos por rol (super_admin ve todo, gym_admin ve su gym) |
| URLs | `backend/subscriptions/urls.py:8` | `router.register("subscriptions", ...)` → `/api/subscriptions/subscriptions/` |
| Frontend | `frontend/src/app/panel-saas/finanzas/page.tsx` | **Solo mock data** — página con datos falsos |

---

## Paso 1: Actualizar el serializer (`backend/subscriptions/serializers.py`)

Agregar campos calculados para mostrar info del gym y plan de forma legible.

```python
class SubscriptionSerializer(serializers.ModelSerializer):
    plan_detail = SubscriptionPlanSerializer(source="plan", read_only=True)
    gym_name = serializers.CharField(source="owner_gym.name", read_only=True)
    gym_slug = serializers.CharField(source="owner_gym.slug", read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "owner_gym",
            "owner_user",
            "plan",
            "plan_detail",
            "gym_name",          # NUEVO
            "gym_slug",          # NUEVO
            "status",
            "start_date",
            "end_date",
            "next_billing_date",
            "cancel_at_period_end",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "plan_detail", "gym_name", "gym_slug"]
```

**Nota:** Como `SubscriptionViewSet` ya usa `.select_related("plan", "owner_gym", "owner_user")`, acceder a `owner_gym.name` no genera queries extra.

---

## Paso 2: Mejorar el ViewSet (`backend/subscriptions/views.py`)

Agregar filtros, search y acción de cambio de plan.

```python
class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["owner_gym__name", "plan__name", "owner_user__email"]
    ordering_fields = ["start_date", "next_billing_date", "plan__price"]
    ordering = ["-start_date"]

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related("plan", "owner_gym", "owner_user")

        filter_status = self.request.query_params.get("status")
        if filter_status:
            queryset = queryset.filter(status=filter_status)

        filter_plan = self.request.query_params.get("plan")
        if filter_plan:
            queryset = queryset.filter(plan_id=filter_plan)

        if user.role == user.Role.SUPER_ADMIN:
            return queryset
        if user.role == user.Role.GYM_ADMIN and user.gym_id:
            return queryset.filter(owner_gym=user.gym)
        return queryset.filter(owner_user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [user.Role.SUPER_ADMIN, user.Role.GYM_ADMIN]:
            raise PermissionDenied("No tienes permisos para crear suscripciones.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == user.Role.SUPER_ADMIN:
            serializer.save()
            return
        if instance.owner_gym_id and user.role == user.Role.GYM_ADMIN and instance.owner_gym_id == user.gym_id:
            serializer.save()
            return
        if instance.owner_user_id == user.id:
            serializer.save(owner_user=user)
            return
        raise PermissionDenied("No puedes modificar esta suscripción.")

    def perform_destroy(self, instance):
        if self.request.user.role != user.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo super_admin puede eliminar suscripciones.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def change_plan(self, request, pk=None):
        """Cambiar el plan de una suscripción activa"""
        subscription = self.get_object()
        if subscription.status not in ["active", "past_due"]:
            return Response(
                {"detail": "Solo se puede cambiar el plan de suscripciones activas o con pago atrasado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_plan_id = request.data.get("plan_id")
        if not new_plan_id:
            return Response({"detail": "Se requiere plan_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_plan = SubscriptionPlan.objects.get(id=new_plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Plan no encontrado o inactivo."}, status=status.HTTP_404_NOT_FOUND)

        old_plan_name = subscription.plan.name
        subscription.plan = new_plan
        subscription.save(update_fields=["plan", "updated_at"])

        # Registrar cambio de plan (para auditoría)
        print(f"📝 Cambio de plan: {subscription.owner_gym} cambió de {old_plan_name} a {new_plan.name}")

        return Response({
            "detail": f"Plan cambiado de {old_plan_name} a {new_plan.name} exitosamente.",
            "subscription": self.get_serializer(subscription).data,
        })

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancelar suscripción al final del período actual"""
        subscription = self.get_object()
        if subscription.status != "active":
            return Response({"detail": "La suscripción no está activa."}, status=status.HTTP_400_BAD_REQUEST)

        subscription.cancel_at_period_end = True
        subscription.save(update_fields=["cancel_at_period_end", "updated_at"])

        return Response({
            "detail": "La suscripción se cancelará al final del período actual.",
            "subscription": self.get_serializer(subscription).data,
        })

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        """Reactivar suscripción cancelada o renovar período"""
        subscription = self.get_object()

        if subscription.cancel_at_period_end:
            subscription.cancel_at_period_end = False
            subscription.save(update_fields=["cancel_at_period_end", "updated_at"])
            return Response({
                "detail": "Cancelación revertida. La suscripción continuará activa.",
                "subscription": self.get_serializer(subscription).data,
            })

        if subscription.status == "canceled":
            from datetime import date, timedelta
            subscription.status = "active"
            subscription.start_date = date.today()
            subscription.end_date = None
            subscription.next_billing_date = date.today() + timedelta(days=30)
            subscription.cancel_at_period_end = False
            subscription.save(update_fields=[
                "status", "start_date", "end_date",
                "next_billing_date", "cancel_at_period_end", "updated_at"
            ])
            return Response({
                "detail": "Suscripción reactivada exitosamente.",
                "subscription": self.get_serializer(subscription).data,
            })

        return Response(
            {"detail": "Esta suscripción ya está activa."},
            status=status.HTTP_400_BAD_REQUEST,
        )
```

**Agregar imports** al inicio si faltan:
```python
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
```

---

## Paso 3: Agregar tipos a `frontend/src/lib/types.ts`

```typescript
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete'

export type Subscription = {
  id: string
  owner_gym: string | null
  owner_user: string | null
  plan: string
  plan_detail: SubscriptionPlan
  gym_name: string | null
  gym_slug: string | null
  status: SubscriptionStatus
  start_date: string
  end_date: string | null
  next_billing_date: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}
```

---

## Paso 4: Crear página frontend (`frontend/src/app/panel-saas/suscripciones/page.tsx`)

### Data fetching

```typescript
import { api } from '@/lib/api'
import type { Subscription, PaginatedResponse } from '@/lib/types'
import type { SubscriptionPlan } from '@/lib/types'

// Listar suscripciones
const data = await api.get<PaginatedResponse<Subscription>>(
  "/api/subscriptions/subscriptions/",
  { params: { status, plan, search, page } }
)

// Listar planes activos (para el modal de asignar)
const planes = await api.get<PaginatedResponse<SubscriptionPlan>>(
  "/api/subscriptions/plans/"
)

// Crear suscripción
await api.post("/api/subscriptions/subscriptions/", {
  owner_gym: gymId,
  plan: planId,
  start_date: "2026-05-15",
  next_billing_date: "2026-06-15",
})

// Cambiar plan
await api.post(`/api/subscriptions/subscriptions/${id}/change_plan/`, {
  plan_id: newPlanId
})

// Cancelar
await api.post(`/api/subscriptions/subscriptions/${id}/cancel/`)

// Renovar / Reactivar
await api.post(`/api/subscriptions/subscriptions/${id}/renew/`)
```

### Estructura de la página

```
┌──────────────────────────────────────────────────────────────────┐
│  💳 Suscripciones                [+ Nueva Suscripción]           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──── Stats Cards ──────────────────────────────────────────┐   │
│  │ [Activas: 24]  [Vencidas: 3]  [Canceladas: 5]  [MRR: S/12,450]│
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──── Filtros ─────────────────────────────────────────────┐    │
│  │ [🔍 Buscar gym...]  [Estado: ▼ Todos]  [Plan: ▼ Todos]  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──── Tabla de Suscripciones ──────────────────────────────┐    │
│  │ Gimnasio       │ Plan      │ Estado   │ Próx. Pago │ Acc.│    │
│  ├────────────────┼───────────┼──────────┼────────────┼─────┤    │
│  │ 🏢 FitCenter   │ Pro       │ ✅ Activa│ 15/06/2026 │ [···]│   │
│  │ 🏢 IronGym     │ Starter   │ ⏸ Atrasad│ 10/05/2026 │ [···]│   │
│  │ 🏢 CrossBox    │ Enterpr.  │ ❌ Cancel │ -          │ [···]│   │
│  └────────────────┴───────────┴──────────┴────────────┴─────┘    │
│                                                                  │
│  [← Anterior]  Página 1 de 5  [Siguiente →]                     │
└──────────────────────────────────────────────────────────────────┘
```

### Estados visuales

**Status badges:**

| Estado | Badge |
|---|---|
| `active` | `bg-emerald-100 text-emerald-800` → "✅ Activa" |
| `past_due` | `bg-amber-100 text-amber-800` → "⚠️ Atrasada" |
| `canceled` | `bg-red-100 text-red-800` → "❌ Cancelada" |
| `incomplete` | `bg-slate-100 text-slate-600` → "⬜ Incompleta" |

**Acciones por fila** (dropdown al hacer clic en `···`):

```
┌──────────────────────┐
│ 👁️ Ver detalle       │
│ 📦 Cambiar Plan      │
│ 🔄 Renovar           │
│ ❌ Cancelar          │
│ 🗑️ Eliminar (solo admin)│
└──────────────────────┘
```

**Row click:** abre el detalle de la suscripción.

### Loading states

```tsx
// Esqueletos para tabla
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
    </TableRow>
  ))
) : (
  // datos reales
)}
```

**Empty state:**
```
┌──────────────────────────────────────────┐
│  💳 No hay suscripciones registradas     │
│                                          │
│  Las suscripciones vinculan un gimnasio  │
│  con un plan de precio.                  │
│                                          │
│  [+ Crear Primera Suscripción]           │
└──────────────────────────────────────────┘
```

---

## Paso 5: Modal de crear suscripción

**Trigger:** Botón "+ Nueva Suscripción" en cabecera.

**Contenido:**

| Campo | Tipo | Notas |
|---|---|---|
| Gimnasio | `Select` con búsqueda | Cargado desde `GET /api/gyms/gyms/` |
| Plan | `Select` con precio | Cargado desde `GET /api/subscriptions/plans/?is_active=true` |
| Fecha de inicio | `Input type="date"` | Default: hoy |
| Próxima facturación | `Input type="date"` | Default: hoy + 30 días |
| Estado inicial | `Select` | "Activa" por defecto |

**Al seleccionar un plan**, mostrar preview del plan (precio, límites, features).

```tsx
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
          <Select value={form.owner_gym} onValueChange={...}>
            {gyms.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </Select>
        </div>
        <div>
          <Label>Plan</Label>
          <Select value={form.plan} onValueChange={handlePlanChange}>
            {plans.filter(p => p.is_active).map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — S/ {p.price}/{p.billing_cycle === 'monthly' ? 'mes' : 'año'}
              </SelectItem>
            ))}
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
              <span>💰 S/ {selectedPlanPreview.price}/mes</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fecha de inicio</Label>
            <Input type="date" value={form.start_date} onChange={...} required />
          </div>
          <div>
            <Label>Próxima facturación</Label>
            <Input type="date" value={form.next_billing_date} onChange={...} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Crear Suscripción'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Paso 6: Modal de cambiar plan

```tsx
<Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Cambiar Plan</DialogTitle>
      <DialogDescription>
        {subscription?.gym_name} — actualmente en {subscription?.plan_detail?.name}
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleChangePlan}>
      <div className="py-4">
        <Label>Nuevo Plan</Label>
        <Select value={newPlanId} onValueChange={setNewPlanId}>
          {plans.filter(p => p.is_active && p.id !== subscription?.plan).map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} — S/ {p.price}/mes
            </SelectItem>
          ))}
        </Select>
        <p className="text-xs text-slate-500 mt-2">
          El cambio aplica inmediatamente. La diferencia de precio se prorratea.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsChangePlanOpen(false)}>Cancelar</Button>
        <Button type="submit">Cambiar Plan</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Paso 7: Drawer de detalle (al hacer clic en fila o "Ver detalle")

```tsx
<Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
  <SheetContent className="sm:max-w-md">
    <SheetHeader>
      <SheetTitle>{subscription?.gym_name}</SheetTitle>
      <SheetDescription>Suscripción desde {subscription?.start_date}</SheetDescription>
    </SheetHeader>

    <div className="mt-6 space-y-6">
      {/* Info del plan */}
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold">Plan Actual</p>
        <p className="text-2xl font-bold mt-1">{subscription?.plan_detail?.name}</p>
        <p className="text-sm text-slate-500">
          S/ {subscription?.plan_detail?.price}/{subscription?.plan_detail?.billing_cycle === 'monthly' ? 'mes' : 'año'}
        </p>
      </div>

      {/* Timeline de estados */}
      <div>
        <p className="text-sm font-semibold mb-2">Línea de Tiempo</p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Creada</p>
              <p className="text-xs text-slate-500">{subscription?.created_at}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
              subscription?.status === 'active' ? 'bg-emerald-500' :
              subscription?.status === 'past_due' ? 'bg-amber-500' :
              'bg-red-500'
            }`} />
            <div>
              <p className="text-sm font-medium">
                {subscription?.status === 'active' ? 'Activa' :
                 subscription?.status === 'past_due' ? 'Pago Atrasado' :
                 subscription?.status === 'canceled' ? 'Cancelada' : 'Incompleta'}
              </p>
              <p className="text-xs text-slate-500">
                {subscription?.cancel_at_period_end ? 'Se cancelará al final del período' : 'Renovación automática'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fechas clave */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Inicio</p>
          <p className="font-medium">{subscription?.start_date}</p>
        </div>
        <div>
          <p className="text-slate-500">Fin</p>
          <p className="font-medium">{subscription?.end_date || '—'}</p>
        </div>
        <div>
          <p className="text-slate-500">Próximo pago</p>
          <p className="font-medium">{subscription?.next_billing_date || '—'}</p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="w-full justify-start" onClick={openChangePlan}>
          📦 Cambiar Plan
        </Button>
        {subscription?.status === 'active' && !subscription?.cancel_at_period_end && (
          <Button variant="outline" className="w-full justify-start text-amber-600" onClick={handleCancel}>
            ❌ Cancelar al final del período
          </Button>
        )}
        {subscription?.status === 'canceled' && (
          <Button variant="outline" className="w-full justify-start text-emerald-600" onClick={handleRenew}>
            🔄 Reactivar Suscripción
          </Button>
        )}
      </div>
    </div>
  </SheetContent>
</Sheet>
```

---

## Paso 8: Actualizar sidebar (`frontend/src/app/panel-saas/layout.tsx`)

Mover "Finanzas" al grupo FINANZAS y agregar "Suscripciones" en el mismo grupo.

```tsx
// Importar iconos
import { LayoutDashboard, Users, CreditCard, Settings, Building2, LogOut, Package, FileText } from 'lucide-react'

// En SidebarContent, después del grupo Platform:
<SidebarGroup>
  <SidebarGroupLabel>Finanzas</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/suscripciones')} tooltip="Suscripciones">
          <Link href="/panel-saas/suscripciones">
            <FileText />
            <span>Suscripciones</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/finanzas')} tooltip="Facturación">
          <Link href="/panel-saas/finanzas">
            <CreditCard />
            <span>Facturación</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/planes')} tooltip="Planes de Precio">
          <Link href="/panel-saas/planes">
            <Package />
            <span>Planes de Precio</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

---

## Paso 9: Métricas para el Dashboard

El módulo de Dashboard (`/panel-saas`) debe consumir datos reales de suscripciones:

```typescript
// Endpoint a crear o endpoint existente
const stats = await api.get<{
  active_subscriptions: number
  past_due_subscriptions: number
  canceled_subscriptions: number
  mrr: string
  monthly_revenue: string
  total_gyms: number
  total_users: number
}>("/api/analytics/dashboard/")
```

Métricas desde Suscripciones:
- **Suscripciones activas:** `Subscription.objects.filter(status="active").count()`
- **MRR:** suma de `plan.price` de suscripciones activas
- **Vencidas:** `Subscription.objects.filter(status="past_due").count()`

---

## Paso 10: Migraciones y verificación

```bash
# Backend
python manage.py makemigrations subscriptions
python manage.py migrate subscriptions
python manage.py check

# Probar endpoints
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/subscriptions/subscriptions/

curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"owner_gym":"<gym_id>","plan":"<plan_id>","start_date":"2026-05-15"}' \
  http://localhost:8000/api/subscriptions/subscriptions/

curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/subscriptions/subscriptions/<id>/change_plan/ \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"<new_plan_id>"}'

# Frontend
cd frontend && npm run build
```

---

## Resumen de archivos

| Archivo | Acción |
|---|---|
| `backend/subscriptions/serializers.py` | MODIFICAR: agregar `gym_name`, `gym_slug` |
| `backend/subscriptions/views.py` | MODIFICAR: agregar filters, search, actions (change_plan, cancel, renew) |
| `frontend/src/lib/types.ts` | MODIFICAR: agregar `Subscription`, `SubscriptionStatus` |
| `frontend/src/app/panel-saas/suscripciones/page.tsx` | CREAR: página completa con tabla, filtros, modales, drawer |
| `frontend/src/app/panel-saas/layout.tsx` | MODIFICAR: agregar Suscripciones al sidebar |

---

## Orden de ejecución

```
1. Actualizar serializer (gym_name, gym_slug)
2. Mejorar viewset (filtros + actions change_plan/cancel/renew)
3. Agregar tipos Subscription a types.ts
4. Crear página frontend (suscripciones/page.tsx)
5. Actualizar sidebar (layout.tsx)
6. Verificar build frontend + backend
```
