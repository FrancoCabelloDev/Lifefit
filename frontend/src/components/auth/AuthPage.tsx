'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AUTH_EVENT } from '@/hooks/useDashboardAuth'
import ThemeToggle from '@/components/ui/ThemeToggle'

type AuthPageProps = {
  mode: 'login' | 'register'
}

const stats = [
  { value: '+30%', label: 'Adherencia' },
  { value: '-20%', label: 'Abandono' },
  { value: '4.6/5', label: 'NPS Score' },
]

const benefits = [
  'Retos semanales con recompensas',
  'Ranking en tiempo real con tu equipo',
  'Planes de nutrición personalizados',
]

const formCopy = {
  login: {
    title: 'Ingresa a Lifefit',
    description:
      'Retoma tus entrenamientos, revisa tu progreso y mantén el compromiso con tus metas.',
    primaryCta: 'Ingresar',
    helper: '¿Aún no tienes una cuenta?',
    helperCta: 'Registrarme',
    helperHref: '/registrarse',
    fields: [
      { id: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@email.com' },
      { id: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
    ],
  },
  register: {
    title: 'Crea tu cuenta',
    description:
      'Comienza a acumular puntos, desbloquea insignias y mantén a tu equipo motivado.',
    primaryCta: 'Registrarme',
    helper: '¿Ya tienes una cuenta?',
    helperCta: 'Ingresar',
    helperHref: '/ingresar',
    fields: [
      { id: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Ana Martínez' },
      { id: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@email.com' },
      { id: 'gym', label: 'Gimnasio/Equipo', type: 'text', placeholder: 'Street Gym Pro' },
      { id: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
    ],
  },
}

const sanitizeNextPath = (path?: string | null) => {
  if (!path || typeof path !== 'string') return null
  return path.startsWith('/') ? path : null
}

const resolveRedirectPath = (role?: string, requestedPath?: string | null) => {
  const fallback = role === 'super_admin' ? '/admin' : '/resumen'
  const sanitized = sanitizeNextPath(requestedPath)
  if (!sanitized) return fallback
  if (role === 'super_admin' && sanitized === '/resumen') {
    return fallback
  }
  if (role !== 'super_admin' && sanitized.startsWith('/admin')) {
    return fallback
  }
  return sanitized
}

export default function AuthPage({ mode }: AuthPageProps) {
  const copy = formCopy[mode]
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNextPath = sanitizeNextPath(searchParams?.get('next'))
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const notifyAuthUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_EVENT))
    }
  }

  const persistTokens = (payload: { access: string; refresh: string }) => {
    localStorage.setItem('lifefit_access_token', payload.access)
    localStorage.setItem('lifefit_refresh_token', payload.refresh)
    notifyAuthUpdate()
  }

  const fetchProfileAndPersist = async (accessToken: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('No pudimos obtener tu perfil.')
    }
    const profile = await response.json()
    localStorage.setItem('lifefit_user', JSON.stringify(profile))
    notifyAuthUpdate()
    return profile
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login/' : '/api/auth/register/'
      const url = `${API_BASE_URL}${endpoint}`

      let body: Record<string, unknown>
      if (mode === 'login') {
        body = {
          email: formValues.email?.trim() ?? '',
          password: formValues.password ?? '',
        }
      } else {
        const fullName = (formValues.name ?? '').trim()
        const [firstName, ...rest] = fullName.split(' ').filter(Boolean)
        body = {
          email: formValues.email?.trim() ?? '',
          first_name: firstName || (formValues.email?.split('@')[0] ?? 'Usuario'),
          last_name: rest.join(' ') || 'Lifefit',
          password: formValues.password ?? '',
          password2: formValues.password ?? '',
          role: 'athlete',
          gym: null,
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.email) {
          setFieldErrors((prev) => ({ ...prev, email: Array.isArray(data.email) ? data.email.join(' ') : data.email }))
        } else if (data.detail) {
          const friendlyMessage =
            data.detail === 'No active account found with the given credentials'
              ? 'Correo o contraseña incorrectos.'
              : data.detail
          setFormError(friendlyMessage)
        } else {
          setFormError('No pudimos procesar tu solicitud. Intenta nuevamente.')
        }
        return
      }

      if (!data.access || !data.refresh) {
        throw new Error('No recibimos credenciales válidas.')
      }

      persistTokens({ access: data.access, refresh: data.refresh })
      const profile = await fetchProfileAndPersist(data.access)
      const destination = resolveRedirectPath(profile?.role, requestedNextPath)
      router.push(destination)
    } catch (error) {
      console.error(error)
      setFormError('Ocurrió un error inesperado. Intenta nuevamente en unos minutos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const params = new URLSearchParams({ next: requestedNextPath ?? '/resumen' })
      const response = await fetch(`${API_BASE_URL}/api/auth/google/login/?${params.toString()}`)
      const data = await response.json()
      if (!response.ok || !data.authorization_url) {
        throw new Error(data.detail || 'No pudimos conectarnos con Google.')
      }
      window.location.href = data.authorization_url
    } catch (error) {
      console.error(error)
      alert('No pudimos iniciar sesión con Google. Inténtalo de nuevo en unos minutos.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header
        className="border-b border-slate-100 bg-white/80 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/70"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              <span>Lf</span>
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">Lifefit</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 transition-colors dark:text-slate-300 md:flex">
            <Link href="/" className="transition-colors hover:text-emerald-400">
              Inicio
            </Link>
            <Link href="/sobre-nosotros" className="transition-colors hover:text-emerald-400">
              Sobre nosotros
            </Link>
            <Link href="/funciones" className="transition-colors hover:text-emerald-400">
              Funciones
            </Link>
            <Link href="/planes" className="transition-colors hover:text-emerald-400">
              Planes
            </Link>
            <Link href="/testimonios" className="transition-colors hover:text-emerald-400">
              Testimonios
            </Link>
            <Link href="/faq" className="transition-colors hover:text-emerald-400">
              FAQ
            </Link>
            <Link href="/contacto" className="transition-colors hover:text-emerald-400">
              Contacto
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/registrarse"
              className="hidden text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-white md:inline-block"
            >
              Registrarse
            </Link>
            <ThemeToggle variant="icon" />
            <Link
              href="/ingresar"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-600"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 lg:flex-row lg:items-center lg:py-16">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Disponible para gimnasios y atletas
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Entrena. Gana puntos. Sube de nivel.
            </h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
              Gestiona retos, ranking e insignias en un solo lugar. Las cuentas de acceso
              dan seguimiento al progreso de atletas, entrenadores y gimnasios.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl bg-white p-5 shadow-lg dark:bg-slate-900 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">Nivel actual</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">Nivel 12 · 2,450 pts</div>
              <div className="mt-3 h-2 rounded-full bg-emerald-100 dark:bg-emerald-500/30">
                <div className="h-2 w-2/3 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 text-xs text-slate-500">650 / 1000 XP para nivel 13</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Retos activos</div>
              <div className="text-2xl font-semibold text-emerald-600">8</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Promedio semanal</p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-emerald-500/30 bg-emerald-50 text-center text-xs font-medium text-emerald-600">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-8 text-sm text-slate-700 dark:text-slate-200">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-base font-semibold">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="relative rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 md:p-8">
            <div className="absolute -right-4 -top-4 hidden h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-2xl shadow-lg sm:flex">
              🏆
            </div>
            <div className="mb-6 space-y-1">
              <p className="text-xs font-medium uppercase text-emerald-600">
                {mode === 'login' ? 'Bienvenido de vuelta' : 'Comencemos'}
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{copy.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.description}</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.04 12.261c0-.815-.066-1.411-.21-2.031H12.24v3.686h6.17c-.125.963-.8 2.414-2.3 3.386l-.02.13 3.338 2.587.231.023c2.133-1.97 3.381-4.865 3.381-7.781z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.24 24c3.04 0 5.594-.977 7.458-2.649l-3.552-2.755c-.95.65-2.23 1.104-3.906 1.104-2.987 0-5.52-1.97-6.422-4.7l-.132.011-3.472 2.69-.045.12C2.973 21.865 7.25 24 12.24 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.818 14.999c-.238-.719-.375-1.49-.375-2.299 0-.808.137-1.58.362-2.298l-.006-.154-3.516-2.726-.115.053C1.447 9.332 1.04 10.622 1.04 11.999c0 1.377.407 2.667 1.127 3.724l3.65-2.724z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12.24 4.75c2.115 0 3.544.916 4.36 1.683l3.183-3.11C17.821 1.262 15.28 0 12.24 0 7.25 0 2.973 2.135.717 5.4l3.639 2.85c.915-2.73 3.448-4.5 6.884-4.5z"
                  />
                </svg>
                {googleLoading ? 'Conectando...' : 'Continuar con Google'}
              </button>

              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                o continúa con tu email
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>

            {formError && (
              <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/20 dark:text-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {copy.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label htmlFor={field.id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    required={!(mode === 'register' && field.id === 'gym')}
                    placeholder={field.placeholder}
                    value={formValues[field.id] ?? ''}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/70"
                  />
                  {fieldErrors[field.id] && <p className="text-xs text-red-600">{fieldErrors[field.id]}</p>}
                </div>
              ))}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Recordarme
                  </label>
                  <button type="button" className="text-emerald-600 hover:text-emerald-700">
                    Olvidé mi contraseña
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Procesando...' : copy.primaryCta}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
              {copy.helper}{' '}
              <Link href={copy.helperHref} className="font-semibold text-emerald-600 hover:text-emerald-700">
                {copy.helperCta}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
