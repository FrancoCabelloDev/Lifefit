'use client'

import Link from 'next/link'
import { FormEvent } from 'react'

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

export default function AuthPage({ mode }: AuthPageProps) {
  const copy = formCopy[mode]

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              <span>Lf</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">Lifefit</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/" className="hover:text-slate-900">
              Inicio
            </Link>
            <Link href="/sobre-nosotros" className="hover:text-slate-900">
              Sobre nosotros
            </Link>
            <Link href="/funciones" className="hover:text-slate-900">
              Funciones
            </Link>
            <Link href="/planes" className="hover:text-slate-900">
              Planes
            </Link>
            <Link href="/testimonios" className="hover:text-slate-900">
              Testimonios
            </Link>
            <Link href="/faq" className="hover:text-slate-900">
              FAQ
            </Link>
            <Link href="/contacto" className="hover:text-slate-900">
              Contacto
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/registrarse"
              className="hidden text-sm text-slate-600 hover:text-slate-900 md:inline-block"
            >
              Registrarse
            </Link>
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
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Disponible para gimnasios y atletas
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Entrena. Gana puntos. Sube de nivel.
            </h1>
            <p className="max-w-xl text-sm text-slate-600 md:text-base">
              Gestiona retos, ranking e insignias en un solo lugar. Las cuentas de acceso
              dan seguimiento al progreso de atletas, entrenadores y gimnasios.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl bg-white p-5 shadow-lg sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">Nivel actual</div>
              <div className="text-lg font-semibold text-slate-900">Nivel 12 · 2,450 pts</div>
              <div className="mt-3 h-2 rounded-full bg-emerald-100">
                <div className="h-2 w-2/3 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 text-xs text-slate-500">650 / 1000 XP para nivel 13</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs uppercase text-slate-500">Retos activos</div>
              <div className="text-2xl font-semibold text-emerald-600">8</div>
              <p className="text-xs text-slate-500">Promedio semanal</p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-slate-700">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-emerald-500/30 bg-emerald-50 text-center text-xs font-medium text-emerald-600">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-8 text-sm text-slate-700">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-base font-semibold">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="relative rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="absolute -right-4 -top-4 hidden h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-2xl shadow-lg sm:flex">
              🏆
            </div>
            <div className="mb-6 space-y-1">
              <p className="text-xs font-medium uppercase text-emerald-600">
                {mode === 'login' ? 'Bienvenido de vuelta' : 'Comencemos'}
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">{copy.title}</h2>
              <p className="text-sm text-slate-500">{copy.description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {copy.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label htmlFor={field.id} className="text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    required
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              ))}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm text-slate-600">
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
                className="w-full rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
              >
                {copy.primaryCta}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600">
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
