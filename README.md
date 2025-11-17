# Lifefit - Guia de instalacion

Guia paso a paso para que cualquier miembro del equipo levante el backend (Django) y el frontend (Next.js) de Lifefit desde cero.

## 1. Requisitos previos
- Git 2.40 o superior
- Python 3.11 con pip
- Node.js 18+ y npm (el repo usa npm por defecto)
- PostgreSQL 14+ en ejecucion local
- Opcional: algun administrador de entornos virtuales (venv, pyenv, etc.)

## 2. Clonar el repositorio
```bash
git clone <URL-del-repo>
cd Lifefit
```
Despues de clonar veras principalmente las carpetas `backend/` y `frontend/`.

## 3. Crear la base de datos en PostgreSQL
1. Abre `psql` (con un usuario con privilegios) y ejecuta:
   ```sql
   CREATE DATABASE lifefit;
   CREATE USER lifefit_user WITH PASSWORD 'cambia_esta_clave';
   GRANT ALL PRIVILEGES ON DATABASE lifefit TO lifefit_user;
   ```
2. Si usas Docker puedes levantar un contenedor de PostgreSQL con las mismas credenciales; solo ajusta `DB_HOST` y `DB_PORT` al exponerlo.

## 4. Variables de entorno del backend
Crea `backend/.env` con valores similares a:
```env
DJANGO_SECRET_KEY=clave-super-secreta
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DB_ENGINE=django.db.backends.postgresql
DB_NAME=lifefit
DB_USER=lifefit_user
DB_PASSWORD=cambia_esta_clave
DB_HOST=localhost
DB_PORT=5432
GOOGLE_OAUTH_CLIENT_ID=tu-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=tu-clave
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/auth/google/callback/
```
Si omites las variables `DB_*`, Django usara SQLite (`db.sqlite3`), pero para empatar ambientes recomendamos PostgreSQL.

## 5. Preparar y ejecutar el backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate      # PowerShell
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # para acceder al panel admin
python manage.py runserver        # disponible en http://localhost:8000
```
Deja la API corriendo mientras desarrollas el frontend.

## 6. Variables del frontend
Crea `frontend/.env.local` (o duplica el existente si ya viene en el repo) con algo como:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-clave
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```
Ajusta los valores segun las credenciales entregadas por el equipo.

## 7. Preparar y ejecutar el frontend
```bash
cd frontend
npm install
npm run dev    # abre http://localhost:3000
```
El dashboard del usuario vive bajo rutas como `/resumen`, `/retos`, `/rutinas`, `/nutricion`, mientras que el panel admin esta en `/admin`.

## 8. Comprobaciones rapidas
- Ingresa a `http://localhost:3000/ingresar` y haz login con el super usuario creado; si tu rol es `super_admin` deberias redirigir automaticamente a `/admin`.
- Crea un reto/rutina/plan global desde `/admin`; verifica que un usuario sin gym vea ese contenido en su dashboard.
- Si necesitas poblar data adicional, usa fixtures o comandos de Django segun la documentacion interna.

## 9. Buenas practicas
- Versiona los archivos generados por shadcn (`components.json`, `.local-shadcn-answers.json`, `src/components/ui/*`, `src/lib/utils.ts`).
- Ejecuta `npm run lint` en el frontend y las pruebas/migraciones necesarias antes de abrir un PR.
- Nunca subas credenciales reales; usa `.env.local` y `.env` ignorados en Git. Si se requiere un ejemplo, crea `*.env.example` con valores dummy.
