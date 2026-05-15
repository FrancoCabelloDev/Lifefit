# ToDo & Decisiones de Arquitectura B2B - LifeFit

## 1. Mercado Exclusivo en Perú (MVP)
**Decisión:** No es necesario configurar zonas horarias (`Timezone`) ni monedas (`Currency`) dinámicas por ahora para evitar *over-engineering*.
**Acción:** 
- [ ] Configurar en el backend (`settings.py` de Django): `TIME_ZONE = 'America/Lima'`.
- [ ] Asumir moneda `S/` (Soles) en todo el frontend para las ventas o planes. 
*(Nota: Si se expande el SaaS a otros países (Chile, Colombia, etc.) en el futuro, se deberán añadir estos campos al modelo `Gym`).*

## 2. Onboarding Moderno de Gimnasios (Invitaciones)
**Decisión:** Eliminar la creación de contraseña manual por parte del superadmin para mejorar la seguridad y verificar que el correo del dueño es real.
**Acción a implementar (Usando Supabase Auth):**
- [ ] Eliminar el campo "Contraseña Temporal" del formulario de creación de gimnasios en el Panel SaaS.
- [ ] Al registrar un nuevo gimnasio, ejecutar la función `inviteUserByEmail()` de Supabase en el backend o mediante el Supabase Admin Client.
- [ ] Configurar la plantilla de correo en Supabase para que envíe el "magic link" o enlace temporal al dueño del gimnasio.
- [ ] Crear una vista en el frontend (PWA) (ej. `/set-password` o `/unirse`) que capture el token de la URL y permita al nuevo administrador escribir su propia contraseña de acceso de forma segura.

## 3. Límites de Uso (Capacity Planning & Upselling)
**Decisión:** Implementar topes en la cantidad de atletas y coaches por gimnasio según el plan contratado. Esto protege los recursos del servidor y abre la puerta al *upselling*.
**Acciones:**
- [ ] Añadir campos al modelo `Gym`:
  - `max_athletes = models.IntegerField(default=100)`
  - `max_coaches = models.IntegerField(default=2)`
- [ ] Actualizar el formulario de "Registrar Nuevo Gimnasio" en el Panel SaaS para incluir "Cupo máximo de Atletas" y "Cupo máximo de Coaches", dándole el control al Superadmin.
- [ ] Backend: Validar al intentar registrar un nuevo atleta. Ejemplo: `if gym.users.filter(role='athlete').count() >= gym.max_athletes:` devolver error (403 Forbidden).
- [ ] Frontend: Mostrar alertas en el panel del administrador del gimnasio cuando se acerquen al tope (ej. *"Has alcanzado el 95% de tu capacidad de atletas. Mejora tu plan para seguir creciendo"*).

## 4. Estrategia de Despliegue (Deploy) de Backend y BD
**Aclaración Importante sobre Supabase:**
Supabase **no aloja código de backend en Python/Django**. Supabase es una plataforma como servicio (BaaS) que te da la Base de Datos (PostgreSQL), la Autenticación y el Storage.
Tu código de Django necesita un servidor o proveedor independiente (PaaS) que ejecute Python. Proveedores recomendados para Django: **Render**, **Railway**, o **Fly.io**.

**Decisión:** ¿Desplegar ya o seguir en local?
**Puedes seguir trabajando en local.** No es estrictamente necesario desplegar el backend en la nube hasta que necesites hacer pruebas reales con usuarios externos (beta testers) o lanzar a producción.

**Acciones futuras para cuando decidas desplegar el Backend:**
- [ ] Elegir un proveedor PaaS (ej. Render o Railway).
- [ ] Configurar `gunicorn` como servidor WSGI (en la nube no se usa `manage.py runserver`).
- [ ] Configurar las variables de entorno de producción (`.env` separado).
- [ ] Configurar tu backend para subir los archivos multimedia (Logos, avatares) a Supabase Storage, ya que los servidores PaaS suelen tener almacenamiento efímero que se borra al reiniciar.

## 5. Pruebas Locales del Onboarding y Correos
**Pregunta:** ¿Tengo que hacer deploy para probar el Onboarding moderno (las invitaciones por correo)?
**Decisión:** **NO. Puedes hacerlo 100% en local.**
**Cómo funciona en entorno local:**
- Aunque tu Django y tu Next.js estén corriendo en `localhost`, tu `.env` los conecta con tu proyecto de Supabase en la nube.
- Cuando tu código local ejecuta `inviteUserByEmail()`, la orden va a Supabase, y es el servidor de Supabase (en la nube) el que envía el correo electrónico real a tu bandeja de entrada.
- **Acciones necesarias para que funcione en local:**
  - [ ] En el Panel web de Supabase (Authentication -> URL Configuration), asegúrate de que la **Site URL** esté configurada apuntando a `http://localhost:3000` (tu frontend local).
  - [ ] Opcional: Asegúrate de tener los Redirect URLs permitidos configurados en Supabase para las rutas de restablecimiento de contraseña.
