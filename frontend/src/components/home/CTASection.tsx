import React from 'react'

const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface">
      <div className="max-w-4xl mx-auto bg-primary-container rounded-[2rem] p-12 text-center flex flex-col items-center gap-6 ambient-shadow relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" 
        ></div>
        <h2 className="font-headline-xl text-headline-xl text-on-primary-container relative z-10">
          ¿Listo para subir de nivel tu gimnasio?
        </h2>
        <p className="font-body-lg text-body-lg text-on-primary-container/80 max-w-xl relative z-10">
          Únete a cientos de instalaciones que están utilizando LifeFit para aumentar la retención de sus miembros en más de un 40%.
        </p>
        <div className="flex gap-4 mt-4 relative z-10">
          <a className="bg-primary text-on-primary font-label-md text-label-md px-8 py-4 rounded-full btn-pressable" href="#">
            Inicia tu Prueba Gratis de 14 Días
          </a>
        </div>
      </div>
    </section>
  )
}

export default CTASection
