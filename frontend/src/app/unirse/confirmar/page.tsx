'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent } from '@/lib/auth'
import type { User } from '@/lib/types'
import { Check, Dumbbell, Shield, ArrowLeft, User as UserIcon } from 'lucide-react'

type PendingData = {
  email: string
  first_name: string
  last_name: string
  picture: string
  google_id: string
  gym_slug: string
  plan_id: string
}

function ConfirmarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [data, setData] = useState<PendingData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Token inválido. Vuelve a intentarlo.')
      return
    }
    try {
      // El token es base64 del payload JSON — decodificarlo en el cliente
      const padding = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4))
      const decoded = JSON.parse(atob((token + padding).replace(/-/g, '+').replace(/_/g, '/')))
      setData(decoded)
    } catch {
      setError('No se pudo leer la información de tu cuenta. Vuelve a intentarlo.')
    }
  }, [token])

  const handleConfirmAndPay = async () => {
    if (!token || !data) return
    setLoading(true)
    try {
      // Por ahora: completar registro directo (después aquí irá IziPay antes de este paso)
      const res = await api.post<{
        access: string
        refresh: string
        gym_slug: string
        user: { email: string; first_name: string; last_name: string }
      }>(
        '/api/accounts/google/complete-registration/',
        { token },
        { authenticated: false }
      )

      // Guardar tokens y redirigir al panel
      setTokens(res.access, res.refresh)
      const me = await api.get<User>('/api/accounts/me/')
      setStoredUser(me)
      dispatchAuthEvent()
      sessionStorage.removeItem('lifefit_unirse')
      router.push(`/${res.gym_slug}/panel`)
    } catch (err: any) {
      setError(err?.message || 'Error al completar el registro. Intenta de nuevo.')
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-rose-600 font-medium mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.push('/unirse')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a /unirse
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-emerald-600" />
          <span className="font-bold text-slate-900 text-lg">Lifefit</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <div>
          <button
            onClick={() => router.push('/unirse')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a elegir plan
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900">Confirma tus datos</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Estos son los datos de tu cuenta Google. Revísalos antes de proceder al pago.
          </p>
        </div>

        {/* Datos del usuario */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          {data.picture ? (
            <img
              src={data.picture}
              alt={data.first_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-emerald-600" />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900 text-lg">
              {data.first_name} {data.last_name}
            </p>
            <p className="text-sm text-slate-500">{data.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Verificado con Google
            </span>
          </div>
        </div>

        {/* Resumen del plan */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Tu plan elegido</p>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Gimnasio: <span className="font-normal">{data.gym_slug}</span></p>
            <p className="font-semibold text-slate-900 mt-1">Plan ID: <span className="font-normal">#{data.plan_id}</span></p>
          </div>
        </div>

        {/* Botón pagar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900">Proceder al pago</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tu cuenta se creará únicamente al confirmar el pago con IziPay.
            </p>
          </div>

          <Button
            onClick={handleConfirmAndPay}
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? 'Procesando...' : 'Confirmar y pagar con IziPay'}
          </Button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            Pago 100% seguro. Tu cuenta se activa al instante tras el pago.
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ConfirmarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmarContent />
    </Suspense>
  )
}
