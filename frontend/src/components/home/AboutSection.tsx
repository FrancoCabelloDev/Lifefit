    import React from 'react'

const AboutSection: React.FC = () => {
  return (
    <section
      id="sobre-nosotros"
      className="bg-white py-14 md:py-20 border-t border-slate-100"
    >
      <div className="mx-auto max-w-6xl px-4 grid gap-10 md:grid-cols-2 items-start">
        {/* Texto principal */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-3">
            Sobre Lifefit
          </h2>
          <p className="text-sm md:text-base text-slate-600 mb-4">
            Lifefit nace con la misión de hacer que entrenar sea tan adictivo como
            jugar tu juego favorito. Combinamos gamificación, datos en tiempo real
            y comunidad para ayudarte a sostener el hábito a largo plazo.
          </p>
          <p className="text-sm md:text-base text-slate-600 mb-4">
            Nuestro equipo está formado por coaches, especialistas en producto y
            desarrolladores que han vivido de cerca el problema del abandono en
            gimnasios y programas online. Por eso diseñamos una experiencia que
            motiva tanto a atletas individuales como a gimnasios completos.
          </p>
          <p className="text-sm md:text-base text-slate-600">
            Creemos que el progreso debe sentirse, verse y celebrarse. Cada reto,
            insignia y punto de experiencia está pensado para acercarte un paso más
            a tu mejor versión.
          </p>
        </div>

        {/* Tarjetas / métricas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-3xl font-semibold text-emerald-500 mb-1">10k+</p>
            <p className="text-xs font-medium text-slate-900">
              Atletas registrados
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Usuarios que entrenan y hacen seguimiento de su progreso con Lifefit.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-3xl font-semibold text-emerald-500 mb-1">120+</p>
            <p className="text-xs font-medium text-slate-900">
              Gimnasios conectados
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Centros que utilizan retos, ranking y panel administrativo.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-3xl font-semibold text-emerald-500 mb-1">35%</p>
            <p className="text-xs font-medium text-slate-900">
              Menos abandono
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Reducción promedio en la tasa de abandono de los miembros.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-3xl font-semibold text-emerald-500 mb-1">4.6/5</p>
            <p className="text-xs font-medium text-slate-900">
              Satisfacción de usuarios
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Valoración promedio basada en encuestas internas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection
