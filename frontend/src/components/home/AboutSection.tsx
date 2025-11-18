import React from 'react'

const stats = [
  { value: '10k+', label: 'Atletas registrados', desc: 'Usuarios que entrenan y hacen seguimiento de su progreso con Lifefit.' },
  { value: '120+', label: 'Gimnasios conectados', desc: 'Centros que utilizan retos, ranking y panel administrativo.' },
  { value: '35%', label: 'Menos abandono', desc: 'Reducción promedio en la tasa de abandono de los miembros.' },
  { value: '4.6/5', label: 'Satisfacción de usuarios', desc: 'Valoración promedio basada en encuestas internas.' },
]

const AboutSection: React.FC = () => {
  return (
    <section
      id="sobre-nosotros"
      className="border-t border-slate-100 bg-white py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-2xl font-semibold md:text-3xl">Sobre Lifefit</h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Lifefit nace con la misión de hacer que entrenar sea tan adictivo como jugar tu juego favorito. Combinamos gamificación,
            datos en tiempo real y comunidad para ayudarte a sostener el hábito a largo plazo.
          </p>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Nuestro equipo está formado por coaches, especialistas en producto y desarrolladores que han vivido de cerca el problema
            del abandono en gimnasios y programas online. Por eso diseñamos una experiencia que motiva tanto a atletas individuales
            como a gimnasios completos.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 md:text-base">
            Creemos que el progreso debe sentirse, verse y celebrarse. Cada reto, insignia y punto de experiencia está pensado para
            acercarte un paso más a tu mejor versión.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map(({ value, label, desc }) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
              <p className="mb-1 text-3xl font-semibold text-emerald-500">{value}</p>
              <p className="text-xs font-medium">{label}</p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AboutSection
