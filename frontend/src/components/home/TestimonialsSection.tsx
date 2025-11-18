import React from 'react'

const testimonials = [
  {
    quote: 'Lifefit cambió mi forma de entrenar. Los retos me mantienen motivado cada semana.',
    name: 'Carlos Méndez',
    role: 'Atleta Premium',
  },
  {
    quote: 'Como coach, puedo seguir el progreso de mis atletas en tiempo real. Increíble herramienta.',
    name: 'Laura Gómez',
    role: 'Coach Certificada',
  },
  {
    quote: 'La retención de mis miembros aumentó un 35% desde que implementamos Lifefit.',
    name: 'Miguel Torres',
    role: 'Propietario Gym',
  },
]

const TestimonialsSection: React.FC = () => {
  return (
    <section
      id="testimonios"
      className="border-t border-slate-100 bg-white py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Lo que dicen nuestros usuarios</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Miles de atletas y gimnasios ya confían en Lifefit para alcanzar sus objetivos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-3 text-sm text-amber-400">★★★★★</div>
              <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 md:text-sm">“{t.quote}”</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div>
                  <div className="text-xs font-semibold">{t.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection
