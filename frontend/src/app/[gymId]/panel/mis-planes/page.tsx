'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, UtensilsCrossed, ChevronRight, Dumbbell } from 'lucide-react'
import { useRoleGuard } from '@/hooks/useRoleGuard'

export default function MisPlanesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()
  useRoleGuard(gymId, ['athlete'])

  const cards = [
    {
      title: 'Plan de Entrenamiento',
      desc: 'Tu plan semanal de rutinas diseñado por tu coach',
      icon: CalendarDays,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      href: `/${gymId}/panel/mi-plan-semanal`,
    },
    {
      title: 'Plan Alimentario',
      desc: 'Tu plan nutricional y registro de comidas diarias',
      icon: UtensilsCrossed,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
      href: `/${gymId}/panel/mi-nutricion`,
    },
    {
      title: 'Mis Rutinas',
      desc: 'Catálogo de rutinas disponibles para ti',
      icon: Dumbbell,
      color: 'bg-violet-50 text-violet-600',
      border: 'border-violet-100',
      href: `/${gymId}/panel/mis-rutinas`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Mis Planes</h1>
        <p className="text-sm text-slate-400 mt-0.5">Tu entrenamiento y nutrición en un solo lugar</p>
      </div>

      <div className="space-y-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.href}
              onClick={() => router.push(card.href)}
              className={`w-full flex items-center gap-4 p-4 bg-white rounded-2xl border ${card.border} shadow-sm active:scale-[0.98] transition-transform text-left`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{card.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
