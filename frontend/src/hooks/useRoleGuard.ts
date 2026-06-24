'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser } from '@/lib/auth'

type Role = 'athlete' | 'coach' | 'nutritionist' | 'receptionist' | 'gym_admin' | 'super_admin'

/**
 * Redirects to /panel if the current user's role is not in the allowed list.
 * Use at the top of any page that is role-restricted.
 *
 * @param gymId    - gym slug (from route params)
 * @param allowed  - roles that may access this page
 */
export function useRoleGuard(gymId: string, allowed: Role[]) {
  const router = useRouter()

  useEffect(() => {
    const user = getStoredUser<{ role: Role }>()
    if (!user || !allowed.includes(user.role)) {
      router.replace(`/${gymId}/panel`)
    }
  }, [gymId, router]) // eslint-disable-line react-hooks/exhaustive-deps
}
