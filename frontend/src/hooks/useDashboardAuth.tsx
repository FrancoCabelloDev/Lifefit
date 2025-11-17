'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
export const AUTH_EVENT = 'lifefit-auth-changed'

export type DashboardUser = {
  id: string
  first_name: string
  last_name: string
  email: string
  puntos: number
  nivel: number
  role: string
  gym?: string | number | null
  is_google_account?: boolean
}

type DashboardAuthContextValue = {
  user: DashboardUser | null
  token: string | null
  loading: boolean
  setUser: React.Dispatch<React.SetStateAction<DashboardUser | null>>
  refreshProfile: () => Promise<void>
}

const DashboardAuthContext = createContext<DashboardAuthContextValue | undefined>(undefined)

const readStoredUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem('lifefit_user')
    return stored ? (JSON.parse(stored) as DashboardUser) : null
  } catch {
    return null
  }
}

const readStoredToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('lifefit_access_token')
}

export function DashboardAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(() => readStoredUser())
  const [token, setToken] = useState<string | null>(() => readStoredToken())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncFromStorage = () => {
      setToken(readStoredToken())
      setUser(readStoredUser())
    }

    window.addEventListener(AUTH_EVENT, syncFromStorage)
    syncFromStorage()

    return () => {
      window.removeEventListener(AUTH_EVENT, syncFromStorage)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let canceled = false
    const controller = new AbortController()
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const profile = await response.json()
        if (canceled) return
        setUser(profile)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('lifefit_user', JSON.stringify(profile))
        }
      } catch (error) {
        if (canceled) return
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('lifefit_access_token')
          window.localStorage.removeItem('lifefit_refresh_token')
          window.localStorage.removeItem('lifefit_user')
        }
        setUser(null)
        setToken(null)
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    fetchProfile()
    return () => {
      canceled = true
      controller.abort()
    }
  }, [token])

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null)
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error('Unauthorized')
      }
      const profile = await response.json()
      setUser(profile)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lifefit_user', JSON.stringify(profile))
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('lifefit_access_token')
        window.localStorage.removeItem('lifefit_refresh_token')
        window.localStorage.removeItem('lifefit_user')
      }
      setUser(null)
      setToken(null)
    }
  }, [token])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      setUser,
      refreshProfile,
    }),
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
