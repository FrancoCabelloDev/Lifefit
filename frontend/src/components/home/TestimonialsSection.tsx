import React from 'react'

const testimonials = [
  {
    quote:
      'Lifefit cambió mi forma de entrenar. Los retos me mantienen motivado cada semana.',
    name: 'Carlos Méndez',
    role: 'Atleta Premium',
  },
  {
    quote:
      'Como coach, puedo seguir el progreso de mis atletas en tiempo real. Increíble herramienta.',
    name: 'Laura Gómez',
    role: 'Coach Certificada',
  },
  {
    quote:
      'La retención de mis miembros aumentó un 35% desde que implementamos Lifefit.',
    name: 'Miguel Torres',
    role: 'Propietario Gym',
  },
]

const TestimonialsSection: React.FC = () => {
  return (
    <section
      id="testimonios"
      className="bg-white py-14 md:py-20 border-t border-slate-100"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            Miles de atletas y gimnasios ya confían en Lifefit para alcanzar sus
            objetivos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-sm flex flex-col"
            >
              {/* Estrellitas */}
              <div className="mb-3 text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs md:text-sm text-slate-700 flex-1">
                “{t.quote}”
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-300" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-slate-500">{t.role}</div>
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
