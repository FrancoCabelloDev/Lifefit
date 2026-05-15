# Semana 1: Planes de Precio (Catálogo + Endpoints)

## Objetivo

Crear un CRUD de planes de suscripción SaaS en el panel admin (`/panel-saas/planes`) que permita al super_admin crear, editar, archivar y visualizar planes. Cada plan define precio, ciclo de facturación, límites por rol y features habilitados.

---

## Estado actual (qué ya existe)

| Capa | Archivo | Estado |
|---|---|---|
| Modelo | `backend/subscriptions/models.py:7` | `SubscriptionPlan` con `name`, `price`, `currency`, `billing_cycle`, `user_limit`, `features` (JSON list), `is_active` |
| Serializer | `backend/subscriptions/serializers.py:10` | `SubscriptionPlanSerializer` con todos los campos |
| ViewSet | `backend/subscriptions/views.py:8` | `SubscriptionPlanViewSet` (CRUD completo, solo super_admin para escribir) |
| URLs | `backend/subscriptions/urls.py:7` | `router.register("plans", ...)` → `/api/subscriptions/plans/` |
| URLs root | `backend/config/urls.py:28` | `path('api/subscriptions/', include('subscriptions.urls'))` |
| Frontend | — | **No existe página de planes** |

---

## Paso 1: Extender el modelo (`backend/subscriptions/models.py`)

Agregar campos de límites concretos al `SubscriptionPlan`.

```python
class SubscriptionPlan(BaseModel):
    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Mensual"
        QUARTERLY = "quarterly", "Trimestral"
        ANNUAL = "annual", "Anual"
        CUSTOM = "custom", "Personalizado"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="PEN")
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    user_limit = models.PositiveIntegerField(null=True, blank=True)

    # NUEVOS: límites específicos por rol
    max_athletes = models.PositiveIntegerField(default=50, help_text="Máximo de atletas permitidos")
    max_coaches = models.PositiveIntegerField(default=2, help_text="Máximo de coaches permitidos")
    max_nutritionists = models.PositiveIntegerField(default=1, help_text="Máximo de nutricionistas permitidos")

    # CAMBIAR: features de list → dict
    # Almacena: {"rutinas": true, "nutricion": true, "retos": true, "ranking": false, "checkin": false, "coach": false}
    features = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price"]

    def __str__(self) -> str:
        return self.name
```

**Migración:**
```bash
python manage.py makemigrations subscriptions
python manage.py migrate subscriptions
```

---

## Paso 2: Actualizar serializer (`backend/subscriptions/serializers.py`)

Agregar los nuevos campos al serializer.

```python
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "description",
            "price",
            "currency",
            "billing_cycle",
            "user_limit",
            "max_athletes",       # NUEVO
            "max_coaches",        # NUEVO
            "max_nutritionists",  # NUEVO
            "features",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
```

---

## Paso 3: Actualizar view (`backend/subscriptions/views.py`)

Agregar search/filter, cambiar `perform_destroy` a archivar (no DELETE real).

```python
from rest_framework import filters

User = get_user_model()


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["price", "name", "created_at"]
    ordering = ["price"]

    def get_queryset(self):
        if self.request.user.role == User.Role.SUPER_ADMIN:
            return SubscriptionPlan.objects.all()
        return SubscriptionPlan.objects.filter(is_active=True)

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo super_admin puede crear planes.")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo super_admin puede editar planes.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != User.Role.SUPER_ADMIN:
            raise PermissionDenied("Solo super_admin puede archivar planes.")
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
```

**Agregar import** al inicio del archivo si no existe:
```python
from django.contrib.auth import get_user_model
```

---

## Paso 4: Agregar tipo `SubscriptionPlan` a types compartidos

**Archivo:** `frontend/src/lib/types.ts`

```typescript
export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'custom'

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  price: string
  currency: string
  billing_cycle: BillingCycle
  user_limit: number | null
  max_athletes: number
  max_coaches: number
  max_nutritionists: number
  features: Record<string, boolean>
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## Paso 5: Crear página frontend (`frontend/src/app/panel-saas/planes/page.tsx`)

### Comportamiento esperado

- Super_admin ve TODOS los planes (activos e inactivos)
- Botón "+ Crear Plan" abre modal
- Pricing cards solo para `is_active=true`
- Tabla debajo con todos los planes
- Editar: clic en card o fila → modal prellenado
- Archivar: botón que hace DELETE (is_active=false), confirmación previa
- Activar: botón que hace PATCH con `is_active=true`

### Llamadas API

```typescript
import { api } from '@/lib/api'
import type { SubscriptionPlan, PaginatedResponse } from '@/lib/types'

// Listar
const data = await api.get<PaginatedResponse<SubscriptionPlan>>("/api/subscriptions/plans/")

// Crear
await api.post("/api/subscriptions/plans/", payload)

// Editar
await api.put(`/api/subscriptions/plans/${id}/`, payload)

// Archivar (DELETE → is_active=false)
await api.delete(`/api/subscriptions/plans/${id}/`)

// Reactivar
await api.patch(`/api/subscriptions/plans/${id}/`, { is_active: true })
```

### Estructura de la página

```
┌────────────────────────────────────────────────────────────┐
│  📦 Planes de Precio                     [+ Crear Plan]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ STARTER   │  │ PRO      │  │ ENTER.   │                 │
│  │ S/ 99/mes │  │S/249/mes │  │S/499/mes │                 │
│  │ 50 atl.   │  │200 atl.  │  │ ∞ atl.   │                 │
│  │ [Editar]  │  │ [Editar] │  │ [Editar] │                 │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                            │
│  ┌─────────── tabla de todos los planes ───────────────┐   │
│  │ Nombre │ Precio │ Ciclo  │ Límites      │ Estado    │   │
│  ├────────┼────────┼────────┼──────────────┼───────────┤   │
│  │ Starter│ S/99   │ monthly│ 50 atl.      │ ✅ Activo │   │
│  │ Pro    │ S/249  │ monthly│ 200 atl.     │ ✅ Activo │   │
│  │ Legacy │ S/49   │ monthly│ 20 atl.      │ ⏸ Inact.  │   │
│  └────────┴────────┴────────┴──────────────┴───────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Pricing Cards (solo `is_active = true`)

Cada card horizontal muestra:
- Nombre del plan
- Precio + ciclo (`S/ 249/mes`)
- Feature highlights con checkmarks
- Límites (atletas, coaches, nutricionistas)
- Botón "Editar"

### Tabla (todos los planes, incluso inactivos)

Columnas: Nombre, Precio, Ciclo, billing_cycle, user_limit, max_athletes, max_coaches, max_nutritionists, is_active, created_at.

Acciones por fila: Editar (icono lápiz), Archivar/Activar (toggle).

### Modal de crear/editar plan (shadcn Dialog)

| Campo | Tipo | Validación |
|---|---|---|
| Nombre | `Input` | Requerido |
| Descripción | `Textarea` | Opcional |
| Precio (S/) | `Input type="number" step="0.01"` | Requerido, > 0 |
| Ciclo de facturación | `Select` | monthly, quarterly, annual, custom |
| Máx. Atletas | `Input type="number"` | Requerido, >= 1 |
| Máx. Coaches | `Input type="number"` | Requerido, >= 0 |
| Máx. Nutricionistas | `Input type="number"` | Requerido, >= 0 |
| Features | 6× `Switch` en grid 3×2 | Opcional |

Features toggle grid:
```
🏋️ Rutinas       🍎 Nutrición      🎯 Retos
🏆 Ranking       📍 Check-in       🤖 LifeFit Coach
```

Botones: Cancelar | Guardar (envía POST o PUT según create/edit)

### Diseño del modal

```tsx
<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
  <DialogContent className="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Plan'}</DialogTitle>
      <DialogDescription>
        Define los límites y features incluidos en este plan de suscripción.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        {/* Fila 1: Nombre + Precio + Ciclo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={...} required />
          </div>
          <div>
            <Label>Precio (S/)</Label>
            <Input type="number" step="0.01" value={form.price} onChange={...} required />
          </div>
          <div>
            <Label>Ciclo</Label>
            <Select value={form.billing_cycle} onValueChange={...}>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </Select>
          </div>
        </div>
        {/* Fila 2: Descripción */}
        <div>
          <Label>Descripción</Label>
          <Textarea value={form.description} onChange={...} rows={2} />
        </div>
        {/* Fila 3: Límites */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Máx. Atletas</Label>
            <Input type="number" value={form.max_athletes} onChange={...} required />
          </div>
          <div>
            <Label>Máx. Coaches</Label>
            <Input type="number" value={form.max_coaches} onChange={...} required />
          </div>
          <div>
            <Label>Máx. Nutricionistas</Label>
            <Input type="number" value={form.max_nutritionists} onChange={...} required />
          </div>
        </div>
        {/* Fila 4: Features */}
        <div>
          <Label>Módulos incluidos</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {FEATURES_LIST.map(feat => (
              <div key={feat.id} className="flex items-center gap-2">
                <Switch checked={form.features[feat.id]} onCheckedChange={...} />
                <span>{feat.icon} {feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : editingPlan ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### States de UI

- **Loading:** `<Skeleton className="h-32" />` para cada pricing card
- **Empty:** "No hay planes configurados. Crea tu primer plan."
- **Error:** Toast o alerta roja con mensaje del backend
- **Saving:** Botón deshabilitado con spinner "Guardando..."
- **Success:** Toast verde "Plan creado exitosamente" + recargar lista

---

## Paso 6: Actualizar sidebar (`frontend/src/app/panel-saas/layout.tsx`)

Agregar el grupo **FINANZAS** con el módulo "Planes de Precio" y mantener "Finanzas" para futura facturación.

```tsx
// Agregar al import de lucide-react
import { LayoutDashboard, Users, CreditCard, Settings, Building2, LogOut, Package } from 'lucide-react'

// En el SidebarContent, después del grupo Platform:
<SidebarGroup>
  <SidebarGroupLabel>Finanzas</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/planes')} tooltip="Planes de Precio">
          <Link href="/panel-saas/planes">
            <Package />
            <span>Planes de Precio</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/finanzas')} tooltip="Finanzas">
          <Link href="/panel-saas/finanzas">
            <CreditCard />
            <span>Facturación</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

---

## Paso 7: Seed data (opcional pero recomendado)

**Archivo:** `backend/subscriptions/management/commands/seed_plans.py`

```python
from decimal import Decimal

from django.core.management.base import BaseCommand

from subscriptions.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Crea planes de suscripción por defecto"

    def handle(self, *args, **options):
        plans = [
            SubscriptionPlan(
                name="Starter",
                description="Para gimnasios pequeños que inician su transformación digital.",
                price=Decimal("99.00"),
                currency="PEN",
                billing_cycle="monthly",
                max_athletes=50,
                max_coaches=2,
                max_nutritionists=1,
                features={
                    "rutinas": True,
                    "nutricion": True,
                    "retos": False,
                    "ranking": False,
                    "checkin": False,
                    "coach": False,
                },
                is_active=True,
            ),
            SubscriptionPlan(
                name="Pro",
                description="Para gimnasios en crecimiento que buscan engagement.",
                price=Decimal("249.00"),
                currency="PEN",
                billing_cycle="monthly",
                max_athletes=200,
                max_coaches=5,
                max_nutritionists=3,
                features={
                    "rutinas": True,
                    "nutricion": True,
                    "retos": True,
                    "ranking": True,
                    "checkin": True,
                    "coach": False,
                },
                is_active=True,
            ),
            SubscriptionPlan(
                name="Enterprise",
                description="Solución completa con todos los módulos y capacidad ilimitada.",
                price=Decimal("499.00"),
                currency="PEN",
                billing_cycle="monthly",
                max_athletes=999999,
                max_coaches=15,
                max_nutritionists=10,
                features={
                    "rutinas": True,
                    "nutricion": True,
                    "retos": True,
                    "ranking": True,
                    "checkin": True,
                    "coach": True,
                },
                is_active=True,
            ),
        ]

        for plan in plans:
            existing = SubscriptionPlan.objects.filter(name=plan.name).first()
            if existing:
                self.stdout.write(f"  ⏩ {plan.name} ya existe, saltando.")
                continue
            plan.save()
            self.stdout.write(f"  ✅ {plan.name} creado.")

        self.stdout.write(self.style.SUCCESS("Seed de planes completado."))
```

Ejecutar:
```bash
python manage.py seed_plans
```

---

## Paso 8: Verificación

### Backend
```bash
python manage.py check
python manage.py test subscriptions --verbosity=2
```

Probar endpoints manualmente:
```bash
# Obtener todos los planes
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/subscriptions/plans/

# Crear plan
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":"99.00","max_athletes":50}' \
  http://localhost:8000/api/subscriptions/plans/

# Archivar plan (DELETE = is_active=false)
curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/subscriptions/plans/<id>/
```

### Frontend
```bash
cd frontend && npm run build
```

Verificar que:
- No hay errores de TypeScript
- La sidebar muestra "Planes de Precio"
- La página carga correctamente

---

## Resumen de archivos

| Archivo | Acción |
|---|---|
| `backend/subscriptions/models.py` | MODIFICAR: agregar `max_athletes`, `max_coaches`, `max_nutritionists`, cambiar `features` a dict |
| `backend/subscriptions/serializers.py` | MODIFICAR: agregar nuevos campos |
| `backend/subscriptions/views.py` | MODIFICAR: agregar search/filter, archive en destroy |
| `frontend/src/lib/types.ts` | MODIFICAR: agregar `SubscriptionPlan`, `BillingCycle` |
| `frontend/src/app/panel-saas/planes/page.tsx` | CREAR: página completa con cards + tabla + modal |
| `frontend/src/app/panel-saas/layout.tsx` | MODIFICAR: agregar grupo Finanzas + Planes al sidebar |
| `backend/subscriptions/management/commands/seed_plans.py` | CREAR: comando para datos semilla |
