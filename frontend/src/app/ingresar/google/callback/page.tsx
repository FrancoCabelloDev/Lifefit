'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')

    if (access && refresh) {
      // Guardar tokens inmediatamente
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)

      // Obtener datos del usuario con el nuevo token
      fetch('http://localhost:8000/api/accounts/me/', {
        headers: {
          'Authorization': `Bearer ${access}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch user')
        return res.json()
      })
      .then(user => {
        // Guardar usuario
        localStorage.setItem('user', JSON.stringify(user))
        
        // Redirigir dinámicamente según el rol y el slug del gimnasio
        const gymSlug = user.gym_slug || user.gym
        
        if (user.role === 'gym_admin') {
          router.push(`/${gymSlug}/panel`)
        } else if (user.role === 'athlete' || user.role === 'coach') {
          router.push(`/${gymSlug}/panel-atleta`)
        } else {
          router.push('/panel-saas')
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
