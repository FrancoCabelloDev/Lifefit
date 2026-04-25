import React from 'react'

const PlansSection: React.FC = () => {
  return (
    <section className="py-24 bg-surface-container-lowest px-margin-mobile md:px-margin-desktop" id="pricing">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="text-center max-w-2xl mb-12">
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-4">Precios simples y transparentes</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Escala la presencia digital de tu gimnasio sin arruinarte.
          </p>
        </div>
        
        {/* Toggle (Visual Only) */}
        <div className="bg-surface-container-high p-1 rounded-full inline-flex mb-12">
          <button className="px-6 py-2 rounded-full bg-surface text-on-surface font-label-md text-label-md shadow-sm">Mensual</button>
          <button className="px-6 py-2 rounded-full text-on-surface-variant font-label-md text-label-md hover:text-on-surface transition-colors">
            Anual <span className="text-primary text-xs ml-1">-20%</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Starter */}
          <div className="bg-surface rounded-xl p-8 border border-surface-container flex flex-col gap-6">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Básico</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Perfecto para estudios boutique.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-xl text-headline-xl text-on-surface">$99</span>
              <span className="font-body-md text-body-md text-on-surface-variant">/mes</span>
            </div>
            <a className="w-full py-3 rounded-full border-2 border-outline-variant text-on-surface font-label-md text-label-md text-center hover:bg-surface-variant transition-colors" href="#">
              Comenzar
            </a>
            <ul className="flex flex-col gap-4 mt-4">
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-outline">check</span> Hasta 500 Miembros
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-outline">check</span> Gamificación Básica
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-outline">check</span> App con tu Marca
              </li>
            </ul>
          </div>
          
          {/* Pro (Highlighted) */}
          <div className="bg-primary text-on-primary rounded-xl p-8 flex flex-col gap-6 transform md:-translate-y-4 ambient-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-secondary text-on-secondary text-xs font-bold px-3 py-1 rounded-bl-lg">MÁS POPULAR</div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-primary">Pro</h3>
              <p className="font-body-md text-body-md text-primary-container mt-2">Para centros fitness en crecimiento.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-xl text-headline-xl text-on-primary">$249</span>
              <span className="font-body-md text-body-md text-primary-container">/mes</span>
            </div>
            <a 
              className="w-full py-3 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md text-center btn-pressable shadow-[0_4px_0_var(--color-secondary)]" 
              href="#"
            >
              Iniciar Prueba Gratis
            </a>
            <ul className="flex flex-col gap-4 mt-4">
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                <span className="material-symbols-outlined text-primary-container">check</span> Hasta 2,500 Miembros
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                <span className="material-symbols-outlined text-primary-container">check</span> Entrenador IA Avanzado
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                <span className="material-symbols-outlined text-primary-container">check</span> Marca Blanca Completa
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                <span className="material-symbols-outlined text-primary-container">check</span> Tienda de Recompensas
              </li>
            </ul>
          </div>
          
          {/* Enterprise */}
          <div className="bg-surface rounded-xl p-8 border border-surface-container flex flex-col gap-6">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Empresarial</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Para cadenas de múltiples locales.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-xl text-headline-xl text-on-surface">A Medida</span>
            </div>
            <a className="w-full py-3 rounded-full border-2 border-outline-variant text-on-surface font-label-md text-label-md text-center hover:bg-surface-variant transition-colors" href="#">
              Contactar Ventas
            </a>
            <ul className="flex flex-col gap-4 mt-4">
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-outline">check</span> Miembros Ilimitados
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-outline">check</span> Acceso API
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-outline">check</span> Manager de Éxito Dedicado
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PlansSection
