'use client'

import React from 'react'
import { useTheme } from '@/hooks/useTheme'

const features = [
  { icon: '🏆', title: 'Motivación continua', desc: 'Retos, medallas e insignias que mantienen tu compromiso activo.' },
  { icon: '📋', title: 'Rutinas guiadas', desc: 'Checklist interactivo y temporizador para cada ejercicio.' },
  { icon: '🥗', title: 'Plan nutricional', desc: 'Macros diarios y seguimiento de cumplimiento con recordatorios.' },
  { icon: '📊', title: 'Ranking competitivo', desc: 'Ranking por gimnasio y nivel global para medir tu progreso.' },
]

const CoreFeaturesSection: React.FC = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const sectionClasses = `border-t py-12 md:py-16 transition-colors ${isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-100'}`
  const cardClasses = isDark
    ? 'rounded-2xl border border-slate-700 bg-slate-800 p-5'
    : 'rounded-2xl border border-slate-100 bg-slate-50 p-5'

  return (
    <section id="funciones" className={sectionClasses}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Todo lo que necesitas para alcanzar tus metas</h2>
          <p className={`mt-2 mx-auto max-w-2xl text-sm md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Lifefit combina gamificación, seguimiento y comunidad para mantener tu motivación en máximo nivel.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className={cardClasses}>
              <div className="mb-3 text-2xl">{icon}</div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className={`mt-2 text-xs md:text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CoreFeaturesSection
