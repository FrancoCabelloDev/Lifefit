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
      className="bg-slate-50 py-14 md:py-20 border-t border-slate-100"
    >
      <div className="mx-auto max-w-6xl px-4">
        {/* Título */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Funciones destacadas
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Tanto para usuarios finales como para administradores, Lifefit ofrece
            herramientas completas.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
            <button
              className={`px-4 py-1.5 rounded-full ${
                tab === 'usuario'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500'
              }`}
              onClick={() => setTab('usuario')}
            >
              Usuario
            </button>
            <button
              className={`px-4 py-1.5 rounded-full ${
                tab === 'admin'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500'
              }`}
              onClick={() => setTab('admin')}
            >
              Administrador
            </button>
          </div>
        </div>

        {/* Grid de funciones */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col"
            >
              <div className="mb-4 h-28 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100" />
              <h3 className="text-sm font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs md:text-sm text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedFunctionsSection
