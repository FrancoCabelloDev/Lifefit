'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, Apple, ChevronRight } from 'lucide-react'
import { useRoleGuard } from '@/hooks/useRoleGuard'

export default function MensajesHubPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()
  useRoleGuard(gymId, ['athlete'])

  const channels = [
    {
      title: 'Mensajes con mi Coach',
      desc: 'Comunícate con tu entrenador personal',
      icon: Dumbbell,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      href: `/${gymId}/panel/mensajes-coach`,
    },
    {
      title: 'Mensajes con mi Nutricionista',
      desc: 'Habla con tu especialista en nutrición',
      icon: Apple,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
      href: `/${gymId}/panel/mensajes-nutricionista`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Mensajes</h1>
        <p className="text-sm text-slate-400 mt-0.5">Tu comunicación con el equipo del gimnasio</p>
      </div>

      <div className="space-y-3">
        {channels.map((ch) => {
          const Icon = ch.icon
          return (
            <button
              key={ch.href}
              onClick={() => router.push(ch.href)}
              className={`w-full flex items-center gap-4 p-4 bg-white rounded-2xl border ${ch.border} shadow-sm active:scale-[0.98] transition-transform text-left`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ch.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{ch.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ch.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
