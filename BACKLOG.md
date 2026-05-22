# LifeFit — Backlog Completo

> Generado el 2026-05-22. Organizado para delegar a agentes de IA.

---

## FASE 1: MVP TESIS (Módulos SaaS pendientes)

---

### 1. Suscripciones — `panel-saas/suscripciones`

**Estado:** Frontend NO existe. Backend incompleto.

#### Backend

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 1.1 | Agregar `gym_name`, `gym_slug` flat fields a `SubscriptionSerializer` | `backend/subscriptions/serializers.py` | Agregar `gym_name = serializers.CharField(source="owner_gym.name", read_only=True)` y `gym_slug = serializers.CharField(source="owner_gym.slug", read_only=True)` |
| 1.2 | Agregar SearchFilter + OrderingFilter a `SubscriptionViewSet` | `backend/subscriptions/views.py` | `search_fields = ["owner_gym__name", "plan__name", "owner_user__email"]`, `ordering_fields = ["start_date", "end_date", "status"]` |
| 1.3 | Agregar filtros por query params (status, plan) | `backend/subscriptions/views.py` | Filtrar `get_queryset` por `self.request.query_params.get("status")` y `plan` |
| 1.4 | Agregar action `change_plan` | `backend/subscriptions/views.py` | `@action(detail=True, methods=["patch"])` — cambia `plan` y recalcula `next_billing_date`. Validar que el plan exista y esté activo |
| 1.5 | Agregar action `cancel` | `backend/subscriptions/views.py` | `@action(detail=True, methods=["post"])` — setea `cancel_at_period_end=True` |
| 1.6 | Agregar action `renew` | `backend/subscriptions/views.py` | `@action(detail=True, methods=["post"])` — reactiva: `cancel_at_period_end=False`, `status=active` |
| 1.7 | Agregar `owner_user__email` al select_related | `backend/subscriptions/views.py` | `.select_related("plan", "owner_gym", "owner_user")` (owner_user ya está) |

#### Frontend

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 1.8 | Agregar tipo `SubscriptionStatus` | `frontend/src/lib/types.ts` | `type SubscriptionStatus = 'active' \| 'past_due' \| 'canceled' \| 'incomplete'` |
| 1.9 | Verificar que `Subscription` type existe con gimnasio | `frontend/src/lib/types.ts` | Debe tener `owner_gym`, `owner_user`, `plan`, `plan_detail`, `status`, `start_date`, `end_date`, `next_billing_date`, `cancel_at_period_end` |
| 1.10 | Crear página de Suscripciones | `frontend/src/app/panel-saas/suscripciones/page.tsx` | Layout: cards de stats arriba (activas, atrasadas, canceladas, MRR), tabla con columnas (Gimnasio, Plan, Precio, Estado, Próximo pago, Acciones). Usar `GET /api/subscriptions/subscriptions/` |
| 1.11 | Badges de estado por color | `frontend/src/app/panel-saas/suscripciones/page.tsx` | active=verde, past_due=ámbar, canceled=rojo, incomplete=gris |
| 1.12 | Dropdown de acciones por fila | `frontend/src/app/panel-saas/suscripciones/page.tsx` | Menú con: Change Plan, Cancel, Renew. Usar `<DropdownMenu>` de shadcn |
| 1.13 | Modal Create Subscription | `frontend/src/app/panel-saas/suscripciones/page.tsx` | Formulario: seleccionar gym (búsqueda), seleccionar plan, fechas. Dialog shadcn |
| 1.14 | Modal Change Plan | `frontend/src/app/panel-saas/suscripciones/page.tsx` | Selector de plan, confirmación, llama a `PATCH /api/subscriptions/subscriptions/{id}/change_plan/` |
| 1.15 | Detail Drawer con timeline | `frontend/src/app/panel-saas/suscripciones/page.tsx` | Sheet con detalle completo + historial de pagos (si existe) |
| 1.16 | Paginación + Search + Filtros | `frontend/src/app/panel-saas/suscripciones/page.tsx` | Input de búsqueda, select de status, paginación |
| 1.17 | Agregar "Suscripciones" al sidebar | `frontend/src/app/panel-saas/layout.tsx` | En grupo Finanzas, entre Planes de Precio y Facturación. Icono: `CreditCard` o `FileText` |
| 1.18 | Seed data: crear subscriptions si no existen | `backend/subscriptions/management/commands/seed_subscriptions.py` (nuevo) | Crear una suscripción activa por cada gym existente con plan aleatorio |

---

### 2. Feature Flags / Módulos — `panel-saas/modulos`

**Estado:** No existe (backend ni frontend). Depende de `SubscriptionPlan.features` (dict de booleanos).

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 2.1 | Decidir arquitectura | — | Opción A: Usar `SubscriptionPlan.features` directamente (ya existe). Opción B: Crear modelo `ModuleFlag(gym, module_key, enabled)`. Recomiendo A para MVP |
| 2.2 | Crear permission class `HasModuleEnabled` | `backend/core/permissions.py` | Toma `module_key` como parámetro, verifica que el gym del usuario tenga `features[module_key] = True` en su plan activo |
| 2.3 | Crear endpoint de módulos disponibles | `backend/subscriptions/views.py` o app nueva | `GET /api/subscriptions/modules/` — retorna lista de todos los feature keys con nombre y descripción |
| 2.4 | Crear endpoint módulos por gym | `backend/subscriptions/views.py` | `GET /api/subscriptions/gym-modules/{gym_id}/` — retorna qué módulos tiene activos un gym específico |
| 2.5 | Crear página Módulos | `frontend/src/app/panel-saas/modulos/page.tsx` | Tabla: Gimnasio \| Rutinas (toggle) \| Nutrición (toggle) \| Retos (toggle) \| Ranking (toggle) \| Checkin (toggle) \| Coach (toggle). Usar `<Switch />` de shadcn |
| 2.6 | Guardar cambios de toggle | `frontend/src/app/panel-saas/modulos/page.tsx` | PATCH al plan del gym para actualizar features dict |
| 2.7 | Agregar "Módulos" al sidebar | `frontend/src/app/panel-saas/layout.tsx` | Grupo "Sistema" o "Operaciones". Icono: `ToggleLeft` o `Settings` |

---

### 3. Dashboard SaaS — `panel-saas/page.tsx`

**Estado:** Mock data (hardcoded $12,450 MRR, 48 gyms, etc.)

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 3.1 | Crear endpoint `GET /api/analytics/dashboard/` | `backend/subscriptions/views.py` o nuevo | Retorna: `total_gyms`, `active_gyms`, `total_users`, `total_athletes`, `mrr`, `active_subscriptions`, `new_gyms_this_month`, `revenue_this_month`, `pending_payments` |
| 3.2 | Reemplazar mock data en dashboard | `frontend/src/app/panel-saas/page.tsx` | Llamar al endpoint real, mostrar KPIs con formato de moneda S/ |
| 3.3 | Agregar mini charts de tendencia | `frontend/src/app/panel-saas/page.tsx` | Últimos 6 meses: gyms nuevos y revenue (Recharts mini area charts) |
| 3.4 | Loading / Error states | `frontend/src/app/panel-saas/page.tsx` | Skeleton mientras carga, alerta si falla |

---

### 4. Anuncios Globales — `panel-saas/anuncios`

**Estado:** No existe.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 4.1 | Crear modelo `GlobalAnnouncement` | Nueva app `announcements` o `core/models.py` | `title`, `message`, `type` (info/warning/success/error), `is_active`, `starts_at`, `ends_at`, `created_by` (FK User) |
| 4.2 | Crear migration | — | `python manage.py makemigrations && python manage.py migrate` |
| 4.3 | Crear ViewSet `GlobalAnnouncementViewSet` | `announcements/views.py` | CRUD para super_admin. Action adicional `active` que retorna solo los vigentes |
| 4.4 | Registrar URLs | `announcements/urls.py` + `config/urls.py` | `api/announcements/` |
| 4.5 | Crear página Anuncios | `frontend/src/app/panel-saas/anuncios/page.tsx` | Lista de anuncios con status, CRUD modal, toggle active/inactive |
| 4.6 | Crear componente `<GlobalBanner />` | `frontend/src/components/GlobalBanner.tsx` | Banner que se muestra arriba del layout, llama a `GET /api/announcements/active/`. Diferente color por tipo |
| 4.7 | Integrar GlobalBanner en layout | `frontend/src/app/panel-saas/layout.tsx` y `[gymId]/panel/layout.tsx` | Renderizar `<GlobalBanner />` arriba del main content |
| 4.8 | Agregar "Anuncios" al sidebar | `frontend/src/app/panel-saas/layout.tsx` | Grupo "Sistema". Icono: `Megaphone` o `Bell` |

---

### 5. Analítica de Uso — `panel-saas/analitica`

**Estado:** No existe.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 5.1 | Crear endpoint gyms por mes | `backend/analytics/views.py` (nuevo) | `GET /api/analytics/usage/gyms/` — `Gym.objects.annotate(month=TruncMonth("created_at")).values("month").annotate(count=Count("id"))` |
| 5.2 | Crear endpoint usuarios por rol | `backend/analytics/views.py` | `GET /api/analytics/usage/users/` — `User.objects.values("role").annotate(count=Count("id"))` |
| 5.3 | Crear endpoint sesiones de workout | `backend/analytics/views.py` | `GET /api/analytics/usage/workouts/` — sesiones completadas por mes |
| 5.4 | Crear endpoint engagement (DAU/MAU) | `backend/analytics/views.py` | `GET /api/analytics/engagement/` — usuarios activos por día/semana/mes |
| 5.5 | Registrar URLs analytics | `config/urls.py` | `api/analytics/` |
| 5.6 | Crear página Analítica | `frontend/src/app/panel-saas/analitica/page.tsx` | Layout con tabs o secciones. Charts con Recharts: barras (gyms/mes), línea (workouts/mes), dona (roles), tabla de gimnasios con métricas |
| 5.7 | Agregar "Analítica" al sidebar | `frontend/src/app/panel-saas/layout.tsx` | Grupo "Sistema". Icono: `BarChart3` o `TrendingUp` |

---

## FASE 2: GYM ADMIN PANEL (Mejoras)

---

### 6. Dashboard Gimnasio — `[gymId]/panel/page.tsx`

**Estado:** KPIs muestran 0 (mock).

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 6.1 | Crear endpoint `GET /api/gyms/{id}/dashboard/` | `backend/gyms/views.py` | Retorna: `total_athletes`, `total_coaches`, `total_nutritionists`, `total_receptionists`, `today_checkins`, `active_challenges`, `weekly_workouts`, `membership_stats` |
| 6.2 | Reemplazar KPIs mock en frontend | `frontend/src/app/[gymId]/panel/page.tsx` | Llamar endpoint real, mostrar valores con skeletons |
| 6.3 | Agregar mini charts | `frontend/src/app/[gymId]/panel/page.tsx` | Workouts semanales (bar), asistencias (line) |

---

### 7. Rutinas — Frontend para Atletas/Coaches

**Estado:** Backend completo (Exercise, WorkoutRoutine, WorkoutSession). Frontend NO existe en gym panel.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 7.1 | Lista de rutinas del gym | `frontend/src/app/[gymId]/panel/rutinas/page.tsx` | Tabla con nombre, nivel, duración, status. CRUD con modal. Llamar `GET /api/workouts/routines/` |
| 7.2 | Detalle de rutina | `frontend/src/app/[gymId]/panel/rutinas/[id]/page.tsx` | Lista de ejercicios en orden, sets, reps, peso. Botón "Iniciar sesión" |
| 7.3 | CRUD de ejercicios del gym | `frontend/src/app/[gymId]/panel/ejercicios/page.tsx` | Tabla + modal para crear/editar ejercicio. Llamar `GET/POST/PUT/DELETE /api/workouts/exercises/` |
| 7.4 | Componente ExerciseSelector | `frontend/src/components/workouts/ExerciseSelector.tsx` | Selector con búsqueda y filtro por categoría/músculo |
| 7.5 | Componente WorkoutLogger | `frontend/src/components/workouts/WorkoutLogger.tsx` | Para atletas: marcar sets completados, timer, nota. POST a `api/workouts/sessions/` |
| 7.6 | Vista atleta: mis rutinas | `frontend/src/app/[gymId]/panel/mis-rutinas/page.tsx` | Rutinas asignadas al atleta, historial de sesiones |
| 7.7 | Agregar al sidebar del gym | `frontend/src/app/[gymId]/panel/layout.tsx` | Links a Rutinas y Ejercicios |

---

### 8. Nutrición — Frontend para Atletas/Coaches

**Estado:** Backend completo (NutritionPlan, MealTemplate, UserMealLog). Frontend NO existe en gym panel.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 8.1 | Lista de planes nutricionales | `frontend/src/app/[gymId]/panel/planes-nutricionales/page.tsx` | CRUD de planes. Llamar `GET/POST/PUT/DELETE /api/nutrition/plans/` |
| 8.2 | Detalle de plan con meals por día | `frontend/src/app/[gymId]/panel/planes-nutricionales/[id]/page.tsx` | Tabs por día, cada día muestra meals con calorías y macros. Usar `NutritionPlanDay` |
| 8.3 | Mejorar componente NutritionPlanDay | `frontend/src/components/nutrition/NutritionPlanDay.tsx` | Agregar edición de ingredientes, instrucciones, persistencia |
| 8.4 | Vista atleta: mi plan | `frontend/src/app/[gymId]/panel/mi-plan/page.tsx` | Muestra plan asignado y log diario (marcar meals como completadas) |
| 8.5 | Componente MealLogger | `frontend/src/components/nutrition/MealLogger.tsx` | Checkbox por meal, POST a `api/nutrition/meal-logs/` |
| 8.6 | Componente PlanAssignmentModal | `frontend/src/components/nutrition/PlanAssignmentModal.tsx` | Asignar plan a atleta: seleccionar atleta + plan + fechas |
| 8.7 | Agregar al sidebar del gym | `frontend/src/app/[gymId]/panel/layout.tsx` | Links a Planes Nutricionales |

---

### 9. Retos/Challenges — Frontend

**Estado:** Backend completo. `ChallengeManagement` component existe pero sin ruta.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 9.1 | Conectar ChallengeManagement a ruta | `frontend/src/app/[gymId]/panel/retos/page.tsx` | Crear página que renderiza `<ChallengeManagement />` con `gymId` |
| 9.2 | Vista atleta: mis retos | `frontend/src/app/[gymId]/panel/mis-retos/page.tsx` | Lista de retos activos, progreso (barra), botón "Unirse" |
| 9.3 | Agregar al sidebar del gym | `frontend/src/app/[gymId]/panel/layout.tsx` | Links a Retos |

---

### 10. Ranking / Leaderboard

**Estado:** Backend endpoint `GET /api/challenges/progress/leaderboard/` existe. Frontend NO.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 10.1 | Crear página Ranking | `frontend/src/app/[gymId]/panel/ranking/page.tsx` | Tabla de posiciones: puesto, avatar, nombre, nivel, puntos. Filtro: semana/mes/todos |
| 10.2 | Medallas para top 3 | `frontend/src/app/[gymId]/panel/ranking/page.tsx` | 🥇🥈🥉 en los primeros 3 puestos |
| 10.3 | Agregar al sidebar del gym | `frontend/src/app/[gymId]/panel/layout.tsx` | Link a Ranking |

---

### 11. Perfil de Usuario

**Estado:** No existe.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 11.1 | Crear página Perfil | `frontend/src/app/[gymId]/panel/perfil/page.tsx` | Foto (upload), nombre, email, cambiar contraseña, badges/logros |
| 11.2 | Endpoint cambiar foto | `backend/accounts/views.py` | PATCH a `api/auth/me/` con avatar |

---

### 12. Registro con API Real

**Estado:** Mock (setTimeout simulation).

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 12.1 | Conectar RegisterForm a API real | `frontend/src/components/auth/RegisterForm.tsx` | Reemplazar setTimeout por `POST /api/auth/register/` |

---

## FASE 3: INFRAESTRUCTURA & TESTS

---

### 13. Tests Backend

**Estado:** Todos los `tests.py` están vacíos (solo imports).

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 13.1 | Setup pytest | `backend/pytest.ini` o `pyproject.toml` | `pip install pytest pytest-django factory-boy pytest-cov` |
| 13.2 | Tests de accounts | `backend/accounts/tests.py` | Login, registro, Google OAuth, cambio password, roles, gym-members CRUD |
| 13.3 | Tests de gyms | `backend/gyms/tests.py` | CRUD gyms, branches, filtros por rol, público vs autenticado |
| 13.4 | Tests de workouts | `backend/workouts/tests.py` | CRUD ejercicios, rutinas, routine-exercises, sesiones, N+1 queries |
| 13.5 | Tests de challenges | `backend/challenges/tests.py` | CRUD, join challenge, leaderboard, badges, user-progress |
| 13.6 | Tests de nutrition | `backend/nutrition/tests.py` | CRUD planes, meal-templates, meal-logs, asignaciones, toggle_complete |
| 13.7 | Tests de subscriptions | `backend/subscriptions/tests.py` | CRUD planes, suscripciones, pagos, acciones change_plan/cancel/renew, metrics |

---

### 14. Tests Frontend

**Estado:** No existen.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 14.1 | Setup vitest + RTL | `frontend/vitest.config.ts` | `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom` |
| 14.2 | Tests de api.ts | `frontend/src/lib/__tests__/api.test.ts` | Mock fetch, test get/post/put/patch/delete, auto-refresh en 401, FormData |
| 14.3 | Tests de auth.ts | `frontend/src/lib/__tests__/auth.test.ts` | localStorage mock, getToken, setTokens, clearAuth, auth event |
| 14.4 | Tests de LoginForm | `frontend/src/components/auth/__tests__/LoginForm.test.tsx` | Render, submit, error states |
| 14.5 | Tests de StaffList | `frontend/src/components/team/__tests__/StaffList.test.tsx` | Render list, empty state, loading |

---

### 15. Despliegue / DevOps

**Estado:** No iniciado.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 15.1 | Dockerfile backend | `backend/Dockerfile` | Python 3.11 + Django + Gunicorn, port 8000 |
| 15.2 | Dockerfile frontend | `frontend/Dockerfile` | Node 18 + Next.js standalone output, port 3000 |
| 15.3 | Docker Compose | `docker-compose.yml` | Servicios: backend, frontend, postgres, redis (opcional) |
| 15.4 | GitHub Actions CI | `.github/workflows/ci.yml` | Lint + test (backend/frontend) + build en cada PR |
| 15.5 | Configurar Render/Railway | — | Deploy automático desde main branch |
| 15.6 | Variables de entorno | `.env.production` | Configurar DB, JWT, CORS, Google OAuth para producción |

---

### 16. Self-Service Onboarding

**Estado:** Solo documentado en `SAAS_AUTOMATION.md`.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 16.1 | Refactor Subscription model | `backend/subscriptions/models.py` | Agregar `gateway_subscription_id`, `gateway_customer_id` para tracking |
| 16.2 | Crear webhook handler | `backend/subscriptions/views.py` | `POST /api/webhooks/izipay/` — validar firma, crear Payment, activar Subscription |
| 16.3 | Crear página /precios | `frontend/src/app/precios/page.tsx` | Mostrar planes con precios, feature list, botón "Empezar" |
| 16.4 | Flujo de registro con checkout | `frontend/src/app/precios/checkout/page.tsx` | Formulario: datos del gym, email, nombre → redirect a Izipay |
| 16.5 | Página de éxito | `frontend/src/app/precios/exito/page.tsx` | Confirmación, credenciales de acceso |

---

### 17. Izipay Integration (Pagos Reales)

**Estado:** Blocked, después de MVP.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 17.1 | Integrar SDK Izipay | `backend/requirements.txt` | `pip install izipay-sdk` o requests directas a API REST |
| 17.2 | Endpoint crear pago | `backend/subscriptions/views.py` | `POST /api/subscriptions/payments/create-checkout/` — crea orden en Izipay, retorna URL de checkout |
| 17.3 | Webhook confirmación | `backend/subscriptions/views.py` | Recibir POST de Izipay, validar firma, crear Payment + actualizar Subscription |
| 17.4 | Frontend: checkout flow | `frontend/src/app/panel-saas/finanzas/checkout/page.tsx` | Redirigir a Izipay, mostrar resultado |

---

### 18. Gamificación Frontend

**Estado:** Backend completo (UserPoints, UserProgress). Sin frontend.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 18.1 | Mostrar puntos/nivel en sidebar | `frontend/src/app/[gymId]/panel/layout.tsx` | En el header o sidebar, mostrar puntos y nivel del usuario logueado |
| 18.2 | Página de badges ganados | `frontend/src/app/[gymId]/panel/logros/page.tsx` | Grid de badges, mostrar cuáles tiene el usuario, cuáles faltan |
| 18.3 | Toast al ganar puntos | `frontend/src/components/ui/SonnerToast.tsx` | Notificación cuando usuario completa acción y gana puntos (trigger desde API response) |

---

## FASE 4: POLISH & CONFIG

---

### 19. Zona Horaria / Moneda Perú

**Estado:** Pendiente en `ToDo.md`.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 19.1 | Configurar TIME_ZONE | `backend/config/settings.py` | `TIME_ZONE = 'America/Lima'` |
| 19.2 | Currency default PEN | `backend/subscriptions/models.py` | En SubscriptionPlan y Payment, default `currency = "PEN"` |
| 19.3 | Seed data en S/ | `backend/subscriptions/management/commands/seed_plans.py` | Precios en soles: 99, 249, 499 |

---

### 20. Límites de Uso (Capacity Planning)

**Estado:** Pendiente en `ToDo.md`.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 20.1 | Validar límites al crear atleta | `backend/accounts/views.py` | GymMemberViewSet: antes de crear miembro, verificar `gym.max_athletes` |
| 20.2 | Validar límites al crear coach | `backend/accounts/views.py` | Verificar `gym.max_coaches` |
| 20.3 | Validar límites al crear nutritionist | `backend/accounts/views.py` | Verificar `gym.max_nutritionists` |
| 20.4 | Barra de progreso en frontend | `frontend/src/app/[gymId]/panel/atletas/page.tsx` | Mostrar "15/50 atletas" con barra de progreso |
| 20.5 | Alerta al acercarse al límite | `frontend/src/components/team/StaffList.tsx` | Si >=80% del límite, mostrar badge amarillo |

---

### 21. Onboarding con Invitación (Magic Link)

**Estado:** Pendiente en `ToDo.md`.

| # | Tarea | Archivo | Descripción |
|---|-------|---------|-------------|
| 21.1 | Endpoint de invitación | `backend/accounts/views.py` | `POST /api/auth/invite/` — crear usuario con rol gym_admin, enviar email con token |
| 21.2 | Envío de email | `backend/accounts/utils.py` | Usar SendGrid / SMTP para enviar magic link |
| 21.3 | Página de aceptar invitación | `frontend/src/app/unirse/[token]/page.tsx` | Formulario para setear contraseña, llama a `POST /api/auth/set-password/` |

---

## 📊 ARCHIVOS A CREAR (Resumen)

### Nuevos archivos backend:
```
backend/subscriptions/management/commands/seed_subscriptions.py
backend/announcements/models.py
backend/announcements/views.py
backend/announcements/serializers.py
backend/announcements/urls.py
backend/analytics/views.py
backend/analytics/urls.py
backend/Dockerfile
```

### Nuevos archivos frontend:
```
frontend/src/app/panel-saas/suscripciones/page.tsx
frontend/src/app/panel-saas/modulos/page.tsx
frontend/src/app/panel-saas/anuncios/page.tsx
frontend/src/app/panel-saas/analitica/page.tsx
frontend/src/app/panel-saas/planes/subscriptions/page.tsx (nuevo)
frontend/src/app/[gymId]/panel/rutinas/page.tsx
frontend/src/app/[gymId]/panel/rutinas/[id]/page.tsx
frontend/src/app/[gymId]/panel/ejercicios/page.tsx
frontend/src/app/[gymId]/panel/mis-rutinas/page.tsx
frontend/src/app/[gymId]/panel/planes-nutricionales/page.tsx
frontend/src/app/[gymId]/panel/planes-nutricionales/[id]/page.tsx
frontend/src/app/[gymId]/panel/mi-plan/page.tsx
frontend/src/app/[gymId]/panel/retos/page.tsx
frontend/src/app/[gymId]/panel/mis-retos/page.tsx
frontend/src/app/[gymId]/panel/ranking/page.tsx
frontend/src/app/[gymId]/panel/perfil/page.tsx
frontend/src/app/[gymId]/panel/logros/page.tsx
frontend/src/app/precios/page.tsx
frontend/src/app/precios/checkout/page.tsx
frontend/src/components/GlobalBanner.tsx
frontend/src/components/workouts/ExerciseSelector.tsx
frontend/src/components/workouts/WorkoutLogger.tsx
frontend/src/components/nutrition/MealLogger.tsx
frontend/src/components/nutrition/PlanAssignmentModal.tsx
frontend/Dockerfile
docker-compose.yml
.github/workflows/ci.yml
```

---

## 🚀 ORDEN DE EJECUCIÓN RECOMENDADO

```
FASE 1 (MVP TESIS — Prioridad máxima):
  1. Suscripciones (Backend + Frontend)
  2. Dashboard SaaS (reemplazar mock)
  3. Feature Flags / Módulos
  4. Anuncios Globales
  5. Analítica de Uso

FASE 2 (GYM PANEL — Prioridad media):
  6. Dashboard Gimnasio (reemplazar mock)
  7. Rutinas Frontend
  8. Nutrición Frontend
  9. Retos Frontend
  10. Ranking / Leaderboard
  11. Perfil de Usuario
  12. Registro con API Real

FASE 3 (INFRA + TESTS — Prioridad media-alta):
  13. Tests Backend
  14. Tests Frontend
  15. Despliegue / DevOps

FASE 4 (POST-MVP — Prioridad baja):
  16. Self-Service Onboarding
  17. Izipay Integration
  18. Gamificación Frontend
  19-21. Config & Polish
```
