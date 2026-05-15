'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')
  const gymName = searchParams.get('gymName')
  const gymSlug = searchParams.get('gymSlug')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!uid || !token) {
    return (
      <div className="text-center text-rose-600 p-4">
        Enlace de invitación inválido. Faltan parámetros en la URL.
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const data = await api.post<{ detail: string; gym_slug?: string }>(
        "/api/accounts/set-password/",
        { uid, token, password },
        { authenticated: false }
      )

      alert('Contraseña configurada con éxito. Ya puedes iniciar sesión.')
      if (data.gym_slug) {
        router.push(`/${data.gym_slug}/ingresar`)
      } else {
        router.push('/ingresar')
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const data = await api.get<{ authorization_url: string }>("/api/accounts/google/login/", { authenticated: false })
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch {
      console.error('Error fetching Google auth URL:')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="password">Nueva Contraseña</Label>
        <Input 
          id="password" 
          type="password" 
          required 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="••••••••" 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
        <Input 
          id="confirm_password" 
          type="password" 
          required 
          value={confirmPassword} 
          onChange={e => setConfirmPassword(e.target.value)} 
          placeholder="••••••••" 
        />
      </div>

      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
        {isLoading ? 'Guardando...' : 'Configurar mi cuenta'}
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-500">O continúa con</span>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        className="w-full" 
        type="button"
        onClick={handleGoogleLogin}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Google
      </Button>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Cargando...</div>}>
      <SetPasswordPageContent />
    </Suspense>
  )
}

function SetPasswordPageContent() {
  const searchParams = useSearchParams()
  const gymName = searchParams.get('gymName') || 'LifeFit'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-100">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold text-slate-900">Bienvenido a {gymName}</CardTitle>
          <CardDescription>
            Crea una contraseña segura para acceder a tu panel de administración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
