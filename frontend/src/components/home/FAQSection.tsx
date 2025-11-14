'use client'

import React, { useState } from 'react'

const faqs = [
  {
    question: '¿Cómo funciona el sistema de puntos e insignias?',
    answer:
      'Cada vez que completas un entrenamiento, participas en un reto o alcanzas una meta, ganas puntos XP. Al acumular suficientes puntos, subes de nivel y desbloqueas nuevas insignias.',
  },
  {
    question: '¿Puedo usar Lifefit si no pertenezco a un gimnasio?',
    answer:
      'Sí. Puedes usar Lifefit de forma individual para llevar control de tus rutinas, retos y nutrición, aunque tengas o no un gimnasio asociado.',
  },
  {
    question: '¿Las rutinas y planes de nutrición son personalizados?',
    answer:
      'Sí. Puedes ajustar tus objetivos, nivel de experiencia y restricciones para recibir recomendaciones personalizadas.',
  },
  {
    question: '¿Qué incluye el plan Pro?',
    answer:
      'Incluye acceso completo a rutinas ilimitadas, todos los retos, plan de nutrición, ranking global e insignias premium, además de soporte prioritario.',
  },
  {
    question: '¿Cómo funciona la integración para gimnasios?',
    answer:
      'Los gimnasios pueden conectar sus sistemas de membresías y pagos, gestionar usuarios, retos y reportes desde un panel de administración centralizado.',
  },
]

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="bg-slate-50 py-14 md:py-20 border-t border-slate-100"
    >
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Preguntas frecuentes
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            Resuelve tus dudas sobre Lifefit
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <button
                key={faq.question}
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full rounded-2xl bg-white border border-slate-200 px-4 py-3 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-900">
                    {faq.question}
                  </span>
                  <span className="text-lg text-slate-400">
                    {isOpen ? '▴' : '▾'}
                  </span>
                </div>
                {isOpen && (
                  <p className="mt-2 text-xs md:text-sm text-slate-600">
                    {faq.answer}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQSection
