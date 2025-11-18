'use client'

import React, { useState } from 'react'

const userFeatures = [
  {
    title: 'Dashboard',
    description: 'Vista completa de tu progreso, puntos y nivel actual.',
  },
  {
    title: 'Retos',
    description: 'Participa en retos activos y descubre nuevos desafíos.',
  },
  {
    title: 'Rutinas',
    description: 'Accede a rutinas personalizadas con temporizador integrado.',
  },
  {
    title: 'Nutrición',
    description: 'Seguimiento de macros y plan alimenticio diario.',
  },
  {
    title: 'Ranking',
    description: 'Compite con otros atletas en tu gimnasio.',
  },
]

const adminFeatures = [
  {
    title: 'Usuarios',
    description: 'Gestiona usuarios, progreso y asignaciones de planes.',
  },
  {
    title: 'Retos/Insignias',
    description: 'Crea retos personalizados y gestiona sistema de medallas.',
  },
  {
    title: 'Reportes',
    description: 'Analytics detallados de engagement y cumplimiento.',
  },
  {
    title: 'Notificaciones',
    description: 'Envía campañas por email, push e in-app.',
  },
  {
    title: 'Configuración (RBAC)',
    description: 'Control de roles, permisos y branding por gimnasio.',
  },
]

const FeaturedFunctionsSection: React.FC = () => {
  const [tab, setTab] = useState<'usuario' | 'admin'>('usuario')

  const features = tab === 'usuario' ? userFeatures : adminFeatures

  return (
    <section
      id="funciones"
      className="border-t border-slate-100 bg-slate-50 py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center md:mb-10">
          <h2 className="text-2xl font-semibold md:text-3xl">Funciones destacadas</h2>
          <p className="mt-2 mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Tanto para usuarios finales como para administradores, Lifefit ofrece herramientas completas.
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm dark:bg-slate-800">
            {(['usuario', 'admin'] as const).map((option) => (
              <button
                key={option}
                className={`px-4 py-1.5 rounded-full transition ${
                  tab === option
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                onClick={() => setTab(option)}
              >
                {option === 'usuario' ? 'Usuario' : 'Administrador'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 h-28 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700" />
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 md:text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedFunctionsSection
