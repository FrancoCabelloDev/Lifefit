import React from 'react'

const CTASection: React.FC = () => {
  return (
    <section className="bg-[#0a0a0a] border-t border-zinc-800/50 py-20 md:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold text-white md:text-5xl tracking-tight">
          ¿Listo para transformar tu gimnasio?
        </h2>
        <p className="mt-6 mx-auto max-w-2xl text-base text-zinc-400">
          Únete a más de 150 gimnasios que ya usan LifeFit para fidelizar a sus clientes.
        </p>

        <div className="mt-10 flex justify-center">
          <button className="rounded-xl bg-[#222] px-8 py-3.5 text-base font-semibold text-yellow-400 transition hover:bg-zinc-800 hover:text-yellow-300">
            Empieza Gratis Hoy
          </button>
        </div>
      </div>
    </section>
  )
}

export default CTASection
