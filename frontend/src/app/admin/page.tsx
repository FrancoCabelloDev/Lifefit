'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import ChallengeManagement from '@/components/admin/ChallengeManagement'
import BadgeManagement from '@/components/admin/BadgeManagement'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Gym = {
  id: string
  name: string
  slug: string
  location: string
  status: string
  brand_color: string
  website?: string
  contact_email?: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [activeTab, setActiveTab] = useState('retos')
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [gymForm, setGymForm] = useState({
    name: '',
    slug: '',
    description: '',
    location: '',
    brand_color: '#10b981',
    website: '',
    contact_email: '',
  })

  const baseFieldClass =
    'w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

  const authHeaders = useMemo<HeadersInit | undefined>(() => {
    if (!token) return undefined
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [token])

  useEffect(() => {
    if (authLoading) return
    if (!user) return
    if (user.role !== 'super_admin') {
      router.replace('/resumen')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!token || user?.role !== 'super_admin') return
    const fetchData = async () => {
      try {
        setLoading(true)
        const gymsRes = await fetch(`${API_BASE_URL}/api/gyms/gyms/`, { headers: { Authorization: `Bearer ${token}` } })
        if (!gymsRes.ok) {
          throw new Error('Error obteniendo datos iniciales.')
        }
        const gymsJson = await gymsRes.json()
        const normalizedGyms = Array.isArray(gymsJson) ? gymsJson : gymsJson.results ?? []
        setGyms(normalizedGyms)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando dashboard admin.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token, user?.role])

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>, url: string, payload: unknown, reset: () => void) => {
    event.preventDefault()
    try {
      setError('')
      const response = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'No fue posible guardar la información.')
      }
      reset()
      if (url.includes('/api/gyms/gyms/')) {
        setGyms((prev) => [...prev, data])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando datos.')
    }
  }

  if (authLoading || !user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Cargando panel administrativo...</p>
        </div>
      </div>
    )
  }

  if (user.role !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Redirigiendo a tu panel personal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active="/admin" />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-xs uppercase text-emerald-600 tracking-widest">Panel administrativo</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Administración de Lifefit</h1>
            <p className="mt-1 text-sm text-slate-500">Gestiona todos los aspectos de tu gimnasio desde un solo lugar</p>
          </header>

          {/* Tabs Navigation */}
          <div className="rounded-3xl bg-white p-2 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'retos', label: '🎯 Retos', icon: '🎯' },
                { id: 'insignias', label: '🏅 Insignias', icon: '🏅' },
                { id: 'gimnasios', label: '🏢 Gimnasios', icon: '🏢' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label.replace(tab.icon + ' ', '')}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {/* Tab Content */}
          {activeTab === 'retos' && token && (
            <ChallengeManagement token={token} userGymId={user?.gym as string} />
          )}

          {activeTab === 'insignias' && token && (
            <BadgeManagement token={token} userGymId={user?.gym as string} />
          )}

          {activeTab === 'gimnasios' && (
            <>
              {loading && (
                <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow">
                  Cargando datos iniciales...
                </div>
              )}
              
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Gestión de Gimnasios</h2>
                <p className="mt-1 text-sm text-slate-600">Configura la información básica de tu gimnasio</p>
              </div>

              {/* Gym Form Card */}
              <div className="rounded-3xl bg-white p-8 shadow-lg">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Crear Nuevo Gimnasio</h3>
                    <p className="text-sm text-slate-500">Completa los datos para registrar un gimnasio</p>
                  </div>
                </div>

                <form
                  className="space-y-6"
                  onSubmit={(event) =>
                    handleFormSubmit(event, `${API_BASE_URL}/api/gyms/gyms/`, gymForm, () =>
                      setGymForm({
                        name: '',
                        slug: '',
                        description: '',
                        location: '',
                        brand_color: '#10b981',
                        website: '',
                        contact_email: '',
                      }),
                    )
                  }
                >
                  {/* Información Básica */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Información Básica</h4>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Nombre del Gimnasio <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={gymForm.name}
                          required
                          placeholder="Ej: Fitness Pro"
                          className={baseFieldClass}
                          onChange={(event) => setGymForm((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Slug (URL amigable) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={gymForm.slug}
                          required
                          placeholder="Ej: fitness-pro"
                          className={baseFieldClass}
                          onChange={(event) => setGymForm((prev) => ({ ...prev, slug: event.target.value }))}
                        />
                        <p className="mt-1 text-xs text-slate-500">Sin espacios, solo letras minúsculas y guiones</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                      <textarea
                        value={gymForm.description}
                        placeholder="Describe brevemente tu gimnasio..."
                        rows={3}
                        className={baseFieldClass}
                        onChange={(event) => setGymForm((prev) => ({ ...prev, description: event.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación</label>
                      <input
                        type="text"
                        value={gymForm.location}
                        placeholder="Ej: Av. Principal 123, Ciudad"
                        className={baseFieldClass}
                        onChange={(event) => setGymForm((prev) => ({ ...prev, location: event.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Información de Contacto</h4>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Sitio Web</label>
                        <input
                          type="url"
                          value={gymForm.website}
                          placeholder="https://www.tugimnasio.com"
                          className={baseFieldClass}
                          onChange={(event) => setGymForm((prev) => ({ ...prev, website: event.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email de Contacto</label>
                        <input
                          type="email"
                          value={gymForm.contact_email}
                          placeholder="contacto@gimnasio.com"
                          className={baseFieldClass}
                          onChange={(event) => setGymForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Color de Marca */}
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Personalización</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Color de Marca</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          value={gymForm.brand_color}
                          onChange={(event) => setGymForm((prev) => ({ ...prev, brand_color: event.target.value }))}
                          className="h-14 w-20 cursor-pointer rounded-xl border-2 border-slate-200"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={gymForm.brand_color}
                            onChange={(event) => setGymForm((prev) => ({ ...prev, brand_color: event.target.value }))}
                            className={baseFieldClass}
                            placeholder="#10b981"
                          />
                          <p className="mt-1 text-xs text-slate-500">Este color se usará en el branding del gimnasio</p>
                        </div>
                        <div 
                          className="h-14 w-14 rounded-xl border-2 border-slate-200"
                          style={{ backgroundColor: gymForm.brand_color }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 border-t border-slate-200 pt-6">
                    <button
                      type="button"
                      onClick={() => setGymForm({
                        name: '',
                        slug: '',
                        description: '',
                        location: '',
                        brand_color: '#10b981',
                        website: '',
                        contact_email: '',
                      })}
                      className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Limpiar Formulario
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                    >
                      💾 Guardar Gimnasio
                    </button>
                  </div>
                </form>
              </div>

              {/* Gyms List */}
              {gyms.length > 0 && (
                <div className="mt-6 rounded-3xl bg-white p-6 shadow-lg">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Gimnasios Registrados</h3>
                  <div className="space-y-3">
                    {gyms.map((gym) => (
                      <div 
                        key={gym.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="h-12 w-12 rounded-xl border-2 border-slate-200"
                            style={{ backgroundColor: gym.brand_color }}
                          />
                          <div>
                            <h4 className="font-semibold text-slate-900">{gym.name}</h4>
                            <p className="text-sm text-slate-500">{gym.location || 'Sin ubicación'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            gym.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {gym.status === 'active' ? '✓ Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
      </main>
    </div>
  </div>
  )
}
