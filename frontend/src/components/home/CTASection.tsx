import React from 'react'

const CTASection: React.FC = () => {
  return (
    <section className="bg-emerald-500 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center text-white">
        <div className="inline-flex rounded-full bg-emerald-400/40 px-4 py-1 text-xs mb-4">
          Únete a más de 10,000 atletas activos
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold mb-2">
          Empieza gratis hoy
        </h2>
        <p className="text-sm md:text-base text-emerald-50 max-w-xl mx-auto mb-6">
          No necesitas tarjeta de crédito. Crea tu cuenta y comienza a entrenar con
          motivación gamificada en minutos.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
          <button className="rounded-full bg-white px-6 py-2 text-sm font-medium text-emerald-700 hover:bg-slate-50">
            Crear cuenta →
          </button>
          <button className="rounded-full border border-white/70 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-600/60">
            Ya tengo cuenta
          </button>
        </div>

        <p className="text-[11px] text-emerald-50/90">
          ✓ Sin compromisos · ✓ Cancela cuando quieras · ✓ Soporte 24/7
        </p>
      </div>
    </section>
  )
}

export default CTASection
