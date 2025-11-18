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
      className="border-t border-slate-100 bg-slate-50 py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* Título y descripción */}
        <div className="mb-10 text-center md:mb-14">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Cómo funciona Lifefit
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            En 3 simples pasos estarás listo para comenzar tu transformación gamificada.
          </p>
        </div>

        <div className="relative">
          {/* Línea central que conecta las tarjetas (solo en desktop) */}
          <div className="pointer-events-none absolute inset-x-10 top-10 hidden h-px bg-emerald-100 dark:bg-emerald-500/30 md:block" />

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative flex flex-col items-center rounded-3xl border border-slate-100 bg-white px-6 py-7 text-center shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Número de paso */}
                <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {step.number}
                </div>

                {/* Icono placeholder verde */}
                <div className="mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl text-white">
                  {step.number === '01' && '👤'}
                  {step.number === '02' && '🎯'}
                  {step.number === '03' && '📈'}
                </div>

                <h3 className="text-sm font-semibold">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-xs text-slate-600 dark:text-slate-400 md:text-sm">
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
