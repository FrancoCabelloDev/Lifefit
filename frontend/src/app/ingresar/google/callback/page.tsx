'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { api } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent } from '@/lib/auth'
import type { User } from '@/lib/types'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')
    const next = searchParams.get('next')

    if (access && refresh) {
      setTokens(access, refresh)
      dispatchAuthEvent()

      api.get<User>("/api/accounts/me/")
        .then(user => {
          setStoredUser(user)
          // Limpiar sessionStorage del flujo /unirse si venía de ahí
          sessionStorage.removeItem('lifefit_unirse')

          // Si el backend ya calculó un next específico, usarlo
          if (next && next !== '/resumen' && next !== '/unirse') {
            router.push(next)
            return
          }

          // Fallback por rol
          const gymSlug = (user as any).gym_slug || user.gym
          if (user.role === 'super_admin') {
            router.push('/panel-saas')
          } else if (gymSlug) {
            router.push(`/${gymSlug}/panel`)
          } else {
            router.push('/unirse')
          }
        })
        .catch(err => {
          console.error('Error fetching user data after Google login:', err)
          router.push('/')
        })
    } else {
      console.warn('No tokens found in URL, redirecting to home')
      router.push('/')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Autenticando con Google...</h2>
        <p className="text-slate-500 mt-2 text-sm">Preparando tu panel de LifeFit, un momento por favor.</p>
      </div>
    </div>
  )
}
