import React from 'react'

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description:
      'Regístrate en minutos y configura tu perfil con tus objetivos de fitness.',
  },
  {
    number: '02',
    title: 'Activa una rutina y únete a un reto',
    description:
      'Elige entre decenas de rutinas diseñadas por expertos y participa en retos semanales.',
  },
  {
    number: '03',
    title: 'Suma puntos y sube de nivel',
    description:
      'Cada entrenamiento, cada reto completado te acerca a nuevas insignias y niveles.',
  },
]

const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="como-funciona"
      className="bg-slate-50 py-14 md:py-20 border-t border-slate-100"
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* Título y descripción */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Cómo funciona Lifefit
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            En 3 simples pasos estarás listo para comenzar tu transformación gamificada.
          </p>
        </div>

        <div className="relative">
          {/* Línea central que conecta las tarjetas (solo en desktop) */}
          <div className="pointer-events-none absolute inset-x-10 top-10 hidden h-px bg-emerald-100 md:block" />

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-3xl bg-white border border-slate-100 shadow-sm px-6 py-7 flex flex-col items-center text-center"
              >
                {/* Número de paso */}
                <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-slate-50 text-[11px] font-semibold text-slate-400 border border-slate-200">
                  {step.number}
                </div>

                {/* Icono placeholder verde */}
                <div className="mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white text-xl">
                  {step.number === '01' && '👤'}
                  {step.number === '02' && '🎯'}
                  {step.number === '03' && '📈'}
                </div>

                <h3 className="text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs md:text-sm text-slate-600 max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
