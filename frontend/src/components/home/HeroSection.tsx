'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function HeroSection() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">Lf</div>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">Lifefit</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 transition-colors dark:text-slate-300 md:flex">
            {[
              { href: '/', label: 'Inicio' },
              { href: '/sobre-nosotros', label: 'Sobre nosotros' },
              { href: '/funciones', label: 'Funciones' },
              { href: '/planes', label: 'Planes' },
              { href: '/testimonios', label: 'Testimonios' },
              { href: '/faq', label: 'FAQ' },
              { href: '/contacto', label: 'Contacto' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="transition-colors hover:text-emerald-400">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="icon" />
            <Link
              href="/registrarse"
              className="hidden text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-white md:inline-block"
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

      <section
        id="inicio"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 text-slate-900 transition-colors dark:text-slate-100 md:flex-row md:items-center md:py-16"
      >
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Disponible para gimnasios y atletas
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl lg:text-5xl">
              Entrena. Gana puntos.
              <br />
              Sube de nivel.
            </h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
              Lifefit te motiva con retos, ranking e insignias. Administra rutinas y nutrición en un solo lugar para mantener tu
              compromiso al máximo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-emerald-600">
              ¿Listo? Probar demo
            </button>
            <button className="flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Ver funciones →
            </button>
          </div>

          <div className="flex flex-wrap gap-8 text-sm text-slate-700 dark:text-slate-200">
            {[
              { label: 'Adherencia', value: '+30%' },
              { label: 'Abandono', value: '-20%' },
              { label: 'NPS Score', value: '4.6/5' },
            ].map((item) => (
              <div key={item.label}>
                <div className="font-semibold">{item.value}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="relative mx-auto max-w-md rounded-3xl bg-white p-4 text-slate-900 shadow-xl transition-colors dark:bg-slate-800 dark:text-slate-100 md:p-5">
            <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-2xl shadow-lg">
              ⭐
            </div>

            <div className="rounded-2xl bg-emerald-500 px-4 py-4 text-white shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Nivel 12</div>
                  <div className="text-lg font-semibold">2,450 puntos</div>
                </div>
                <div className="text-xs opacity-90">↑ 650 / 1000 XP</div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-emerald-700/40">
                <div className="h-2 w-2/3 rounded-full bg-white" />
              </div>
              <p className="mt-1 text-xs text-emerald-50">650 / 1000 XP para nivel 13</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-200">
              {[
                { icon: '🏆', label: 'Retos', value: '8' },
                { icon: '📝', label: 'Rutinas', value: '24' },
                { icon: '🏅', label: 'Ranking', value: '#12' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                  <div className="text-lg">{item.icon}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{item.label}</div>
                  <div className="text-sm font-semibold">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 text-xs text-slate-700 dark:text-slate-200">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span>Entrenamientos esta semana</span>
                  <span className="font-semibold">4/5</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-2 w-4/5 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span>Cumplimiento nutrición</span>
                  <span className="font-semibold">85%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-2 w-[85%] rounded-full bg-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
