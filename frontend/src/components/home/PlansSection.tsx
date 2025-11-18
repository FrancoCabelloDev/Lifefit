import React from 'react'

const PlansSection: React.FC = () => {
  return (
    <section
      id="planes"
      className="border-t border-slate-100 bg-slate-50 py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Planes para cada necesidad
          </h2>
          <p className="mt-2 mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Desde usuarios individuales hasta grandes gimnasios. Elige el plan que
            mejor se adapte a ti.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {/* Starter */}
          <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold">Starter</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Para probar la plataforma</p>
            <div className="mt-4 text-sm font-semibold">$0 / Gratis</div>
            <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li>✔ Dashboard básico</li>
              <li>✔ Hasta 3 rutinas</li>
              <li>✔ Retos limitados</li>
              <li>✔ Ranking básico</li>
              <li>✔ Soporte por email</li>
            </ul>
            <button className="mt-4 w-full rounded-full border border-slate-200 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
              Comenzar gratis
            </button>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-3xl border-2 border-emerald-400 bg-white p-6 shadow-md dark:border-emerald-500 dark:bg-slate-900">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-medium text-white">
              Más popular
            </div>
            <h3 className="mt-2 text-sm font-semibold">Pro</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Para atletas comprometidos
            </p>
            <div className="mt-4 text-sm font-semibold">$12 / por mes</div>
            <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li>✔ Dashboard completo</li>
              <li>✔ Rutinas ilimitadas</li>
              <li>✔ Todos los retos</li>
              <li>✔ Planes de nutrición personalizados</li>
              <li>✔ Tracking de comidas y macros</li>
              <li>✔ Recetas detalladas paso a paso</li>
              <li>✔ Ranking global</li>
              <li>✔ Insignias premium</li>
              <li>✔ Soporte prioritario</li>
            </ul>
            <button className="mt-4 w-full rounded-full bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600">
              Elegir Pro
            </button>
          </div>

          {/* Gym */}
          <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-colors dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold">Gym</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Para gimnasios y centros
            </p>
            <div className="mt-4 text-sm font-semibold">
              Personalizado / contactar ventas
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li>✔ Usuarios ilimitados</li>
              <li>✔ Panel de administración</li>
              <li>✔ Branding personalizado</li>
              <li>✔ Reportes avanzados</li>
              <li>✔ Integraciones (Stripe, etc.)</li>
              <li>✔ RBAC y auditoría</li>
              <li>✔ Onboarding dedicado</li>
              <li>✔ Soporte 24/7</li>
            </ul>
            <button className="mt-4 w-full rounded-full border border-slate-200 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
              Contactar ventas
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Todos los planes incluyen 14 días de prueba gratis · Sin tarjeta de crédito
          requerida
        </p>
      </div>
    </section>
  )
}

export default PlansSection
