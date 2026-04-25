import Link from 'next/link'

export default function HeroSection() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-[#050505]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-2xl font-black tracking-tight"><span className="text-yellow-400">Life</span><span className="text-white">Fit</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8 text-sm font-medium text-zinc-300">
              <Link href="#funciones" className="transition-colors hover:text-white">
                Características
              </Link>
              <Link href="#planes" className="transition-colors hover:text-white">
                Precios
              </Link>
              <Link href="#sobre-nosotros" className="transition-colors hover:text-white">
                Nosotros
              </Link>
            </nav>

            <div className="flex items-center gap-4 ml-4">
              <Link
                href="/ingresar"
                className="rounded-lg border border-zinc-700 bg-transparent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registrarse"
                className="rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-500"
              >
                Solicita tu Demo
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative w-full overflow-hidden border-b border-zinc-800/50 pb-8 bg-[#0a0a0a]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#eab3081a,transparent)]"></div>
        </div>

        <section
          id="inicio"
          className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-20 text-center md:py-32"
        >
          
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-1.5 text-xs font-medium text-yellow-400">
            <span className="h-2 w-2 rounded-full bg-yellow-400" /> Software para gimnasios · Gamificación
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl">
              El sistema que <span className="text-yellow-400">fideliza</span> a tus clientes
            </h1>
            <p className="mx-auto max-w-2xl text-base text-zinc-400 md:text-lg">
              LifeFit transforma tu gimnasio en una experiencia gamificada. Más motivación, más constancia, más ingresos. La plataforma que tus clientes no querrán abandonar.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 mt-4">
            <button className="w-full rounded-xl bg-yellow-400 px-8 py-3.5 text-base font-semibold text-black transition hover:bg-yellow-500 sm:w-auto">
              Solicitar demo gratuita
            </button>
            <button className="w-full rounded-xl border border-zinc-800 bg-[#111111] px-8 py-3.5 text-base font-semibold text-white transition hover:bg-zinc-800 sm:w-auto">
              Ver cómo funciona
            </button>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-12 sm:gap-24 text-center">
            <div>
              <div className="text-3xl font-bold text-yellow-400">150+</div>
              <div className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">Gimnasios</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">25K+</div>
              <div className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">Usuarios activos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">94%</div>
              <div className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">Retención</div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

