import Link from 'next/link'
import React from 'react'

const HeroSection: React.FC = () => {
  return (
    <>
      {/* NAVBAR */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              <span>Lf</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">Lifefit</span>
          </Link>

          {/* Links desktop */}
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

          {/* Auth buttons */}
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

      {/* HERO */}
      <section
        id="inicio"
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:py-16"
      >
        {/* Columna izquierda */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Disponible para gimnasios y atletas
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
              Entrena. Gana puntos.
              <br />
              Sube de nivel.
            </h1>
            <p className="max-w-xl text-sm text-slate-600 md:text-base">
              Lifefit te motiva con retos, ranking e insignias. Administra rutinas y
              nutrición en un solo lugar para mantener tu compromiso al máximo.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-emerald-600">
              ▶ Probar demo
            </button>
            <button className="flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Ver funciones →
            </button>
          </div>

          {/* Métricas */}
          <div className="flex flex-wrap gap-8 text-sm text-slate-700">
            <div>
              <div className="font-semibold">+30%</div>
              <div className="text-xs text-slate-500">Adherencia</div>
            </div>
            <div>
              <div className="font-semibold">-20%</div>
              <div className="text-xs text-slate-500">Abandono</div>
            </div>
            <div>
              <div className="font-semibold">4.6/5</div>
              <div className="text-xs text-slate-500">NPS Score</div>
            </div>
          </div>
        </div>

        {/* Columna derecha – tarjeta de progreso */}
        <div className="flex-1">
          <div className="relative mx-auto max-w-md rounded-3xl bg-white p-4 shadow-xl md:p-5">
            {/* Badge flotante */}
            <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-2xl shadow-lg">
              🏆
            </div>

            {/* Header verde */}
            <div className="rounded-2xl bg-emerald-500 px-4 py-4 text-white shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Nivel 12</div>
                  <div className="text-lg font-semibold">2,450 puntos</div>
                </div>
                <div className="text-xs opacity-90">⏱ 650 / 1000 XP</div>
              </div>
              {/* Barra de XP */}
              <div className="mt-3 h-2 w-full rounded-full bg-emerald-700/40">
                <div className="h-2 w-2/3 rounded-full bg-white" />
              </div>
              <p className="mt-1 text-xs text-emerald-50">
                650 / 1000 XP para nivel 13
              </p>
            </div>

            {/* Stats principales */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-700">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-lg">🏅</div>
                <div className="mt-1 text-[11px] text-slate-500">Retos</div>
                <div className="text-sm font-semibold">8</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-lg">🎯</div>
                <div className="mt-1 text-[11px] text-slate-500">Rutinas</div>
                <div className="text-sm font-semibold">24</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-lg">📈</div>
                <div className="mt-1 text-[11px] text-slate-500">Ranking</div>
                <div className="text-sm font-semibold">#12</div>
              </div>
            </div>

            {/* Barras de progreso */}
            <div className="mt-5 space-y-3 text-xs text-slate-700">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span>Entrenamientos esta semana</span>
                  <span className="font-semibold">4/5</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-4/5 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span>Cumplimiento nutrición</span>
                  <span className="font-semibold">85%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
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

export default HeroSection
