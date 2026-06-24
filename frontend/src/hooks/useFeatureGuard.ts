'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

/**
 * Redirects to /panel if the given feature flag is not active for the gym.
 * Runs silently — no loading state exposed; the page simply never renders
 * if the flag is off.
 *
 * @param gymId - gym slug (from route params)
 * @param flag  - feature flag code to check (e.g. 'rutinas', 'nutricion')
 */
export function useFeatureGuard(gymId: string, flag: string) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api.get<any>('/api/gyms/feature-flags/')
      .then(data => {
        const flags = (data?.results || data || []) as Array<{
          feature_flag_detail: { code: string }
          is_active: boolean
        }>
        const enabled = flags.some(f => f.feature_flag_detail.code === flag && f.is_active)
        if (!enabled) {
          router.replace(`/${gymId}/panel`)
        } else {
          setChecked(true)
        }
      })
      .catch(() => {
        // On error, allow access (don't block on a network issue)
        setChecked(true)
      })
  }, [gymId, flag, router])

  return checked
}
