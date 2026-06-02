# Guía de Test — LifeFit MVP (PrimeGym)

> **Objetivo:** Probar todas las funcionalidades del sistema desde cero, creando el gimnasio PrimeGym y testando cada módulo.

---

## 1. Setup Inicial (backend)

Ejecutar en orden:

```bash
cd backend

# 1. Migraciones
python manage.py migrate

# 2. Feature Flags del sistema (6: rutinas, nutricion, checkin, retos, ranking, coach)
python manage.py seed_feature_flags

# 3. Planes SaaS (Básico S/49, Pro S/99, Empresarial S/199)
python manage.py seed_plans

# 4. Super Admin (crea acceso a panel-saas)
python manage.py create_default_admin --email super@lifefit.pe --password Admin12345!
```

---

## 2. Iniciar servidores

```bash
# Terminal 1 — Backend (puerto 8000)
cd backend && python manage.py runserver

# Terminal 2 — Frontend (puerto 3000)
cd frontend && npm run dev
```

---

## 3. Login como Super Admin

1. Abrir `http://localhost:3000/ingresar`
2. Email: `super@lifefit.pe`
3. Password: `Admin12345!`
4. Click **Iniciar Sesión**

> Si el login redirige automáticamente a `/tugimnasio` o a un gym, verifica que el rol sea `super_admin`. Si es correcto, navega manualmente a `/panel-saas`.

---

## 4. Crear PrimeGym desde panel-saas

1. Ir a **`/panel-saas/gimnasios`**
2. Click **"Nuevo Gimnasio"**
3. Llenar:

| Campo | Valor |
|-------|-------|
| Nombre | `PrimeGym` |
| Slug | `primegym` |
| Descripción | `Gimnasio de prueba para tesis` |
| Email de contacto | `franco_alex_07@hotmail.com` |
| Color | `#059669` (verde) |
| Plan SaaS | `Básico — S/49/mes` |
| Módulos activos | ✅ Rutinas, Nutrición, Check-in, Retos, Ranking |
| Email del Admin | `franco_alex_07@hotmail.com` |
| Nombre del Admin | `Franco` |
| Apellido del Admin | `Alex` |

4. Click **"Crear Gimnasio"**

**Resultado esperado:**
- PrimeGym aparece en la tabla de gimnasios
- Se creó un usuario `gym_admin` con email `franco_alex_07@hotmail.com`
- Se creó una `Subscription` activa con plan Básico
- Se creó un `Payment` inicial

---

## 5. Configurar acceso del Gym Admin

El usuario gym_admin se crea **sin contraseña** (invitación vía email). Para poder testear, debemos setearle una contraseña manualmente:

```bash
cd backend
python manage.py shell
```

```python
from accounts.models import User
user = User.objects.get(email="franco_alex_07@hotmail.com")
user.set_password("PrimeGym2026!")
user.save()
exit()
```

Ahora puedes hacer login como gym_admin:
1. Ir a `http://localhost:3000/ingresar`
2. Email: `franco_alex_07@hotmail.com`
3. Password: `PrimeGym2026!`
4. Deberías redirigir automáticamente a `/primegym/panel`

---

## 6. Test: Dashboard del Gym

Al entrar a `/primegym/panel` deberías ver:

**KPIs (reales desde API):**
- ✅ Total atletas registrados
- ✅ Check-ins hoy
- ✅ Membresías por vencer
- ✅ Ingresos del mes

**Gráficos:**
- ✅ Barras de check-ins semanales (recharts)

**Si está vacío** → es normal, aún no hay datos. Se llenará al crear atletas y suscripciones.

---

## 7. Test: Gestión → Planes de Membresía

1. Ir a **`/primegym/panel/gestion/planes`**
2. Deberías ver: "No hay planes creados"
3. Click **"Nuevo Plan"**

| Campo | Plan Básico | Plan Pro |
|-------|-------------|----------|
| Nombre | `Plan Básico` | `Plan Pro` |
| Descripción | `Acceso a instalaciones` | `Todo incluido` |
| Precio | `99` | `199` |
| Duración (días) | `30` | `30` |
| Beneficios | `Acceso libre, Vestidores` | `Acceso libre, Vestidores, Clases grupales, Seguimiento nutricional` |

4. Crear ambos planes
5. Verificar que aparecen como tarjetas con precio, duración y beneficios ✅

---

## 8. Test: Gestión → Staff (Equipo)

### 8.1 Crear Coach

1. Ir a **`/primegym/panel/equipo/coaches`** (si la ruta no existe, probar `/primegym/panel/gestion/equipo` o similar)
2. Click **"Nuevo Coach"**
3. Email: `coach1@primegym.pe`, Nombre: `Carlos`, Apellido: `Lopez`
4. Verificar que aparece en la lista ✅

### 8.2 Crear Nutricionista

1. Ir a **`/primegym/panel/equipo/nutricionistas`**
2. Click **"Nuevo Nutricionista"**
3. Email: `nutri1@primegym.pe`, Nombre: `Maria`, Apellido: `Garcia`
4. Verificar que aparece ✅

---

## 9. Test: Gestión → Atletas (con Plan de Membresía)

### 9.1 Crear atleta con plan

1. Ir a **`/primegym/panel/gestion/atletas`**
2. Click **"Nuevo Atleta"**
3. Llenar:

| Campo | Atleta 1 | Atleta 2 |
|-------|----------|----------|
| Nombre | `Juan` | `Pedro` |
| Apellido | `Pérez` | `Ramírez` |
| DNI | `12345678` | `87654321` |
| Celular | `999888777` | `999888666` |
| Email | `juan@email.com` | `pedro@email.com` |
| Plan | `Plan Básico` | `Plan Pro` |
| Inicio | `hoy` | `hoy` |

4. Click **"Registrar"**

**Verificar:**
- ✅ Atleta aparece en la tabla inmediatamente (sin necesidad de F5)
- ✅ Columna "Plan de Suscripción" muestra el nombre del plan
- ✅ Muestra días restantes (30 si es plan mensual)
- ✅ Badge verde "active"

### 9.2 Crear atleta sin plan

1. Repetir el proceso pero seleccionar **"Sin plan"**
2. Verificar que aparece con badge "Sin Plan" ✅

### 9.3 Asignar Coach a atleta

1. Click en checkbox del atleta
2. Click **"Asignar Coach"**
3. Seleccionar `Carlos Lopez`
4. Verificar que aparece en la columna "Coach Asignado" ✅

### 9.4 Asignar Nutricionista

1. Click en checkbox del atleta
2. Click **"Asignar Nutricionista"**
3. Seleccionar `Maria Garcia`
4. Verificar que aparece en la columna "Nutricionista" ✅

### 9.5 Dar de Baja

1. Click en **"⋮"** → **"Dar de Baja"**
2. Confirmar en el diálogo
3. Verificar que el atleta desaparece de la tabla ✅

---

## 10. Test: Finanzas del Gym

### 10.1 Suscripciones

1. Ir a **`/primegym/panel/finanzas/suscripciones`**
2. Deberías ver los atletas con plan:
   - `Juan Pérez` → Plan Básico → Activa → 30 días restantes
   - `Pedro Ramírez` → Plan Pro → Activa → 30 días restantes
3. Verificar cards de métricas (activas, vencidas) ✅

### 10.2 Facturación

1. Ir a **`/primegym/panel/finanzas/facturacion`**
2. Deberías ver:
   - ✅ Card "Ingresos del Mes" con monto (99 + 199 = S/ 298)
   - ✅ Card "Transacciones" = 2
   - ✅ Card "Pago Promedio"
   - ✅ Gráfico "Ingresos Mensuales" (recharts)
   - ✅ Tabla de pagos con atleta, plan, monto, estado "Pagado", fecha
3. Usar filtros: buscar por nombre de atleta ✅
4. Usar filtro de estado ✅

### 10.3 Planes de Precio

1. Ir a **`/primegym/panel/finanzas/planes-precio`**
2. Debería mostrar los mismos planes creados en "Gestión → Planes de Membresía" ✅
   (Nota: esta página puede ser redundante con `/gestion/planes`, verificar consistencia)

---

## 11. Test: Feature Flags (Módulos)

### Desde panel-saas (super_admin)

1. Login como `super@lifefit.pe`
2. Ir a **`/panel-saas/modulos`**
3. Deberías ver los 6 feature flags: Rutinas, Nutrición, Check-in, Retos, Ranking, Coach
4. Verificar que PrimeGym tiene los módulos seleccionados al crearlo ✅

### Desde el gym (gym_admin)

1. Login como `franco_alex_07@hotmail.com`
2. Ir a **`/primegym/panel/sistema/configuracion`**
3. Verificar que hay un apartado de módulos/feature flags ✅

---

## 12. Test: Panel SaaS (Super Admin)

Login como `super@lifefit.pe` y probar:

| Ruta | Módulo | Qué probar |
|------|--------|------------|
| `/panel-saas` | Dashboard | KPIs globales, gráficos |
| `/panel-saas/gimnasios` | Gimnasios | CRUD, ver PrimeGym, editar, ver detalle |
| `/panel-saas/usuarios` | Usuarios Globales | Buscar franco, juan, pedro, coaches |
| `/panel-saas/suscripciones` | Suscripciones SaaS | Ver suscripción de PrimeGym (activa, plan Básico) |
| `/panel-saas/planes` | Planes de Precio | Ver Básico/Pro/Empresarial, crear/editar |
| `/panel-saas/finanzas` | Facturación SaaS | Ver payments de PrimeGym, gráfico revenue |
| `/panel-saas/anuncios` | Anuncios Globales | Crear anuncio, ver en gyms |
| `/panel-saas/modulos` | Módulos | Activar/desactivar flags globales |
| `/panel-saas/analitica` | Analítica | Ver uso de la plataforma |
| `/panel-saas/configuracion` | Configuración | Placeholder Izipay (disabled) |

---

## 13. Test: Seed Data Adicional (opcional)

Para poblar más datos:

```bash
cd backend

# Rutinas y ejercicios de ejemplo
python manage.py seed_nutrition_plans

# Planes nutricionales
python manage.py seed_nutrition_plans

# Retos
python manage.py seed_challenges

# Datos demo completos (crea PrimeGym con todo poblado)
python manage.py seed_demo_data

# Pagos históricos SaaS (6 meses)
python manage.py seed_payments
```

> **⚠️ Advertencia:** `seed_demo_data` crea su propio PrimeGym. Si ya creaste uno manualmente desde panel-saas, puede haber duplicados. Úsalo solo si empiezas desde cero.

---

## 14. Flujo Completo Esperado (resumen)

```
Super Admin crea PrimeGym desde panel-saas
        │
        ▼
Gym Admin (franco) hace login + crea Planes de Membresía
        │
        ▼
Gym Admin crea Coaches + Nutricionistas (staff)
        │
        ▼
Gym Admin crea Atletas (con/sin plan) ← auto-genera GymSubscription + GymPayment
        │
        ▼
Atletas aparecen en Suscripciones (con plan, días restantes)
        │
        ▼
Pagos aparecen en Facturación (monto, gráfico, métricas)
        │
        ▼
Super Admin ve todo desde panel-saas (gimnasios, usuarios, finanzas)
```

---

## 15. Posibles Problemas y Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 al crear subscription | Token expirado | Refresh automático, o reloguear |
| 400 "gym is required" | Serializer sin read_only gym | Ya corregido en `GymSubscriptionSerializer` |
| Plan no aparece en tabla | `parseInt` en UUID | Ya corregido, envía string UUID |
| "? días restantes" | `end_date` no calculado | Ya corregido en `perform_create` |
| Atleta no aparece tras crear | Error silencioso en subcription | Ya corregido, fetch en finally + try separado |
| No llega email de invitación | Sin servidor SMTP configurado | Usar `set_password` en shell como en paso 5 |
| Doble click crea 2 atletas | Race condition en submit | Ya corregido con `useRef` guard |
