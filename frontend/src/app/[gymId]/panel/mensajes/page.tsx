'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User } from '@/lib/types'

export default function MensajesRedirect({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()
  const user = getStoredUser<User>()
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    // Roles no-atleta ya tienen links directos en el sidebar — no deberían llegar aquí
    if (!user || user.role !== 'athlete') {
      router.replace(`/${gymId}/panel/mensajes-nutricionista`)
      return
    }

    // Consultar asignaciones activas en paralelo
    Promise.all([
      api.get<any>('/api/gyms/nutritionist-assignments/', { params: { is_active: 'true' } }).catch(() => null),
      api.get<any>('/api/gyms/coach-assignments/',        { params: { is_active: 'true' } }).catch(() => null),
    ]).then(([nutriRes, coachRes]) => {
      const nutris: any[] = Array.isArray(nutriRes) ? nutriRes : nutriRes?.results ?? []
      const coaches: any[] = Array.isArray(coachRes) ? coachRes : coachRes?.results ?? []

      const hasNutri = nutris.some((a: any) => a.is_active)
      const hasCoach = coaches.some((a: any) => a.is_active)

      if (hasNutri) {
        router.replace(`/${gymId}/panel/mensajes-nutricionista`)
      } else if (hasCoach) {
        router.replace(`/${gymId}/panel/mensajes-coach`)
      } else {
        // Sin asignaciones activas — mostrar mensajes-nutricionista con su estado vacío
        router.replace(`/${gymId}/panel/mensajes-nutricionista`)
      }
    }).finally(() => setResolving(false))
  }, [gymId])

  if (!resolving) return null

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-slate-300" />
      </div>
      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
    </div>
  )
}
