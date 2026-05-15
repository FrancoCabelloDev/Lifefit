import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { SubscriptionPlan, PaginatedResponse } from '@/lib/types'

const FEATURES_LIST = [
  { id: "rutinas", label: "Rutinas" },
  { id: "nutricion", label: "Nutrición" },
  { id: "retos", label: "Retos" },
  { id: "ranking", label: "Ranking" },
  { id: "checkin", label: "Check-in" },
  { id: "coach", label: "LifeFit Coach" },
]

const PlansSection: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.get<PaginatedResponse<SubscriptionPlan>>("/api/subscriptions/plans/")
        // As it's already ordered by price in the backend
        setPlans(data.results || [])
      } catch (error) {
        console.error("Error fetching plans:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

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
        
        {loading ? (
          <div className="w-full text-center text-on-surface-variant">Cargando planes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {plans.map((plan, index) => {
              // Highlight the second plan, or the "Pro" one
              const isPopular = plan.name.toLowerCase() === 'pro' || index === 1
              
              if (isPopular) {
                return (
                  <div key={plan.id} className="bg-primary text-on-primary rounded-xl p-8 flex flex-col gap-6 transform md:-translate-y-4 ambient-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-secondary text-on-secondary text-xs font-bold px-3 py-1 rounded-bl-lg">MÁS POPULAR</div>
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-primary">{plan.name}</h3>
                      <p className="font-body-md text-body-md text-primary-container mt-2">{plan.description}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-headline-xl text-headline-xl text-on-primary">
                        {plan.price === '0.00' || plan.name.toLowerCase() === 'empresarial' ? 'A Medida' : `S/ ${plan.price}`}
                      </span>
                      {plan.name.toLowerCase() !== 'empresarial' && (
                        <span className="font-body-md text-body-md text-primary-container">
                          /{plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'annual' ? 'año' : plan.billing_cycle}
                        </span>
                      )}
                    </div>
                    <a 
                      className="w-full py-3 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md text-center btn-pressable shadow-[0_4px_0_var(--color-secondary)]" 
                      href="#"
                    >
                      {plan.name.toLowerCase() === 'empresarial' ? 'Contactar Ventas' : 'Iniciar Prueba Gratis'}
                    </a>
                    <ul className="flex flex-col gap-4 mt-4">
                      <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                        <span className="material-symbols-outlined text-primary-container">check</span> 
                        {plan.max_athletes >= 999999 ? 'Miembros Ilimitados' : `Hasta ${plan.max_athletes} Miembros`}
                      </li>
                      {plan.max_coaches > 0 && (
                        <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                          <span className="material-symbols-outlined text-primary-container">check</span> Hasta {plan.max_coaches} Coaches
                        </li>
                      )}
                      {plan.max_nutritionists > 0 && (
                        <li className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                          <span className="material-symbols-outlined text-primary-container">check</span> Hasta {plan.max_nutritionists} Nutricionistas
                        </li>
                      )}
                      {Object.entries(plan.features || {}).filter(([_, val]) => val).map(([key]) => {
                        const feature = FEATURES_LIST.find(f => f.id === key)
                        return feature ? (
                          <li key={key} className="flex items-center gap-3 font-body-md text-body-md text-on-primary">
                            <span className="material-symbols-outlined text-primary-container">check</span> {feature.label}
                          </li>
                        ) : null
                      })}
                    </ul>
                  </div>
                )
              }
              
              // Normal Plan
              return (
                <div key={plan.id} className="bg-surface rounded-xl p-8 border border-surface-container flex flex-col gap-6">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">{plan.name}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-2">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-xl text-headline-xl text-on-surface">
                      {plan.price === '0.00' || plan.name.toLowerCase() === 'empresarial' ? 'A Medida' : `S/ ${plan.price}`}
                    </span>
                    {plan.name.toLowerCase() !== 'empresarial' && (
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        /{plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'annual' ? 'año' : plan.billing_cycle}
                      </span>
                    )}
                  </div>
                  <a className="w-full py-3 rounded-full border-2 border-outline-variant text-on-surface font-label-md text-label-md text-center hover:bg-surface-variant transition-colors" href="#">
                    {plan.name.toLowerCase() === 'empresarial' ? 'Contactar Ventas' : 'Comenzar'}
                  </a>
                  <ul className="flex flex-col gap-4 mt-4">
                    <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                      <span className="material-symbols-outlined text-outline">check</span> 
                      {plan.max_athletes >= 999999 ? 'Miembros Ilimitados' : `Hasta ${plan.max_athletes} Miembros`}
                    </li>
                    {plan.max_coaches > 0 && (
                      <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                        <span className="material-symbols-outlined text-outline">check</span> Hasta {plan.max_coaches} Coaches
                      </li>
                    )}
                    {plan.max_nutritionists > 0 && (
                      <li className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                        <span className="material-symbols-outlined text-outline">check</span> Hasta {plan.max_nutritionists} Nutricionistas
                      </li>
                    )}
                    {Object.entries(plan.features || {}).filter(([_, val]) => val).map(([key]) => {
                      const feature = FEATURES_LIST.find(f => f.id === key)
                      return feature ? (
                        <li key={key} className="flex items-center gap-3 font-body-md text-body-md text-on-surface-variant">
                          <span className="material-symbols-outlined text-outline">check</span> {feature.label}
                        </li>
                      ) : null
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default PlansSection

