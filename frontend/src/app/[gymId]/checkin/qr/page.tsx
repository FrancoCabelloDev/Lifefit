'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getStoredUser } from '@/lib/auth'
import { api } from '@/lib/api'
import type { User, CheckIn } from '@/lib/types'
import { CheckCircle2, XCircle, Loader2, Smartphone, LogIn } from 'lucide-react'

const states = {
  LOADING: 'loading',
  NO_TOKEN: 'no_token',
  CHECKING_IN: 'checking_in',
  DONE: 'done',
  ERROR: 'error',
} as const

type State = typeof states[keyof typeof states]

export default function QRCheckinPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()
  const [state, setState] = useState<State>(states.LOADING)
  const [user, setUser] = useState<User | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = getToken()
    const storedUser = getStoredUser<User>()

    if (!token || !storedUser) {
      setState(states.NO_TOKEN)
      return
    }

    setUser(storedUser)
    setState(states.CHECKING_IN)
  }, [])

  useEffect(() => {
    if (state !== states.CHECKING_IN) return
    if (!user) return

    const doCheckin = async () => {
      try {
        const result = await api.post<CheckIn>('/api/gyms/checkins/self_checkin/')
        setState(states.DONE)
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || 'Error al registrar ingreso'
        setErrorMsg(detail)
        setState(states.ERROR)
      }
    }

    doCheckin()
  }, [state, user])

  if (state === states.NO_TOKEN) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center">
            <LogIn className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Inicia sesión</h1>
          <p className="text-slate-500">Debes iniciar sesión para registrar tu ingreso al gimnasio.</p>
          <button
            onClick={() => router.push(`/ingresar?next=/${gymId}/checkin/qr`)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold text-lg transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  if (state === states.LOADING || state === states.CHECKING_IN) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center animate-pulse">
            <Smartphone className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Registrando ingreso...</h1>
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
          <p className="text-slate-500">Espera un momento mientras registramos tu check-in.</p>
        </div>
      </div>
    )
  }

  if (state === states.DONE) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">¡Ingreso registrado!</h1>
          <p className="text-slate-500">
            Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}. Tu check-in se ha registrado correctamente.
          </p>
          <p className="text-xs text-slate-400">Cierra esta ventana o escanea de nuevo mañana.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center">
          <XCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Error</h1>
        <p className="text-slate-500">{errorMsg}</p>
        <button
          onClick={() => {
            setState(states.CHECKING_IN)
            setErrorMsg('')
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-bold text-lg transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
