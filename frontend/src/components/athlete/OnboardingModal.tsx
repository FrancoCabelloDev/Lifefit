'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dumbbell, Apple, Trophy, ArrowRight, X, CheckCircle2,
  Users, MessageSquare, Ruler,
} from 'lucide-react'

const STORAGE_KEY = 'lifefit_onboarding_done'

const STEPS = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Lifefit!',
    subtitle: 'Tu plataforma de entrenamiento gamificado',
    icon: Trophy,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Estás a punto de comenzar tu journey de fitness. Aquí podrás entrenar, llevar tu nutrición, ganar puntos y superar tus propios records.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            { icon: Dumbbell, label: 'Rutinas personalizadas', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Apple, label: 'Plan nutricional', color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: Trophy, label: 'Gamificación y retos', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { icon: MessageSquare, label: 'Contacto con tu equipo', color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`flex items-center gap-2 p-3 ${bg} rounded-xl`}>
              <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
              <span className="text-xs font-medium text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'team',
    title: 'Elige tu equipo',
    subtitle: 'Coach y nutricionista te guiarán',
    icon: Users,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Con tu plan Premium puedes elegir un coach que te asigne rutinas personalizadas y un nutricionista que lleve tu alimentación.
        </p>
        <div className="space-y-2">
          {[
            { icon: Dumbbell, title: 'Tu Coach', desc: 'Rutinas a medida + mensajes directos', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { icon: Apple, title: 'Tu Nutricionista', desc: 'Plan nutricional + seguimiento de medidas', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className={`flex items-start gap-3 p-3 ${bg} border rounded-xl`}>
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'explore',
    title: 'Todo en un solo lugar',
    subtitle: 'Tu menú lateral tiene todo lo que necesitas',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Navega por el menú lateral para acceder a todas las secciones. Te recomendamos empezar por:
        </p>
        <div className="space-y-2">
          {[
            { icon: Users, label: 'Directorio', desc: 'Elige tu coach y nutricionista', color: 'text-violet-600' },
            { icon: Dumbbell, label: 'Mis Rutinas', desc: 'Ve tus entrenamientos asignados', color: 'text-emerald-600' },
            { icon: Ruler, label: 'Mis Medidas', desc: 'Seguimiento de tu progreso corporal', color: 'text-indigo-600' },
            { icon: MessageSquare, label: 'Mensajes', desc: 'Habla con tu coach y nutricionista', color: 'text-amber-600' },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
              <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
              <div>
                <span className="text-xs font-semibold text-slate-800">{label}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

interface Props {
  gymId: string
}

export default function OnboardingModal({ gymId }: Props) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  function goToDirectory() {
    dismiss()
    router.push(`/${gymId}/panel/mi-equipo`)
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1
  const isTeamStep = current.id === 'team'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-5 pb-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-emerald-600' : i < step ? 'w-1.5 bg-emerald-300' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-12 h-12 rounded-2xl ${current.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${current.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{current.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{current.subtitle}</p>
            </div>
          </div>

          {current.content}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="h-10 px-4 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Atrás
            </button>
          )}
          <div className="flex-1 flex gap-2 justify-end">
            {isTeamStep && (
              <button
                onClick={goToDirectory}
                className="h-10 px-4 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                Ir al Directorio
              </button>
            )}
            <button
              onClick={next}
              className="h-10 px-5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Empezar!
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
