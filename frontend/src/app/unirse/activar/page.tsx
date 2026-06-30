'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

function ActivarForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const uid      = searchParams.get('uid')
  const token    = searchParams.get('token')
  const gymSlug  = searchParams.get('gymSlug')
  const gymName  = searchParams.get('gymName')

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!uid || !token) setError('El enlace es inválido o ha expirado.')
  }, [uid, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/set-password/', { uid, token, password }, { authenticated: false })
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'El enlace ha expirado o es inválido.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">¡Contraseña creada!</h1>
        <p className="text-sm text-slate-500">Ya puedes iniciar sesión en {gymName ?? 'tu gimnasio'}.</p>
        <Button
          onClick={() => router.push(gymSlug ? `/${gymSlug}/ingresar` : '/unirse')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11"
        >
          Iniciar sesión
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="text-2xl font-black text-slate-900">🏋️ Lifefit</div>
          <h1 className="text-lg font-bold text-slate-900 mt-2">Crea tu contraseña</h1>
          {gymName && (
            <p className="text-sm text-slate-500">Bienvenido a <span className="font-semibold text-slate-700">{gymName}</span></p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Contraseña</Label>
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="rounded-xl h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Confirmar contraseña</Label>
            <Input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              required
              className="rounded-xl h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Activar cuenta
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ActivarPage() {
  return (
    <Suspense>
      <ActivarForm />
    </Suspense>
  )
}
