'use client'

import DashboardSidebar from './DashboardSidebar'
import { DashboardUser } from '@/hooks/useDashboardAuth'

type DashboardPageProps = {
  user: DashboardUser | null
  active: string
  loading: boolean
  children?: React.ReactNode
  loadingLabel?: string
}

export default function DashboardPage({ user, active, loading, children, loadingLabel }: DashboardPageProps) {
  const loadingMessage = loadingLabel ?? 'Sincronizando tu cuenta...'

  const LoadingCard = (
    <div className="rounded-3xl bg-white p-8 text-center text-slate-900 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
        Lf
      </div>
      <p className="text-base font-semibold">{loadingMessage}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Obteniendo tu progreso y tus métricas...</p>
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 transition-colors dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
          <div className="flex-1">{LoadingCard}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active={active} />
        <main className="flex-1 space-y-6">
          {loading ? (
            <div className="rounded-3xl bg-white p-8 text-center text-slate-900 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                Lf
              </div>
              <p className="text-base font-semibold">{loadingMessage}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Mantén la página abierta mientras actualizamos tus datos.</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
