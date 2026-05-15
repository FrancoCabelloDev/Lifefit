'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { api, ApiError } from '@/lib/api'
import { setTokens, setStoredUser, dispatchAuthEvent } from '@/lib/auth'
import type { LoginResponse } from '@/lib/types'

export default function SaaSAdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const data = await api.post<LoginResponse>("/api/auth/login/", { email, password })

      if (data.user?.role !== 'super_admin') {
        setError('Acceso denegado: Se requieren privilegios de Super Administrador.')
        setIsLoading(false)
        return
      }

      setTokens(data.access, data.refresh)
      setStoredUser(data.user)
      dispatchAuthEvent()

      router.push('/panel-saas')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión con el servidor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans text-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            LifeFit Control
          </h1>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-center text-white">
              Acceso Restringido
            </CardTitle>
            <CardDescription className="text-center text-zinc-400">
              Panel de administración global de LifeFit SaaS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Correo Corporativo</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@lifefit.io" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Autenticando...' : 'Acceder al Sistema'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            Este acceso es estrictamente para personal de LifeFit. <br/>
            Toda actividad es monitoreada y auditada.
          </p>
        </div>
      </div>
    </div>
  )
}
