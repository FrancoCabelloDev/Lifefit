import React from 'react'

const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
      <div className="flex-1 flex flex-col gap-stack-lg z-10">
        <div className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-full w-fit">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <span className="font-label-md text-label-md">Nuevo: Entrenador IA Beta</span>
        </div>
        
        <h1 className="font-headline-xl text-headline-xl text-on-background lg:text-6xl leading-tight">
          Transforma el <span className="text-primary relative inline-block">esfuerzo
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary-container" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path d="M0 10 Q 50 20 100 10" fill="transparent" stroke="currentColor" strokeWidth="4"></path>
            </svg>
          </span> en un juego.
        </h1>
        
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
          LifeFit es la plataforma SaaS B2B definitiva para gimnasios. Gamifica la experiencia de tus miembros, aumenta la retención y construye una comunidad comprometida con nuestro software de marca blanca.
        </p>
        
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <a className="bg-primary text-on-primary font-label-md text-label-md px-8 py-4 rounded-full btn-pressable inline-flex items-center gap-2" href="#demo">
            Agenda una Demo <span className="material-symbols-outlined">arrow_forward</span>
          </a>
          <a className="bg-surface-container-high text-on-surface font-label-md text-label-md px-8 py-4 rounded-full hover:bg-surface-variant transition-colors" href="#pricing">
            Ver Precios
          </a>
        </div>
      </div>
      
      {/* Hero Image/Graphic (Glassmorphism card cluster) */}
      <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[600px]">
        <div className="absolute inset-0 bg-primary-container rounded-full blur-[100px] opacity-40 mix-blend-multiply"></div>
        
        {/* Main UI Mockup */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-surface rounded-xl ambient-shadow border border-surface-container-highest overflow-hidden flex flex-col">
          <div className="h-12 bg-surface-container-lowest border-b border-surface-container-highest flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-error"></div>
            <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
            <div className="w-3 h-3 rounded-full bg-primary-container"></div>
          </div>
          
          <div className="flex-1 p-6 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            <div className="w-full h-full bg-gradient-to-t from-surface/90 to-transparent flex flex-col justify-end p-4 rounded-lg backdrop-blur-sm">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Progreso de Alex</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">Nivel 12 • Modo Bestia</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center ambient-shadow">
                  <span className="material-symbols-outlined text-3xl text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
                </div>
              </div>
              <div className="mt-4 h-3 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Badges */}
        <div className="absolute top-1/4 -left-8 bg-surface p-4 rounded-xl ambient-shadow border border-surface-container-highest flex items-center gap-3 animate-[bounce_3s_infinite]">
          <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-tertiary-container">psychology</span>
          </div>
          <div>
            <div className="font-label-md text-label-md text-on-surface">Rutina IA</div>
            <div className="font-body-md text-body-md text-on-surface-variant text-sm">Generada</div>
          </div>
        </div>
        
        <div className="absolute bottom-1/4 -right-8 bg-surface p-4 rounded-xl ambient-shadow border border-surface-container-highest flex items-center gap-3 animate-[bounce_4s_infinite_reverse]">
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-error-container" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          </div>
          <div>
            <div className="font-label-md text-label-md text-on-surface">Racha de 14 Días</div>
            <div className="font-body-md text-body-md text-on-surface-variant text-sm">+500 XP</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
