'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

import { api } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent } from '@/lib/auth'
import type { LoginResponse } from '@/lib/types'

interface LoginFormProps {
  gymId: string
}

export default function LoginForm({ gymId }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const formattedGymName = gymId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const data = await api.post<LoginResponse>("/api/auth/login/", { email, password })

      setTokens(data.access, data.refresh)
      setStoredUser(data.user)
      dispatchAuthEvent()

      if (data.user.role === 'gym_admin') {
        router.push(`/${gymId}/panel`)
      } else if (data.user.role === 'athlete' || data.user.role === 'coach') {
        router.push(`/${gymId}/panel-atleta`)
      } else {
        router.push('/panel-saas')
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
      setError('Error al conectar con Google')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-emerald-800 tracking-tight">
            LifeFit SaaS
          </Link>
        </div>

        <Card className="shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight text-center">
              Ingresa a {formattedGymName}
            </CardTitle>
            <CardDescription className="text-slate-500 text-center">
              Ingresa tu correo y contraseña para acceder a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
                  <Link href="#" className="text-sm font-medium text-emerald-600 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">O continúa con</span>
              </div>
            </div>
            
            <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-sm text-slate-500">
              ¿No tienes una cuenta?{' '}
              <Link href={`/${gymId}/registrarse`} className="font-semibold text-emerald-600 hover:underline">
                Regístrate aquí
              </Link>
            </div>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center">
          <Link href="/tugimnasio" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            ← Volver a la selección de gimnasio
          </Link>
        </div>
      </div>
    </div>
  )
}
