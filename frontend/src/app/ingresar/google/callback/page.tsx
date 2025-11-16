'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const hasProcessed = useRef(false)
  const [statusMessage, setStatusMessage] = useState('Validando tu cuenta de Google...')

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const accessToken = searchParams.get('access')
    const refreshToken = searchParams.get('refresh')
    const nextPath = searchParams.get('next') ?? '/resumen'

    if (!accessToken || !refreshToken) {
      setStatusMessage('No recibimos los tokens necesarios. Intenta iniciar sesión de nuevo.')
      return
    }

    const persistTokens = () => {
      localStorage.setItem('lifefit_access_token', accessToken)
      localStorage.setItem('lifefit_refresh_token', refreshToken)
    }

    const fetchProfile = async () => {
      try {
        setStatusMessage('Guardando tus credenciales y cargando tu cuenta...')
        persistTokens()
        const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('No pudimos obtener tu perfil.')
        }
        const user = await response.json()
        localStorage.setItem('lifefit_user', JSON.stringify(user))
        const safeNext = nextPath.startsWith('/') ? nextPath : '/resumen'
        router.replace(safeNext)
      } catch (error) {
        console.error(error)
        setStatusMessage('Ocurrió un error cargando tu cuenta. Intenta de nuevo desde /ingresar.')
      }
    }

    fetchProfile()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          Lf
        </div>
        <p className="text-lg font-semibold text-slate-900">Estamos preparando tu panel</p>
        <p className="mt-2 text-sm text-slate-500">{statusMessage}</p>
      </div>
    </div>
  )
}
