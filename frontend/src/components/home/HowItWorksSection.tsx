import React from 'react'

const steps = [
  {
    number: '1',
    title: 'Tu gimnasio se suscribe',
    description:
      'Elige un plan y obtén acceso completo a la plataforma en minutos.',
  },
  {
    number: '2',
    title: 'Coaches gestionan todo',
    description:
      'Asignan rutinas, verifican asistencia y otorgan puntos a cada usuario.',
  },
  {
    number: '3',
    title: 'Clientes se enganchan',
    description:
      'Ganan XP, suben de nivel, compiten en rankings y logran sus metas.',
  },
]

const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden bg-[#0d0d0d] border-t border-zinc-800/50 py-20 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white md:text-5xl tracking-tight">
            ¿Cómo funciona?
          </h2>
        </div>

        <div className="relative grid gap-12 md:grid-cols-3">
          {/* Connector Line (Desktop only) */}
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent z-0"></div>

          {steps.map((step) => (
            <div
              key={step.number}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-2xl font-bold text-black shadow-[0_0_20px_rgba(250,204,21,0.3)] ring-4 ring-[#0d0d0d]">
                {step.number}
              </div>

              <h3 className="text-xl font-bold text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed px-4">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
