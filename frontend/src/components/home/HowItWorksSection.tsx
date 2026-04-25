import React from 'react'

const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-24 bg-surface-container-low px-margin-mobile md:px-margin-desktop" id="product">
      <div className="max-w-7xl mx-auto flex flex-col gap-stack-lg">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="font-headline-lg text-headline-lg text-on-background mb-4">Cómo funciona</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Tres simples pasos para transformar tus instalaciones de un simple gimnasio a un centro interactivo para tu comunidad.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-surface rounded-xl p-8 ambient-shadow border border-surface-container flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-on-primary font-headline-md text-headline-md z-10">1</div>
            <h3 className="font-headline-md text-headline-md text-on-surface z-10 mt-4">Conecta tu Gimnasio</h3>
            <p className="font-body-md text-body-md text-on-surface-variant z-10">
              Integra nuestro software con tu control de acceso y sistemas de gestión de miembros en minutos.
            </p>
            <div className="mt-auto pt-8 z-10">
              <img 
                alt="Panel de control" 
                className="rounded-lg w-full h-32 object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4NnR0IregnunW8chP-7hdMc7Ats6E-l1K-LmVCqohel1Woch92RELGvjPJ3E4DLC8ZWRlgPeSDRZnyo8uScYmdaxOjZhkZFNALP0T_PJLAw9EfoX6kIQ4Gel0b18mR5dbooFP5ii9AqOZ_v8i8878DxknFfKxKEhXlj_caIQ9-Ed3JI5mGMwg12Bn1sML9XRJK6ApV6U_hKeBiUxNm0W1Asx7Dt5hALzYepmodrRmrH8K210a4zvbsJwEltlTB2Be1xsbITYSBmI"
              />
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="bg-surface rounded-xl p-8 ambient-shadow border border-surface-container flex flex-col gap-4 relative overflow-hidden group md:translate-y-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-on-primary font-headline-md text-headline-md z-10">2</div>
            <h3 className="font-headline-md text-headline-md text-on-surface z-10 mt-4">Descarga de Miembros</h3>
            <p className="font-body-md text-body-md text-on-surface-variant z-10">
              Proporciona a tus miembros una aplicación con tu propia marca donde pueden seguir sus rutinas, reservar clases y ver sus estadísticas.
            </p>
            <div className="mt-auto pt-8 z-10 flex justify-center">
              <div className="w-24 h-48 bg-surface-container-high rounded-[2rem] border-4 border-surface-variant flex flex-col items-center p-2 relative">
                <div className="w-8 h-1 bg-surface-variant rounded-full mb-2"></div>
                <div className="flex-1 w-full bg-white rounded-xl flex items-center justify-center flex-col gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">fitness_center</span>
                  </div>
                  <div className="h-2 w-12 bg-surface-variant rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="bg-surface rounded-xl p-8 ambient-shadow border border-surface-container flex flex-col gap-4 relative overflow-hidden group md:translate-y-16">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary-container rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="w-12 h-12 bg-tertiary rounded-lg flex items-center justify-center text-on-tertiary font-headline-md text-headline-md z-10">3</div>
            <h3 className="font-headline-md text-headline-md text-on-surface z-10 mt-4">Gamifica y Retén</h3>
            <p className="font-body-md text-body-md text-on-surface-variant z-10">
              Observa cómo el compromiso se dispara mientras los miembros ganan medallas, completan desafíos y suben en la clasificación.
            </p>
            <div className="mt-auto pt-8 z-10 flex flex-col gap-2">
              <div className="bg-surface-container-high rounded-lg p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-label-md text-label-md text-on-surface">Medalla de Hierro Obtenida</span>
              </div>
              <div className="bg-surface-container-high rounded-lg p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                <span className="font-label-md text-label-md text-on-surface">Subiste al Top 10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
