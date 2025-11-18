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
      'Sí. Puedes usar Lifefit de forma individual para llevar control de tus rutinas, retos y nutrición, tengas o no un gimnasio asociado.',
  },
  {
    question: '¿Las rutinas y planes de nutrición son personalizados?',
    answer:
      'Sí. Ajusta tus objetivos, nivel de experiencia y restricciones para recibir recomendaciones personalizadas.',
  },
  {
    question: '¿Qué incluye el plan Pro?',
    answer:
      'Incluye acceso completo a rutinas ilimitadas, retos, plan de nutrición, ranking global e insignias premium, además de soporte prioritario.',
  },
  {
    question: '¿Cómo funciona la integración para gimnasios?',
    answer:
      'Los gimnasios conectan sus sistemas de membresías y pagos, gestionan usuarios, retos y reportes desde un panel administrativo centralizado.',
  },
]

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="border-t border-slate-100 bg-slate-50 py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Preguntas frecuentes</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 md:text-base">Resuelve tus dudas sobre Lifefit.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <button
                key={faq.question}
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">{faq.question}</span>
                  <span className="text-lg text-slate-400 dark:text-slate-500">{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 md:text-sm">
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
