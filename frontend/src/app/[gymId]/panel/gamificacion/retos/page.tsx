'use client'

import { useState, useEffect } from 'react'
import { getToken, getStoredUser } from '@/lib/auth'
import ChallengeManagement from '@/components/admin/ChallengeManagement'
import type { User } from '@/lib/types'

export default function ChallengesPage() {
  const [token, setToken] = useState<string | null>(null)
  const [userGymId, setUserGymId] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = getToken()
    const storedUser = getStoredUser<User>()
    setToken(storedToken)
    setUserGymId(storedUser?.gym as string ?? null)
  }, [])

  if (!token) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return <ChallengeManagement token={token} userGymId={userGymId} />
}
