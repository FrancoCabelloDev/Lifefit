import React from 'react'
import { ClipboardCheck, Apple, Target, Trophy, Bot, MapPin, BarChart3, Users } from 'lucide-react'

const features = [
  {
    icon: ClipboardCheck,
    title: 'Rutinas Personalizadas',
    desc: 'Cada coach asigna entrenamientos específicos a sus clientes.',
  },
  {
    icon: Apple,
    title: 'Planes de Nutrición',
    desc: 'Seguimiento de calorías, macros y adherencia diaria.',
  },
  {
    icon: Target,
    title: 'Retos Gamificados',
    desc: 'Retos individuales y grupales que mantienen la motivación.',
  },
  {
    icon: Trophy,
    title: 'Rankings y XP',
    desc: 'Puntos, niveles, rachas e insignias estilo videojuego.',
  },
  {
    icon: Bot,
    title: 'Coach IA Integrado',
    desc: 'Asistente inteligente que guía y motiva a cada usuario.',
  },
  {
    icon: MapPin,
    title: 'Check-in QR',
    desc: 'Control de asistencia con verificación doble del coach.',
  },
  {
    icon: BarChart3,
    title: 'Métricas para el Gimnasio',
    desc: 'Panel admin con retención, adherencia y crecimiento.',
  },
  {
    icon: Users,
    title: 'Multi-Gimnasio (SaaS)',
    desc: 'Cada gimnasio con su propia base de datos y configuración.',
  },
]

const CoreFeaturesSection: React.FC = () => {
  return (
    <section
      id="funciones"
      className="relative overflow-hidden bg-[#0a0a0a] border-t border-zinc-800/50 py-20 md:py-32"
    >
      {/* Subtle glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white md:text-5xl tracking-tight">Todo lo que tu gimnasio necesita</h2>
          <p className="mt-4 mx-auto max-w-2xl text-base text-zinc-400">
            Una plataforma completa que integra entrenamiento, nutrición y gamificación para maximizar la experiencia de tus clientes.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/60 p-6 transition-all hover:border-yellow-400/30 hover:bg-zinc-900/80 hover:shadow-[0_0_30px_-10px_rgba(250,204,21,0.15)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10 group-hover:bg-yellow-400/20 transition-colors">
                <Icon className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CoreFeaturesSection

