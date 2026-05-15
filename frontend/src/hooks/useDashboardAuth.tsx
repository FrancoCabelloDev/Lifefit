'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getToken, getStoredUser, setStoredUser, clearAuth, AUTH_EVENT, KEYS } from '@/lib/auth'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

export type DashboardUser = User
export { AUTH_EVENT } from '@/lib/auth'

type DashboardAuthContextValue = {
  user: DashboardUser | null
  token: string | null
  loading: boolean
  setUser: React.Dispatch<React.SetStateAction<DashboardUser | null>>
  refreshProfile: () => Promise<void>
}

const DashboardAuthContext = createContext<DashboardAuthContextValue | undefined>(undefined)

const readStoredUser = () => getStoredUser<DashboardUser>()
const readStoredToken = () => getToken()

export function DashboardAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setToken(readStoredToken())
    setUser(readStoredUser())
    setHydrated(true)

    const syncFromStorage = () => {
      setToken(readStoredToken())
      setUser(readStoredUser())
    }

    window.addEventListener(AUTH_EVENT, syncFromStorage)

    return () => {
      window.removeEventListener(AUTH_EVENT, syncFromStorage)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      setLoading(false)
      return
    }
    let canceled = false

    const fetchProfile = async () => {
      setLoading(true)
      try {
        const profile = await api.get<DashboardUser>("/api/auth/me/")
        if (canceled) return
        setUser(profile)
        setStoredUser(profile)
      } catch {
        if (canceled) return
        clearAuth()
        setUser(null)
        setToken(null)
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    fetchProfile()
    return () => { canceled = true }
  }, [token, hydrated])

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null)
      return
    }
    try {
      const profile = await api.get<DashboardUser>("/api/auth/me/")
      setUser(profile)
      setStoredUser(profile)
    } catch {
      clearAuth()
      setUser(null)
      setToken(null)
    }
  }, [token])

  const value = useMemo(
    () => ({ user, token, loading, setUser, refreshProfile }),
    [user, token, loading, refreshProfile],
  )

  return <DashboardAuthContext.Provider value={value}>{children}</DashboardAuthContext.Provider>
}

export function useDashboardAuth() {
  const context = useContext(DashboardAuthContext)
  const router = useRouter()
  if (!context) {
    throw new Error('useDashboardAuth must be used within DashboardAuthProvider')
  }

  useEffect(() => {
    if (context.loading) return
    if (!context.token) {
      router.replace('/ingresar')
    }
  }, [context.loading, context.token, router])

  return context
}
