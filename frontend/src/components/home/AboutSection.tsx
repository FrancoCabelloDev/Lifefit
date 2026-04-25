import React from 'react'

const team = [
  {
    name: 'Alejandra Vega',
    role: 'CEO & Co-founder',
    image: 'https://i.pravatar.cc/150?u=alejandra',
  },
  {
    name: 'Marcos Ruiz',
    role: 'CTO & Co-founder',
    image: 'https://i.pravatar.cc/150?u=marcos',
  },
  {
    name: 'Sofía Delgado',
    role: 'Head of Product',
    image: 'https://i.pravatar.cc/150?u=sofia',
  },
]

const AboutSection: React.FC = () => {
  return (
    <section
      id="sobre-nosotros"
      className="bg-[#0d0d0d] border-t border-zinc-800/50 py-20 md:py-32"
    >
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold text-white md:text-5xl tracking-tight">
          Sobre Nosotros
        </h2>
        <p className="mt-6 mx-auto max-w-2xl text-base text-zinc-400 leading-relaxed">
          Somos un equipo apasionado por el fitness y la tecnología. Creamos LifeFit porque creemos que la gamificación puede transformar la industria del fitness, ayudando a los gimnasios a retener clientes y a las personas a alcanzar sus metas.
        </p>

        <div className="mt-16 flex flex-wrap justify-center gap-12 sm:gap-24">
          {team.map(({ name, role, image }) => (
            <div key={name} className="flex flex-col items-center">
              <img
                src={image}
                alt={name}
                className="h-24 w-24 rounded-full border border-zinc-800 object-cover shadow-lg"
              />
              <h3 className="mt-4 text-lg font-bold text-white">{name}</h3>
              <p className="text-sm text-zinc-500">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AboutSection
