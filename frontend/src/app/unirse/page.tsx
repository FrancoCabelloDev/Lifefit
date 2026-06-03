'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { GymMembershipPlan } from '@/lib/types'
import {
  MapPin,
  Search,
  Users,
  ChevronRight,
  Dumbbell,
  Star,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react'

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

// ─── Gym Card ────────────────────────────────────────────────────────────────

function GymCard({ gym, onClick }: { gym: PublicGym; onClick: () => void }) {
  const color = gym.brand_color || '#10b981'

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* Banner de color de marca */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: color }}
      />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Logo / inicial */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-sm"
            style={{ backgroundColor: color }}
          >
            {gym.logo ? (
              <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              gym.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-lg leading-tight truncate group-hover:text-emerald-600 transition-colors">
                {gym.name}
              </h3>
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-emerald-500 transition-colors" />
            </div>

            {gym.location && (
              <p className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {gym.location}
              </p>
            )}
          </div>
        </div>

        {gym.description && (
          <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
            {gym.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              {gym.active_members_count} miembros
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Dumbbell className="w-3.5 h-3.5" />
              {gym.plans.length} {gym.plans.length === 1 ? 'plan' : 'planes'}
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
}

// ─── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  brandColor,
  onSelect,
}: {
  plan: PublicPlan
  brandColor: string
  onSelect: () => void
}) {
  const isPremium = plan.tier === 'premium'
  const color = brandColor || '#10b981'

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all ${
        isPremium ? 'border-amber-400 shadow-md' : 'border-slate-200'
      } bg-white overflow-hidden`}
    >
      {isPremium && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3" /> Premium
          </span>
        </div>
      )}

      {/* Barra de color superior */}
      <div className="h-1.5 w-full" style={{ backgroundColor: isPremium ? '#f59e0b' : color }} />

      <div className="p-5">
        <h4 className="font-bold text-slate-900 text-lg">{plan.name}</h4>
        {plan.description && (
          <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
        )}

        <div className="mt-4">
          <span className="text-3xl font-extrabold text-slate-900">
            S/ {Number(plan.price).toFixed(2)}
          </span>
          <span className="text-slate-400 text-sm ml-1">
            / {plan.duration_days} días
          </span>
        </div>

        {plan.features && plan.features.length > 0 && (
          <ul className="mt-4 space-y-2">
            {plan.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {feat}
              </li>
            ))}
          </ul>
        )}

        <Button
          onClick={onSelect}
          className="w-full mt-5 font-semibold"
          style={{ backgroundColor: isPremium ? '#f59e0b' : color }}
        >
          Elegir este plan
        </Button>
      </div>
    </div>
  )
}

// ─── Gym Detail View ─────────────────────────────────────────────────────────

function GymDetail({ gym, onBack }: { gym: PublicGym; onBack: () => void }) {
  const router = useRouter()
  const color = gym.brand_color || '#10b981'

  const handleSelectPlan = (plan: PublicPlan) => {
    // Por ahora redirige a registro con el plan seleccionado
    router.push(`/${gym.slug}/registrarse?plan=${plan.id}&planName=${encodeURIComponent(plan.name)}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a gimnasios
      </button>

      {/* Gym info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <div className="h-3 w-full" style={{ backgroundColor: color }} />
        <div className="p-6 flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {gym.logo ? (
              <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              gym.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{gym.name}</h2>
            {gym.location && (
              <p className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {gym.location}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="w-3.5 h-3.5" />
                {gym.active_members_count} miembros activos
              </span>
            </div>
          </div>
        </div>
        {gym.description && (
          <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
            {gym.description}
          </div>
        )}
      </div>

      {/* Planes */}
      <h3 className="text-lg font-bold text-slate-900 mb-4">Elige tu plan</h3>

      {gym.plans.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-10 text-center text-slate-400">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Este gimnasio aún no tiene planes publicados.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {gym.plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              brandColor={color}
              onSelect={() => handleSelectPlan(plan)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnirsePage() {
  const [gyms, setGyms] = useState<PublicGym[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGym, setSelectedGym] = useState<PublicGym | null>(null)

  useEffect(() => {
    api
      .get<PublicGym[]>('/api/gyms/public/', { authenticated: false })
      .then(setGyms)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return gyms
    const q = search.toLowerCase()
    return gyms.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.location?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
    )
  }, [gyms, search])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-slate-900 text-lg">Lifefit</span>
          </div>
          <a href="/ingresar" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Ya tengo cuenta →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {selectedGym ? (
          <GymDetail gym={selectedGym} onBack={() => setSelectedGym(null)} />
        ) : (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-3">
                Encuentra tu gimnasio
              </h1>
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
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Resultados */}
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
                {search && (
                  <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  {filtered.length} {filtered.length === 1 ? 'gimnasio encontrado' : 'gimnasios encontrados'}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map(gym => (
                    <GymCard
                      key={gym.id}
                      gym={gym}
                      onClick={() => setSelectedGym(gym)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
