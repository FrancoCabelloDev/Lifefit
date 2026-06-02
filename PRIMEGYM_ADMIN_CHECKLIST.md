# PrimeGYM — Checklist de Funcionalidades (Admin)

> Estado: **Completado** ✅ | Pendiente ⬜ | Parcial 🟡
> Fecha: Junio 2026

---

## 1. Panel Principal (Dashboard)

| Funcionalidad | Estado | Notas |
|---|---|---|
| KPIs: atletas, coaches, sesiones, check-ins | ✅ | Según rol del usuario |
| Gráfico de compliance (línea) | ✅ | Recharts |
| Tabla de check-ins recientes | ✅ | |
| Lista de atletas asignados (para coaches) | ✅ | |
| Compatibilidad multi-rol | ✅ | Admin / Coach / Nutritionist / Athlete |

---

## 2. Gestión de Atletas (`/panel/gestion/atletas`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Lista con búsqueda | ✅ | |
| Crear atleta (nombre, email, DNI, teléfono, plan) | ✅ | Modal con formulario completo |
| Editar atleta | ✅ | |
| Eliminar atleta | ✅ | Con confirmación |
| Perfil individual `/gestion/atletas/[id]` | ✅ | Historial de check-ins, rutinas, nutrición, badges |
| Invitar atleta (link de registro) | ✅ | Envía email con enlace |
| Filtrar por plan de membresía | ✅ | |
| **Límite de atletas (max_athletes)** | ✅ **NUEVO** | Validado al crear desde panel y al auto-registrarse |

---

## 3. Mi Equipo (`/panel/equipo/`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Lista de staff por rol | ✅ | |
| Invitar coach | ✅ | |
| Invitar nutricionista | ✅ | |
| Invitar recepción | ✅ | |
| Asignaciones coach ↔ atleta | ✅ | |
| Asignaciones nutritionist ↔ atleta | ✅ | |
| **Límite de coaches (max_coaches)** | ✅ **NUEVO** | Validado al invitar |
| **Límite de nutricionistas (max_nutritionists)** | ✅ **NUEVO** | Validado al invitar |

---

## 4. Check-ins (`/panel/gestion/checkins`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Lista de check-ins del día | ✅ | |
| Búsqueda por atleta | ✅ | |
| Registro manual de check-in | ✅ | |
| **QR auto-check-in** | ✅ **NUEVO** | QR dinámico con `qrcode.react`, descarga PNG |
| Stats (hoy, tendencia semanal) | ✅ | |

---

## 5. Planes de Membresía (`/panel/gestion/planes`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Lista de planes (cards) | ✅ | |
| Crear plan (nombre, precio, duración, features) | ✅ | |
| Editar plan | ✅ | |
| Eliminar plan | ✅ | |
| Toggle activo/inactivo | ✅ | |

---

## 6. Entrenamiento

### Ejercicios (`/panel/entrenamiento/ejercicios`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| CRUD completo | ✅ | Categoría, grupo muscular, equipo |

### Rutinas (`/panel/entrenamiento/rutinas`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| CRUD de rutinas | ✅ | Nivel, duración, estado |
| Ejercicios anidados (series, reps, peso, descanso) | ✅ | |
| Asignar rutina a atletas | ✅ | |
| Logging de sesiones (athlete) | ✅ | |

---

## 7. Nutrición (`/panel/nutricion/planes-nutricionales`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| CRUD de planes | ✅ | Macros, duración, estado |
| Meal templates por día y tipo de comida | ✅ | 7 días, 4 comidas |
| Asignar plan a atleta | ✅ | |
| Meal logging (athlete marca comidas) | ✅ | |

---

## 8. Gamificación

### Retos (`/panel/gamificacion/retos`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| CRUD de retos | ✅ | Tipos: asistencia, distancia, workouts, nutrición, mixto |
| Participación de atletas con progreso | ✅ | |

### Ranking (`/panel/gamificacion/ranking`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| Leaderboard global | ✅ | Top 3 con medallas |
| XP, nivel, barra de progreso | ✅ | |
| **Solo muestra atletas (no admins)** | ✅ **CORREGIDO** | Admin `franco_alex_07` ya no aparece |

### Badges / Logros
| Funcionalidad | Estado | Notas |
|---|---|---|
| CRUD de badges | ✅ | |
| Badges del atleta (`/mis-logros`) | ✅ | |

---

## 9. Finanzas (`/panel/finanzas/`)

### Planes de Precio (`/panel/finanzas/planes-precio`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| CRUD completo | ✅ | Cards con precio, duración, features |
| Toggle activo/inactivo | ✅ | |

### Suscripciones (`/panel/finanzas/suscripciones`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| Tabla read-only de atletas suscritos | ✅ | Plan, estado, fechas, precio |
| Asignación atleta↔plan | ✅ | Se hace desde **Atletas** |
| Filtro por búsqueda | ✅ | |

### Facturación (`/panel/finanzas/facturacion`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| Métricas (total cobrado, este mes, pendientes, fallidos) | ✅ | Cards |
| **Gráfico de ingresos mensuales** | ✅ **NUEVO** | Recharts LineChart, últimos 6 meses |
| Tabla de pagos (read-only) | ✅ | Filtro por estado, paginación |
| Endpoint `/revenue_history/` | ✅ **NUEVO** | Datos agrupados por mes |

---

## 10. Sistema

### Configuración del Gimnasio (`/panel/sistema/configuracion`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| Editar nombre, descripción, ubicación | ✅ | |
| Subir logo (con preview) | ✅ | |
| Color de marca, RUC, web, email | ✅ | |
| Subir QR de check-in | ✅ | |

### Perfil (`/panel/sistema/perfil`)
| Funcionalidad | Estado | Notas |
|---|---|---|
| Ver/editar datos personales | ✅ | |
| Cambiar contraseña | ✅ | |
| Badges ganados | ✅ | |
| XP y nivel | ✅ | |

### Notificaciones
| Funcionalidad | Estado | Notas |
|---|---|---|
| Campana con contador no leídos | ✅ | Polling cada 15-30s |
| Lista de notificaciones | ✅ | |
| Marcar como leídas | ✅ | |

---

## 11. Infraestructura / Configuración Global

| Funcionalidad | Estado | Notas |
|---|---|---|
| **TIME_ZONE = America/Lima** | ✅ **CORREGIDO** | Antes estaba en UTC |
| Soft-delete (`deleted_at`) | ✅ | Gimnasios, branches, asignaciones |
| Migraciones aplicadas | ✅ | 0 pendientes |
| `python manage.py check` | ✅ | 0 issues |
| `npx tsc --noEmit` | ✅ | 0 errors |

---

## 12. SaaS Panel (Super Admin) — `/panel-saas/`

| Funcionalidad | Estado | Notas |
|---|---|---|
| Dashboard con MRR, gimnasios activos, atletas globales | ✅ | KPIs + charts |
| Gestión de gimnasios (crear, editar, impersonar) | ✅ | Con módulos y límites |
| Usuarios globales | ✅ | Read-only |
| Suscripciones SaaS (CRUD + change plan + cancel/renew) | ✅ | |
| Planes de Precio SaaS (drag & drop reorder) | ✅ | |
| Facturación SaaS (MRR, ARR, revenue chart) | ✅ | Read-only |
| Anuncios globales | ✅ | CRUD |
| Feature Flags / Módulos | ✅ | CRUD global |
| Analítica de uso | ✅ | Charts de engagement, usuarios, gyms |
| Configuración (Izipay) | 🟡 | Placeholder — Fase 4 |

---

## ⬜ Pendientes / Futuro

| Funcionalidad | Prioridad | Notas |
|---|---|---|
| Tests automatizados | Alta | Archivos vacíos |
| Página pública de precios / Self-onboarding | Media | SAAS_AUTOMATION.md |
| Integración Izipay | Baja | Placeholder en configuración |
| Docker / CI-CD | Baja | Sin deploy config |
| Banner de gimnasio inactivo | Baja | UI de advertencia |
| Ruta pública `/{gymSlug}/checkin/qr` | Baja | Auto-check-in por QR |

---

> **Resumen:** 42/43 funcionalidades clave completadas. El panel de PrimeGYM para admin está **listo para pruebas de aceptación**.
