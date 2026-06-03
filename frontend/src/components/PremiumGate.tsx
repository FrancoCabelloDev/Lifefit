'use client'

import { Lock, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useSubscriptionTier } from '@/lib/hooks'

interface PremiumGateProps {
  children: React.ReactNode
  feature?: string
}

export default function PremiumGate({ children, feature }: PremiumGateProps) {
  const { tier, isLoading } = useSubscriptionTier()

  if (isLoading) return null
  if (tier === 'premium') return <>{children}</>

  return (
    <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Función Premium
          </h3>
          <p className="text-slate-500 mt-1 max-w-sm">
            {feature
              ? `${feature} está disponible solo en el plan Premium.`
              : 'Esta función está disponible solo en el plan Premium.'}
          </p>
          <p className="text-sm text-amber-600 font-medium mt-3">
            Habla con tu gimnasio para actualizar tu membresía.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
