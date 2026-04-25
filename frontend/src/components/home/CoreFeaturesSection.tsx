import React from 'react'

const CoreFeaturesSection: React.FC = () => {
  return (
    <section className="py-32 px-margin-mobile md:px-margin-desktop bg-background" id="solutions">
      <div className="max-w-7xl mx-auto flex flex-col gap-24">
        
        {/* Feature 1: Gamification */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-on-secondary-container text-2xl">sports_esports</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Motor de Gamificación</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Convierte los entrenamientos rutinarios en misiones. Configura desafíos personalizados, otorga XP por asistencia y crea una sensación de progreso que mantenga a los miembros regresando.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-primary">check_circle</span> Medallas y Niveles Personalizables
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-primary">check_circle</span> Tablas de Clasificación Automatizadas
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-primary">check_circle</span> Sistema de Recompensas por Logros
              </li>
            </ul>
          </div>
          
          <div className="flex-1 w-full bg-surface-container-high rounded-xl p-8 ambient-shadow flex flex-col gap-4">
            {/* Mockup inner */}
            <div className="bg-surface rounded-lg p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">1</div>
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Sarah J.</div>
                  <div className="font-body-md text-body-md text-on-surface-variant text-sm">12,400 XP</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-secondary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            </div>
            
            <div className="bg-surface rounded-lg p-4 flex items-center justify-between shadow-sm border-l-4 border-primary">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-bold">2</div>
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Tú</div>
                  <div className="font-body-md text-body-md text-on-surface-variant text-sm">11,250 XP</div>
                </div>
              </div>
              <span className="font-label-md text-label-md text-primary">2do</span>
            </div>
            
            <div className="bg-surface rounded-lg p-4 flex items-center justify-between shadow-sm opacity-60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-bold">3</div>
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Mike T.</div>
                  <div className="font-body-md text-body-md text-on-surface-variant text-sm">9,800 XP</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: AI Coach */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-12 h-12 bg-tertiary-container rounded-xl flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-on-tertiary-container text-2xl">smart_toy</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Integración de Entrenador IA</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Escala el entrenamiento personal sin esfuerzo. Nuestra IA genera planes de entrenamiento dinámicos y personalizados basados en el equipo disponible y los objetivos del miembro.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-tertiary">check_circle</span> Rutinas Basadas en tu Equipo
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-tertiary">check_circle</span> Consejos de Corrección de Postura
              </li>
              <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-tertiary">check_circle</span> Seguimiento de Sobrecarga Progresiva
              </li>
            </ul>
          </div>
          
          <div className="flex-1 w-full relative">
            <img 
              alt="Aplicación Móvil del Entrenador IA" 
              className="rounded-xl w-full h-[400px] object-cover ambient-shadow" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgr5xyM5iT4Z2yZki1uflvpQH9PMiJk4W7-JkMdOtiA7l1qOrmyXOW-6vGDxnP7fCbSSnYWAW9OmyEt_M3nk6ImBeRmGm9ssY2faZxQ4k_SwA60w6-F945eDUxKuah1WL96MopOtZ-ZByT2cgP_A64A1OoQGlslqdrpWpTh5xg__LRJPMiJvBC06jMl4hDaAt-VzQ_Bnan4qz3HZh3swcKZaLKqlm5J_NsfW5ZKYLcIoFc18SQl7TzDaAngU1e7nFj4dAV7ssTSKw"
            />
            <div className="absolute -bottom-6 -right-6 bg-surface p-4 rounded-xl ambient-shadow border border-surface-container max-w-xs">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-tertiary">info</span>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">Consejo del Entrenador</p>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">Basado en tu reciente prensa de piernas, aumentemos el peso en sentadillas por 5lbs hoy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  )
}

export default CoreFeaturesSection
