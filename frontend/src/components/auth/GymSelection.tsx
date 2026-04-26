'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

type GymSelectionProps = {
  mode: 'login' | 'register'
}

type Gym = {
  id: string
  name: string
  slug: string
  location: string
  logo: string | null
  brand_color: string
}

export default function GymSelection({ mode }: GymSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gyms, setGyms] = useState<Gym[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const copy = {
    login: {
      title: '¿A qué gimnasio perteneces?',
      subtitle: 'Encuentra tu centro y conéctalo con tu cuenta para empezar tu aventura.',
    },
    register: {
      title: 'Encuentra tu gimnasio para registrarte',
      subtitle: 'Selecciona el centro al que deseas unirte para comenzar tu aventura.',
    },
  }

  useEffect(() => {
    const fetchGyms = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/gyms/public/')
        if (res.ok) {
          const data = await res.json()
          setGyms(data.results || data)
        }
      } catch (error) {
        console.error('Error fetching gyms:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchGyms()
  }, [])

  const handleGymClick = (gymSlug: string) => {
    // Redirige al formulario de login o registro específico del gimnasio
    router.push(`/${gymSlug}/${mode === 'login' ? 'ingresar' : 'registrarse'}`)
  }

  const filteredGyms = gyms.filter((gym) =>
    gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (gym.location && gym.location.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="py-8 flex justify-center">
        <Link href="/" className="text-2xl font-bold text-emerald-800 tracking-tight">
          LifeFit SaaS
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12 w-full max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mb-8 space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            {copy[mode].title}
          </h1>
          <p className="text-slate-600 text-sm md:text-base">
            {copy[mode].subtitle}
          </p>
        </div>

        <div className="w-full max-w-2xl relative mb-12 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 transition-colors group-focus-within:text-emerald-500" />
          <Input
            type="text"
            placeholder="Busca por nombre de gimnasio o ciudad..."
            className="w-full pl-12 pr-14 h-14 rounded-full border-slate-200 bg-white shadow-sm text-base focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-200/50 hover:bg-emerald-200 transition-colors h-10 w-10 rounded-full flex items-center justify-center text-emerald-700">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {filteredGyms.map((gym) => {
                return (
                  <button
                    key={gym.id}
                    onClick={() => handleGymClick(gym.slug)}
                    className="group relative overflow-hidden rounded-2xl aspect-[4/5] sm:aspect-auto sm:h-80 w-full shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left flex flex-col justify-end"
                    style={{ backgroundColor: gym.brand_color || '#1e293b' }}
                  >
                    {/* Logo Background Effect */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-110">
                      {gym.logo ? (
                        <img 
                          src={gym.logo} 
                          alt={gym.name} 
                          className="w-40 h-40 object-contain drop-shadow-2xl filter"
                        />
                      ) : (
                        <span className="text-8xl font-black text-white/50">{gym.name.substring(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    
                    {/* Text Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 p-6 w-full">
                      <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
                        {gym.name}
                      </h3>
                      <div className="flex items-center text-slate-300 text-sm font-medium">
                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                        {gym.location || 'Ubicación no especificada'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {filteredGyms.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                No encontramos ningún gimnasio con ese nombre.
              </div>
            )}
          </>
        )}

        <div className="mt-16 text-center">
          <Link href="/contacto" className="text-emerald-700 hover:text-emerald-800 text-sm font-medium hover:underline underline-offset-4">
            ¿No encuentras tu gimnasio? Contáctanos
          </Link>
        </div>
      </main>
    </div>
  )
}
