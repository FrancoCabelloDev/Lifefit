'use client'

import React from 'react'

const features = [
  { icon: '🏆', title: 'Motivación continua', desc: 'Retos, medallas e insignias que mantienen tu compromiso activo.' },
  { icon: '📋', title: 'Rutinas guiadas', desc: 'Checklist interactivo y temporizador para cada ejercicio.' },
  { icon: '🥗', title: 'Plan nutricional', desc: 'Macros diarios y seguimiento de cumplimiento con recordatorios.' },
  { icon: '⚡', title: 'Ranking competitivo', desc: 'Ranking por gimnasio y nivel global para medir tu progreso.' },
]

const CoreFeaturesSection: React.FC = () => {
  return (
    <section
      id="funciones"
      className="border-t border-slate-100 bg-white py-12 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:py-16"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Todo lo que necesitas para alcanzar tus metas</h2>
          <p className="mt-2 mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Lifefit combina gamificación, seguimiento y comunidad para mantener tu motivación en máximo nivel.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 text-2xl">{icon}</div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 md:text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CoreFeaturesSection
