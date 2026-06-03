'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { GymMembershipPlan } from '@/lib/types'
import {
  MapPin, Search, Users, ChevronRight, Dumbbell,
  Star, ArrowLeft, Check, X, Shield,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type PublicPlan = Pick<GymMembershipPlan, 'id' | 'name' | 'description' | 'price' | 'duration_days' | 'features' | 'tier'>

type PublicGym = {
  id: string
  name: string
  slug: string
  description: string
  location: string
  logo: string | null
  brand_color: string
  website: string
  contact_email: string
  active_members_count: number
  min_price: number | null
  plans: PublicPlan[]
}

type Step = 'gyms' | 'plans' | 'checkout'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GymAvatar({ gym, size = 'md' }: { gym: PublicGym; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-10 h-10 text-base' : size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-xl'
  return (
    <div
      className={`${sz} rounded-xl flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0 overflow-hidden`}
      style={{ backgroundColor: gym.brand_color || '#10b981' }}
    >
      {gym.logo
        ? <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover" />
        : gym.name.charAt(0).toUpperCase()
      }
    </div>
  )
}

// ─── PASO 1: Lista de Gyms ───────────────────────────────────────────────────

function GymList({ gyms, loading, onSelect }: {
  gyms: PublicGym[]
  loading: boolean
  onSelect: (g: PublicGym) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return gyms
    const q = search.toLowerCase()
    return gyms.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.location?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
    )
  }, [gyms, search])

  return (
    <>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">Encuentra tu gimnasio</h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">
          Explora los gimnasios disponibles, elige tu plan y empieza hoy.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative max-w-lg mx-auto mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o ciudad..."
          className="pl-10 h-12 rounded-xl border-slate-200 shadow-sm text-base"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No se encontraron gimnasios</p>
          {search && <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">
            {filtered.length} {filtered.length === 1 ? 'gimnasio encontrado' : 'gimnasios encontrados'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(gym => {
              const color = gym.brand_color || '#10b981'
              return (
                <button
                  key={gym.id}
                  onClick={() => onSelect(gym)}
                  className="group w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: color }} />
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <GymAvatar gym={gym} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-lg leading-tight truncate group-hover:text-emerald-600 transition-colors">
                            {gym.name}
                          </h3>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        {gym.location && (
                          <p className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />{gym.location}
                          </p>
                        )}
                      </div>
                    </div>
                    {gym.description && (
                      <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">{gym.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users className="w-3.5 h-3.5" />{gym.active_members_count} miembros
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Dumbbell className="w-3.5 h-3.5" />{gym.plans.length} {gym.plans.length === 1 ? 'plan' : 'planes'}
                        </span>
                      </div>
                      {gym.min_price !== null && (
                        <span className="text-sm font-semibold text-emerald-600">
                          Desde S/ {Number(gym.min_price).toFixed(0)}/mes
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

// ─── PASO 2: Planes del Gym ──────────────────────────────────────────────────

function GymPlans({ gym, onBack, onSelectPlan }: {
  gym: PublicGym
  onBack: () => void
  onSelectPlan: (plan: PublicPlan) => void
}) {
  const color = gym.brand_color || '#10b981'

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a gimnasios
      </button>

      {/* Info del gym */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="h-3 w-full" style={{ backgroundColor: color }} />
        <div className="p-6 flex items-center gap-5">
          <GymAvatar gym={gym} size="lg" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{gym.name}</h2>
            {gym.location && (
              <p className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />{gym.location}
              </p>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400 mt-2">
              <Users className="w-3.5 h-3.5" />{gym.active_members_count} miembros activos
            </span>
          </div>
        </div>
        {gym.description && (
          <p className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
            {gym.description}
          </p>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-4">Elige tu plan</h3>

      {gym.plans.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-10 text-center text-slate-400">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Este gimnasio aún no tiene planes publicados.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {gym.plans.map(plan => {
            const isPremium = plan.tier === 'premium'
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 bg-white overflow-hidden ${isPremium ? 'border-amber-400 shadow-md' : 'border-slate-200'}`}
              >
                {isPremium && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" /> Premium
                    </span>
                  </div>
                )}
                <div className="h-1.5 w-full" style={{ backgroundColor: isPremium ? '#f59e0b' : color }} />
                <div className="p-5">
                  <h4 className="font-bold text-slate-900 text-lg">{plan.name}</h4>
                  {plan.description && <p className="text-sm text-slate-500 mt-1">{plan.description}</p>}
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">S/ {Number(plan.price).toFixed(2)}</span>
                    <span className="text-slate-400 text-sm ml-1">/ {plan.duration_days} días</span>
                  </div>
                  {plan.features?.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{feat}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    onClick={() => onSelectPlan(plan)}
                    className="w-full mt-5 font-semibold text-white"
                    style={{ backgroundColor: isPremium ? '#f59e0b' : color }}
                  >
                    Elegir este plan
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── PASO 3: Checkout (datos + pago) ─────────────────────────────────────────

function Checkout({ gym, plan, onBack }: {
  gym: PublicGym
  plan: PublicPlan
  onBack: () => void
}) {
  const color = gym.brand_color || '#10b981'
  const isPremium = plan.tier === 'premium'

  const handleGoogle = async () => {
    try {
      const data = await api.get<{ authorization_url: string }>(
        `/api/accounts/google/login/?next=/unirse&gym_slug=${gym.slug}&plan_id=${plan.id}`,
        { authenticated: false }
      )
      if (data.authorization_url) window.location.href = data.authorization_url
    } catch (e) {
      console.error('Error al iniciar sesión con Google', e)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Cambiar plan
      </button>

      {/* Resumen del pedido */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="h-2 w-full" style={{ backgroundColor: isPremium ? '#f59e0b' : color }} />
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Resumen</p>
          <div className="flex items-center gap-3 mb-4">
            <GymAvatar gym={gym} size="sm" />
            <div>
              <p className="font-semibold text-slate-900">{gym.name}</p>
              <p className="text-sm text-slate-500">{gym.location}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{plan.name}</p>
              <p className="text-xs text-slate-500">{plan.duration_days} días de membresía</p>
            </div>
            <p className="text-xl font-extrabold text-slate-900">S/ {Number(plan.price).toFixed(2)}</p>
          </div>
          {plan.features?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Registro + Pago */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Crear tu cuenta y pagar</h3>
          <p className="text-sm text-slate-500 mt-1">
            Regístrate con Google para autocompletar tus datos y proceder al pago.
          </p>
        </div>

        <Button
          onClick={handleGoogle}
          variant="outline"
          className="w-full h-12 text-base font-medium border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        >
          <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar con Google
        </Button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          Tu cuenta se creará solo después de confirmar el pago. Pago procesado por IziPay.
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UnirsePage() {
  const [gyms, setGyms] = useState<PublicGym[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('gyms')
  const [selectedGym, setSelectedGym] = useState<PublicGym | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null)

  // Restaurar estado desde sessionStorage al montar (sobrevive redirects de Next.js)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('lifefit_unirse')
      if (saved) {
        const { gym, plan, step: savedStep } = JSON.parse(saved)
        if (gym) setSelectedGym(gym)
        if (plan) setSelectedPlan(plan)
        if (savedStep) setStep(savedStep)
      }
    } catch {}
  }, [])

  useEffect(() => {
    api
      .get<PublicGym[] | { results: PublicGym[] }>('/api/gyms/public/', { authenticated: false })
      .then(data => {
        if (Array.isArray(data)) setGyms(data)
        else if (data && Array.isArray((data as any).results)) setGyms((data as any).results)
        else setGyms([])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSelectGym = (gym: PublicGym) => {
    setSelectedGym(gym)
    setSelectedPlan(null)
    setStep('plans')
    sessionStorage.setItem('lifefit_unirse', JSON.stringify({ gym, plan: null, step: 'plans' }))
  }

  const handleSelectPlan = (plan: PublicPlan) => {
    setSelectedPlan(plan)
    setStep('checkout')
    sessionStorage.setItem('lifefit_unirse', JSON.stringify({ gym: selectedGym, plan, step: 'checkout' }))
  }

  const handleBackToGyms = () => {
    setStep('gyms')
    setSelectedGym(null)
    setSelectedPlan(null)
    sessionStorage.removeItem('lifefit_unirse')
  }

  const handleBackToPlans = () => {
    setStep('plans')
    setSelectedPlan(null)
    sessionStorage.setItem('lifefit_unirse', JSON.stringify({ gym: selectedGym, plan: null, step: 'plans' }))
  }

  const stepLabel = step === 'gyms' ? null : step === 'plans' ? 'Elige tu plan' : 'Confirmar y pagar'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-slate-900 text-lg">Lifefit</span>
          </div>
          {stepLabel && (
            <span className="text-sm font-medium text-slate-500">{stepLabel}</span>
          )}
          <a href="/ingresar" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Ya tengo cuenta →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {step === 'gyms' && (
          <GymList gyms={gyms} loading={loading} onSelect={handleSelectGym} />
        )}
        {step === 'plans' && selectedGym && (
          <GymPlans
            gym={selectedGym}
            onBack={handleBackToGyms}
            onSelectPlan={handleSelectPlan}
          />
        )}
        {step === 'checkout' && selectedGym && selectedPlan && (
          <Checkout
            gym={selectedGym}
            plan={selectedPlan}
            onBack={handleBackToPlans}
          />
        )}
      </main>
    </div>
  )
}
