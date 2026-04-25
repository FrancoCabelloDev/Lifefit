import React from 'react'

const PlansSection: React.FC = () => {
  return (
    <section
      id="planes"
      className="relative overflow-hidden bg-[#0a0a0a] border-t border-zinc-800/50 py-20 md:py-32"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white md:text-5xl tracking-tight">
            Planes para cada gimnasio
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-base text-zinc-400">
            Sin contratos largos. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 items-center">
          {/* Starter */}
          <div className="flex flex-col rounded-3xl bg-[#141414] p-8">
            <h3 className="text-xl font-bold text-white">Starter</h3>
            <p className="mt-2 text-sm text-zinc-400">Para gimnasios que comienzan</p>
            <div className="mt-6 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold">$49</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <ul className="mt-8 flex-1 space-y-4 text-sm text-zinc-300">
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Hasta 100 usuarios</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> 1 Coach</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Rutinas y Nutrición</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Check-in QR</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Soporte por email</li>
            </ul>
            <button className="mt-8 w-full rounded-xl bg-[#222] py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
              Comenzar
            </button>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-3xl border border-yellow-400 bg-[#141414] p-8 shadow-2xl shadow-yellow-400/10 md:scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1 text-xs font-bold text-black flex items-center gap-1">
              ⭐ Más popular
            </div>
            <h3 className="mt-2 text-xl font-bold text-white">Pro</h3>
            <p className="mt-2 text-sm text-zinc-400">
              El más popular para gimnasios en crecimiento
            </p>
            <div className="mt-6 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold">$99</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <ul className="mt-8 flex-1 space-y-4 text-sm text-zinc-300">
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Hasta 500 usuarios</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> 5 Coaches</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Todo de Starter</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Coach IA</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Retos y Rankings</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Panel Admin completo</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Soporte prioritario</li>
            </ul>
            <button className="mt-8 w-full rounded-xl bg-yellow-400 py-3 text-sm font-semibold text-black transition hover:bg-yellow-500">
              Comenzar
            </button>
          </div>

          {/* Enterprise */}
          <div className="flex flex-col rounded-3xl bg-[#141414] p-8">
            <h3 className="text-xl font-bold text-white">Enterprise</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Para cadenas y grandes gimnasios
            </p>
            <div className="mt-6 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold">$199</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <ul className="mt-8 flex-1 space-y-4 text-sm text-zinc-300">
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Usuarios ilimitados</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Coaches ilimitados</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Todo de Pro</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Multi-sede</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> API personalizada</li>
              <li className="flex items-center gap-3"><span className="text-yellow-400">✔</span> Soporte dedicado</li>
            </ul>
            <button className="mt-8 w-full rounded-xl bg-[#222] py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
              Comenzar
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PlansSection
