'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

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

export function useDashboardAuth() {
  const router = useRouter()
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('lifefit_access_token')
    if (!storedToken) {
      router.replace('/ingresar')
      return
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const profile = await response.json()
        setUser(profile)
        setToken(storedToken)
        localStorage.setItem('lifefit_user', JSON.stringify(profile))
      } catch (error) {
        console.error(error)
        localStorage.removeItem('lifefit_access_token')
        localStorage.removeItem('lifefit_refresh_token')
        localStorage.removeItem('lifefit_user')
        router.replace('/ingresar')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  return { user, token, loading, setUser }
}
