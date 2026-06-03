'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent } from '@/lib/auth'
import type { User } from '@/lib/types'
import { Check, Dumbbell, Shield, ArrowLeft, User as UserIcon, CreditCard, Lock } from 'lucide-react'

type PendingData = {
  email: string
  first_name: string
  last_name: string
  picture: string
  gym_slug: string
  plan_id: string
}

type IziPayOrder = {
  form_token: string
  public_key: string
  amount: number
  plan_name: string
  gym_name: string
}

declare global {
  interface Window {
    KR: any
  }
}

// ─── Carga el SDK de IziPay dinámicamente ─────────────────────────────────────

function loadIziPaySDK(publicKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('izipay-sdk')) {
      resolve()
      return
    }
    // Stylesheet IziPay
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.id = 'izipay-sdk'
    script.src = `https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js`
    script.setAttribute('kr-public-key', publicKey)
    script.setAttribute('kr-language', 'es-PE')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de IziPay'))
    document.body.appendChild(script)
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

function ConfirmarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const formContainerRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<PendingData | null>(null)
  const [order, setOrder] = useState<IziPayOrder | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'loading' | 'confirm' | 'paying' | 'processing'>('loading')

  // 1. Decodificar token
  useEffect(() => {
    if (!token) { setError('Token inválido. Vuelve a intentarlo.'); return }
    try {
      const padding = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4))
      const decoded: PendingData = JSON.parse(atob((token + padding).replace(/-/g, '+').replace(/_/g, '/')))
      setData(decoded)
      setStep('confirm')
    } catch {
      setError('No se pudo leer la información. Vuelve a intentarlo.')
    }
  }, [token])

  // 2. Cuando el usuario quiere pagar: crear orden en IziPay
  const handleStartPayment = async () => {
    if (!token) return
    setStep('paying')
    try {
      const res = await api.post<IziPayOrder>(
        '/api/accounts/izipay/create-order/',
        { token },
        { authenticated: false }
      )
      setOrder(res)
      // Cargar SDK y montar el formulario
      await loadIziPaySDK(res.public_key)
      mountIziPayForm(res.form_token)
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar el pago. Intenta de nuevo.')
      setStep('confirm')
    }
  }

  // 3. Montar el formulario de IziPay en el contenedor
  const mountIziPayForm = (formToken: string) => {
    if (!window.KR) { setError('SDK de pago no disponible.'); setStep('confirm'); return }

    window.KR.setFormConfig({ formToken })

    // Listener de pago exitoso
    window.KR.onSubmit(async (paymentData: any) => {
      setStep('processing')
      try {
        // El webhook de IziPay completará el registro en producción.
        // En desarrollo llamamos directamente al endpoint de completar registro.
        const res = await api.post<{
          access: string; refresh: string; gym_slug: string
        }>('/api/accounts/google/complete-registration/', { token }, { authenticated: false })

        setTokens(res.access, res.refresh)
        const me = await api.get<User>('/api/accounts/me/')
        setStoredUser(me)
        dispatchAuthEvent()
        sessionStorage.removeItem('lifefit_unirse')
        router.push(`/${res.gym_slug}/panel`)
      } catch (err: any) {
        setError(err?.message || 'Error al activar tu membresía.')
        setStep('paying')
      }
      return false // evitar redirección automática del SDK
    })

    window.KR.addForm('#izipay-form').then(() => {
      window.KR.showForm('#izipay-form')
    })
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <p className="text-rose-600 font-medium">{error}</p>
          <Button variant="outline" onClick={() => router.push('/unirse')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a elegir plan
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'loading' || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-semibold text-slate-700">Activando tu membresía...</p>
        <p className="text-sm text-slate-500">No cierres esta página.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-emerald-600" />
          <span className="font-bold text-slate-900 text-lg">Lifefit</span>
          <span className="ml-auto text-sm text-slate-500 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Pago seguro
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Volver */}
        <button
          onClick={() => router.push('/unirse')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'paying' ? 'Cambiar plan' : 'Volver a elegir plan'}
        </button>

        {/* Datos del usuario */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          {data.picture ? (
            <img src={data.picture} alt={data.first_name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-7 h-7 text-emerald-600" />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900">{data.first_name} {data.last_name}</p>
            <p className="text-sm text-slate-500">{data.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
              <Check className="w-3 h-3" /> Verificado con Google
            </span>
          </div>
        </div>

        {/* PASO: Confirmar antes de pagar */}
        {step === 'confirm' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Completa tu suscripción</h2>
              <p className="text-sm text-slate-500 mt-1">
                Revisa tus datos y continúa al pago seguro con IziPay.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-1">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Gimnasio</p>
              <p className="font-semibold text-slate-800 capitalize">{data.gym_slug.replace(/-/g, ' ')}</p>
            </div>

            <Button
              onClick={handleStartPayment}
              className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Proceder al pago con IziPay
            </Button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              Tu cuenta se crea solo después de confirmar el pago. 100% seguro.
            </div>
          </div>
        )}

        {/* PASO: Formulario de pago IziPay */}
        {step === 'paying' && order && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Resumen del monto */}
            <div className="bg-emerald-600 px-6 py-4 text-white">
              <p className="text-sm opacity-80">{order.gym_name} — {order.plan_name}</p>
              <p className="text-3xl font-extrabold mt-1">S/ {order.amount.toFixed(2)}</p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-slate-900">Datos de tu tarjeta</h3>
              </div>

              {/* IziPay monta el formulario aquí */}
              <div id="izipay-form" ref={formContainerRef} className="min-h-[200px]">
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-50">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                Cifrado SSL 256-bit. IziPay nunca almacena tu tarjeta.
              </div>
            </div>
          </div>
        )}
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
