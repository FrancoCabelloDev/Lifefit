'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import ChallengeManagement from '@/components/admin/ChallengeManagement'
import BadgeManagement from '@/components/admin/BadgeManagement'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [activeTab, setActiveTab] = useState<'retos' | 'insignias'>('retos')

  // Redirección si no es super_admin
  useEffect(() => {
    if (authLoading) return
    if (!user) return
    if (user.role !== 'super_admin') {
      router.replace('/resumen')
    }
  }, [authLoading, user, router])

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
            <p className="mt-1 text-sm text-slate-500">
              Gestiona los retos globales e insignias que se aplican a todos los gimnasios asociados a Lifefit.
            </p>
          </header>

          {/* Tabs Navigation (solo 2: Retos e Insignias) */}
          <div className="rounded-3xl bg-white p-2 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'retos', label: 'Retos', icon: '🎯' },
                { id: 'insignias', label: 'Insignias', icon: '🏅' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 min-w-[120px] rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido: Retos */}
          {activeTab === 'retos' && token && (
            <ChallengeManagement token={token} userGymId={user?.gym as string} />
          )}

          {/* Contenido: Insignias */}
          {activeTab === 'insignias' && token && (
            <BadgeManagement token={token} userGymId={user?.gym as string} />
          )}
        </main>
      </div>
    </div>
  )
}
