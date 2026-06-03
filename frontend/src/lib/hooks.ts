import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { getStoredUser } from './auth'
import type { SubscriptionTier } from './types'

export function useSubscriptionTier() {
  const user = getStoredUser<{ role: string }>()
  const isAthlete = user?.role === 'athlete'

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-tier', user?.role],
    queryFn: async () => {
      if (!isAthlete) return null
      const res = await api.get<{ tier: SubscriptionTier }>('/api/gyms/my-subscription-tier/')
      return res.tier
    },
    staleTime: 30_000,
    enabled: isAthlete,
  })

  // null (sin suscripción) = básico: no tiene acceso premium
  const tier: SubscriptionTier = isAthlete ? (data ?? 'basic') : null
  return { tier, isLoading: isAthlete ? isLoading : false }
}
