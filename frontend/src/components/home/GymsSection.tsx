import React from 'react'

const GymsSection: React.FC = () => {
  return (
    <section className="bg-emerald-50/60 py-14 text-slate-900 transition-colors dark:bg-[#0b1323] dark:text-slate-100 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        {/* Título */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Para Gimnasios (B2B)
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Incrementa la retención de tus miembros y mejora la experiencia con
            datos en tiempo real.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-center dark:border-emerald-500/30 dark:bg-slate-900">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              📈
            </div>
            <div className="text-lg font-semibold text-slate-900">+30%</div>
            <p className="text-xs md:text-sm text-slate-600">
              Adherencia de miembros
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-center dark:border-emerald-500/30 dark:bg-slate-900">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              📉
            </div>
            <div className="text-lg font-semibold text-slate-900">-20%</div>
            <p className="text-xs md:text-sm text-slate-600">Tasa de abandono</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 text-center dark:border-emerald-500/30 dark:bg-slate-900">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              ⭐
            </div>
            <div className="text-lg font-semibold text-slate-900">4.6/5</div>
            <p className="text-xs md:text-sm text-slate-600">NPS Score promedio</p>
          </div>
        </div>

        {/* Bloque grande */}
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-3xl border border-emerald-100 bg-white p-6 dark:border-emerald-500/30 dark:bg-slate-900 md:p-8">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100 md:text-base">
              Potencia tu gimnasio con datos
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 md:text-sm">
              <li>• Panel de control completo para gestionar usuarios y métricas.</li>
              <li>• Sistema de retos y gamificación personalizable por marca.</li>
              <li>• Reportes de cumplimiento y engagement detallados.</li>
              <li>• Integraciones con sistemas de facturación (Stripe, etc.).</li>
              <li>• Soporte técnico dedicado y onboarding incluido.</li>
            </ul>
          </div>

          <div className="flex flex-col justify-between rounded-3xl bg-emerald-100 p-6 text-slate-900 dark:bg-emerald-500/10 dark:text-slate-100 md:p-8">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">
                ¿Quieres transformar tu gimnasio?
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-200 md:text-sm">
                Agenda una demo personalizada con nuestro equipo.
              </p>
            </div>
            <div className="mt-6 space-y-1">
              <button className="w-full rounded-full bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                Hablar con ventas
              </button>
              <p className="text-center text-[11px] text-slate-600 dark:text-slate-300">
                Respuesta en menos de 24 horas
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GymsSection
