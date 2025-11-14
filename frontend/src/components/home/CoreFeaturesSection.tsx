import React from 'react'

const CoreFeaturesSection: React.FC = () => {
  return (
    <section
      id="funciones"
      className="bg-white py-12 md:py-16 border-t border-slate-100"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            Todo lo que necesitas para alcanzar tus metas
          </h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base max-w-2xl mx-auto">
            Lifefit combina gamificación, seguimiento y comunidad para mantener tu
            motivación en máximo nivel.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-3 text-2xl">🏆</div>
            <h3 className="text-sm font-semibold text-slate-900">
              Motivación continua
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              Gamificación real con retos semanales, medallas e insignias que
              mantienen tu compromiso activo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-3 text-2xl">📋</div>
            <h3 className="text-sm font-semibold text-slate-900">
              Rutinas guiadas
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              Rutinas con checklist interactivo y temporizador para seguir cada
              ejercicio paso a paso.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-3 text-2xl">🍏</div>
            <h3 className="text-sm font-semibold text-slate-900">
              Plan nutricional
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              Plan diario con macros y seguimiento de cumplimiento para alinear tu
              alimentación con tus metas.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-3 text-2xl">📊</div>
            <h3 className="text-sm font-semibold text-slate-900">
              Ranking competitivo
            </h3>
            <p className="mt-2 text-xs text-slate-600">
              Ranking por gimnasio y por semana para competir sanamente con otros
              atletas y mantenerte motivado.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CoreFeaturesSection
