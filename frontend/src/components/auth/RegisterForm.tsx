'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { GymMembershipPlan } from '@/lib/types'
import { toast } from 'sonner'

interface RegisterFormProps {
  gymId: string
}

export default function RegisterForm({ gymId }: RegisterFormProps) {
  const router = useRouter()
  
  // Pasos: 1 = Seleccionar Plan, 2 = Datos Personales
  const [step, setStep] = useState<1 | 2>(1)
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  
  const [plans, setPlans] = useState<GymMembershipPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const formattedGymName = gymId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoadingPlans(true)
        const res = await api.get(`/api/gyms/membership-plans/?gym_slug=${gymId}`)
        setPlans((res as any).results || res)
        if ((res as any).results?.length === 0 && (res as any).length === 0) {
          // Si no hay planes, saltar directo al paso 2
          setStep(2)
        }
      } catch (error) {
        console.error("Error al cargar los planes:", error)
        // Fallback al paso 2
        setStep(2)
      } finally {
        setIsLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [gymId])

  const handleNextStep = () => {
    if (!selectedPlanId && plans.length > 0) {
      toast.error('Por favor, selecciona un plan para continuar.')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const payload = {
        email,
        password,
        first_name: name.split(' ')[0] || '',
        last_name: name.split(' ').slice(1).join(' ') || '',
        gym_slug: gymId,
        membership_plan_id: selectedPlanId
      }
      
      // Llamada real al backend para registrar al usuario
      await api.post('/api/auth/register/', payload)
      toast.success('Cuenta creada exitosamente')
      router.push(`/${gymId}/ingresar`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al crear la cuenta. Intenta de nuevo.')
      setIsLoading(false)
    }
  }

  if (isLoadingPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans py-12">
      <div className={`w-full ${step === 1 ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-emerald-800 tracking-tight">
            LifeFit SaaS
          </Link>
        </div>

        {step === 1 && plans.length > 0 ? (
          // PASO 1: SELECCIONAR PLAN
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Elige tu Plan en {formattedGymName}</h2>
              <p className="text-slate-500 mt-2">Selecciona la membresía que mejor se adapte a tus objetivos.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all duration-200 border-2 ${
                    selectedPlanId === plan.id 
                      ? 'border-emerald-500 shadow-emerald-100 bg-emerald-50/30 shadow-lg scale-105' 
                      : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-slate-900">S/ {plan.price}</span>
                      <span className="text-slate-500 font-medium"> / {plan.duration_days} días</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features?.map((f, i) => (
                        <li key={i} className="flex items-start text-sm text-slate-700">
                          <Check className="h-5 w-5 text-emerald-500 mr-2 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center mt-8">
              <Button 
                onClick={handleNextStep} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-sm"
                size="lg"
                disabled={!selectedPlanId}
              >
                Continuar con el registro
              </Button>
            </div>
          </div>
        ) : (
          // PASO 2: DATOS PERSONALES
          <Card className="shadow-lg border-slate-200/60 bg-white/80 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight text-center">
                Únete a {formattedGymName}
              </CardTitle>
              <CardDescription className="text-slate-500 text-center">
                {selectedPlanId && plans.length > 0 
                  ? `Estás por registrarte con el plan: ${plans.find(p => p.id === selectedPlanId)?.name}` 
                  : 'Crea tu cuenta de atleta para comenzar a entrenar.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">Nombre Completo</Label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Ej: Ana García" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                
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
                  <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  {plans.length > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      disabled={isLoading}
                    >
                      Atrás
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <div className="text-sm text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <Link href={`/${gymId}/ingresar`} className="font-semibold text-emerald-600 hover:underline">
                  Inicia sesión
                </Link>
              </div>
            </CardFooter>
          </Card>
        )}
        
        <div className="mt-8 text-center">
          <Link href="/unirse" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            ← Volver a buscar gimnasios
          </Link>
        </div>
      </div>
    </div>
  )
}
