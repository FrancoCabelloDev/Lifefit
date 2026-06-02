# Guia de Pruebas - PrimeGym

> Fecha: Junio 2026
> Proposito: Verificar todas las funcionalidades del sistema LifeFit con datos reales.

---

## 1. Datos de Acceso

| Rol | Email | Como acceder |
|-----|-------|-------------|
| Super Admin | `admin@lifefit.com` | Login directo (password de `createsuperuser`) |
| Gym Admin (PrimeGym) | `franco_alex_07@hotmail.com` | Super Admin -> "Entrar como Admin" |
| Coach | `coach@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Mi Equipo |
| Nutricionista | `nutricionista@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Mi Equipo |
| Recepcion | `recepcion@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Mi Equipo |
| Atleta 1 | `atleta1@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Atletas |
| Atleta 2 | `atleta2@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Atletas |
| Atleta 3 | `atleta3@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Atletas |
| Atleta 4 | `atleta4@primegym.com` | Super Admin -> "Entrar como Admin" -> boton "Entrar como" en Atletas |

> **Importante:** Ningun usuario distinto del Super Admin tiene contrasena configurable. Todos los accesos se realizan mediante la cadena de impersonacion. No es necesario conocer las contrasenas de estos usuarios.

---

## 2. Flujo de Pruebas por Rol

### 2.1 Super Admin (`/panel-saas`)

**Dashboard:**
- [ ] Ingresa con `admin@lifefit.com`
- [ ] Verifica que veas KPIs: MRR, Gimnasios Activos, Atletas, Ingresos
- [ ] Verifica los graficos de tendencia

**Gimnasios:**
- [ ] Ve a Gimnasios Asociados
- [ ] Verifica que PrimeGym aparece en la lista con Plan "Pro"
- [ ] Haz clic en "Modulos" de PrimeGym - deben estar todos activos (Rutinas, Nutricion, Check-in, Retos, Ranking, Coach)
- [ ] Haz clic en "Entrar como Admin" - debe redirigir al panel de PrimeGym
- [ ] En la barra superior, aparece el boton "Volver a Admin"

**Suscripciones:**
- [ ] Ve a Suscripciones
- [ ] Verifica que PrimeGym aparece con estado "Activo" y plan "Pro"

**Planes de Precio:**
- [ ] Ve a Planes de Precio
- [ ] Verifica los 3 planes: Basico (S/99), Pro (S/249), Empresarial (S/499)
- [ ] Prueba arrastrar para reordenar (drag & drop)

**Anuncios:**
- [ ] Crea un anuncio de prueba con tipo "info"
- [ ] Verifica que aparece en el panel del gym

**Analitica:**
- [ ] Ve a Analitica de Uso
- [ ] Verifica los graficos de entrenamientos, usuarios por rol, gimnasios creados

**Configuracion:**
- [ ] Ve a Configuracion (contiene placeholder de Izipay)

---

### 2.2 Gym Admin - PrimeGym (`/primegym/panel`)

> Accede como Super Admin, ve a Gimnasios Asociados y haz clic en "Entrar como Admin" en PrimeGym.

**Sidebar:**
- [ ] Verifica que se ven todas las secciones:
  - Principal: Resumen
  - Operaciones: Check-in, Gestion (Atletas, Planes), Mi Equipo (Coaches, Nutricionistas, Atencion), Entrenamiento (Ejercicios, Rutinas), Nutricion (Planes Nutricionales), Gamificacion (Retos, Ranking), Finanzas (Suscripciones, Planes de Precio, Facturacion)
  - Sistema: Configuracion, Perfil

**Dashboard:**
- [ ] Verifica KPIs: atletas, coaches, check-ins, sesiones
- [ ] Verifica grafico de compliance

**Gestion de Atletas:**
- [ ] Ve a Gestion > Atletas
- [ ] Verifica la lista de 4 atletas
- [ ] Busca por nombre "Pedro"
- [ ] Haz clic en un atleta para ver su perfil individual
- [ ] Verifica que muestra: historial de check-ins, rutinas, nutricion, badges

**Check-in:**
- [ ] Ve a Operaciones > Check-in
- [ ] Verifica lista de check-ins del dia
- [ ] Prueba el QR de auto-check-in

**Membresias:**
- [ ] Ve a Gestion > Planes de Membresia
- [ ] Verifica los 3 planes: Basico (S/79), Estandar (S/129), Premium (S/199)
- [ ] Crea un nuevo plan

**Equipo:**
- [ ] Ve a Mi Equipo
- [ ] Verifica que aparecen Coach y Nutricionista
- [ ] Prueba invitar a un nuevo coach (simulado)

**Entrenamiento:**
- [ ] Ve a Entrenamiento > Ejercicios
- [ ] Verifica los 10 ejercicios creados
- [ ] Crea un nuevo ejercicio
- [ ] Ve a Entrenamiento > Rutinas
- [ ] Verifica las 3 rutinas creadas
- [ ] Haz clic en "Full Body Principiante" para ver detalles
- [ ] Crea una nueva rutina

**Nutricion:**
- [ ] Ve a Nutricion > Planes Nutricionales
- [ ] Verifica los 2 planes: "Plan Definicion" y "Plan Volumen"
- [ ] Haz clic en un plan para ver las comidas por dia

**Gamificacion:**
- [ ] Ve a Gamificacion > Retos
- [ ] Verifica los 3 retos activos
- [ ] Ve a Gamificacion > Ranking
- [ ] Verifica el leaderboard con puntos de atletas

**Finanzas:**
- [ ] Ve a Finanzas > Suscripciones
- [ ] Verifica tabla de atletas suscritos
- [ ] Ve a Finanzas > Planes de Precio
- [ ] Ve a Finanzas > Facturacion
- [ ] Verifica metricas: total cobrado, este mes, pendientes

**Configuracion:**
- [ ] Ve a Sistema > Configuracion
- [ ] Edita nombre del gimnasio, sube logo
- [ ] Ve a Sistema > Perfil
- [ ] Verifica datos personales y badges

---

### 2.3 Coach (`/primegym/panel`)

**Sidebar esperado:**
- Principal: Resumen
- Gestion: Atletas
- Entrenamiento: Ejercicios, Rutinas
- Nutricion: Planes Nutricionales
- Gamificacion: Retos, Ranking
- Cuenta: Perfil

**Pruebas:**
- [ ] Estando impersonando al Gym Admin, ve a Mi Equipo y haz clic en "Entrar como" junto a `coach@primegym.com`
- [ ] Verifica el sidebar (debe ser mas limitado que el admin)
- [ ] Ve a Gestion > Atletas
  - [ ] Verifica los atletas asignados (Pedro, Lucia, Diego)
- [ ] Ve a Entrenamiento > Ejercicios y Rutinas (solo lectura o creacion?)
- [ ] Ve a Gamificacion > Ranking (visualizar posiciones)
- [ ] Ve a Perfil para ver tus datos

---

### 2.4 Nutricionista (`/primegym/panel`)

**Sidebar esperado:**
- Principal: Resumen
- Gestion: Atletas
- Nutricion: Planes Nutricionales
- Gamificacion: Retos, Ranking
- Cuenta: Perfil

**Pruebas:**
- [ ] Estando impersonando al Gym Admin, ve a Mi Equipo y haz clic en "Entrar como" junto a `nutricionista@primegym.com`
- [ ] Ve a Gestion > Atletas (verifica los asignados)
- [ ] Ve a Nutricion > Planes Nutricionales
- [ ] Revisa las comidas de los planes

---

### 2.5 Recepcion (`/primegym/panel`)

**Sidebar esperado:**
- Principal: Resumen
- Operaciones: Check-in
- Gestion: Atletas, Planes de Membresia
- Cuenta: Perfil

**Pruebas:**
- [ ] Estando impersonando al Gym Admin, ve a Mi Equipo y haz clic en "Entrar como" junto a `recepcion@primegym.com`
- [ ] Ve a Operaciones > Check-in
- [ ] Registra un check-in manual para un atleta
- [ ] Ve a Gestion > Atletas (solo lectura)
- [ ] Ve a Gestion > Planes de Membresia (solo lectura)

---

### 2.6 Atleta (`/primegym/panel`)

**Sidebar esperado:**
- Principal: Resumen
- Mi Progreso: Rutinas (Mis Rutinas), Nutricion (Mi Plan Nutricional)
- Gamificacion: Retos (Mis Retos), Mis Logros, Ranking
- Cuenta: Perfil

**Pruebas:**
- [ ] Estando impersonando al Gym Admin, ve a Gestion > Atletas y haz clic en "Entrar como" junto a `atleta1@primegym.com`
- [ ] Verifica el dashboard del atleta (resumen personal)
- [ ] Ve a Mis Rutinas
  - [ ] Verifica la rutina asignada "Full Body Principiante"
  - [ ] Marca una sesion como completada (WorkoutLogger)
- [ ] Ve a Mi Nutricion
  - [ ] Verifica el plan nutricional asignado
  - [ ] Marca comidas como completadas
- [ ] Ve a Mis Retos
  - [ ] Verifica los retos activos
  - [ ] Ve el progreso (barra de progreso)
- [ ] Ve a Ranking
  - [ ] Verifica tu posicion en el leaderboard
- [ ] Ve a Mis Logros
  - [ ] Verifica los badges ganados
- [ ] Ve a Perfil
  - [ ] Verifica XP, nivel, badges

---

## 3. Pruebas de Funcionalidades Cruzadas

### 3.1 Verificacion de Permisos (403 esperado)
- [ ] Impersona un **Atleta** e intenta acceder a `/primegym/panel/gestion/atletas` (debe mostrar error o redirigir)
- [ ] Impersona un **Coach** e intenta crear un nuevo plan de membresia
- [ ] Impersona un **Recepcionista** e intenta editar un ejercicio

### 3.2 Notificaciones
- [ ] Impersona al coach (Super Admin -> Gym Admin -> "Entrar como" en coach)
- [ ] Verifica que tienes una notificacion de bienvenida (campana)
- [ ] Haz clic en "Marcar todas leidas"

### 3.3 Cadena de Impersonacion

**Super Admin -> Gym Admin:**
- [ ] Como Super Admin, en Gimnasios Asociados haz clic en "Entrar como Admin" en PrimeGym
- [ ] Verifica el boton "Volver a Admin" en la barra superior
- [ ] Haz clic en "Volver a Admin" para regresar al panel SaaS

**Gym Admin -> Coach/Nutricionista/Recepcion:**
- [ ] Estando como Gym Admin, ve a Mi Equipo
- [ ] Junto a cada miembro del staff, haz clic en "Entrar como"
- [ ] Verifica que el sidebar se actualiza al rol correspondiente
- [ ] Haz clic en "Volver" para regresar al panel de Gym Admin

**Gym Admin -> Atleta:**
- [ ] Estando como Gym Admin, ve a Gestion > Atletas
- [ ] Junto a cada atleta, haz clic en "Entrar como"
- [ ] Verifica el dashboard del atleta y sus funcionalidades limitadas
- [ ] Haz clic en "Volver" para regresar al panel de Gym Admin

**Volver a Super Admin desde cualquier punto:**
- [ ] Si estas dentro de PrimeGym (como Gym Admin o impersonando staff/atleta), haz clic en "Volver a Admin" repetidamente hasta regresar al panel SaaS

---

## 4. Datos de Prueba Creados

| Recurso | Cantidad | Detalle |
|---------|----------|---------|
| Gimnasios | 1 | PrimeGym (Plan Pro - S/249) |
| Sucursales | 1 | Sede Central |
| Admins | 1 | franco_alex_07@hotmail.com |
| Coaches | 1 | coach@primegym.com |
| Nutricionistas | 1 | nutricionista@primegym.com |
| Recepcionistas | 1 | recepcion@primegym.com |
| Atletas | 4 | atleta1 a atleta4 |
| Planes Membresia | 3 | Basico, Estandar, Premium |
| Ejercicios | 10 | Sentadilla, Press, Peso Muerto, etc. |
| Rutinas | 3 | Full Body, Torso/Piernas, Fuerza Avanzada |
| Planes Nutricionales | 2 | Definicion, Volumen |
| Retos | 3 | 30 Dias Entreno, Asistencia, Proteina |
| Badges | 5 | Principiante, Constante, Dedicado, etc. |
| Sesiones | 15 | 5 sesiones por atleta (ultimos 5 dias) |
| Check-ins | ~20 | ~5 por atleta (ultimos 10 dias) |

---

## 5. Comandos Utiles

```bash
# Regenerar datos de prueba desde cero
cd backend
python manage.py seed_feature_flags
python manage.py seed_demo_data

# Verificar estado de la BD
python manage.py shell -c "
from accounts.models import User
from gyms.models import Gym
print(f'Gimnasios: {Gym.objects.filter(deleted_at__isnull=True).count()}')
print(f'Usuarios: {User.objects.count()}')
for u in User.objects.all():
    print(f'  {u.email} | {u.role} | gym={u.gym.name if u.gym else \"N/A\"}')
"
```
