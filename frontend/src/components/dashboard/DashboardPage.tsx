'use client'

import DashboardSidebar from './DashboardSidebar'
import { DashboardUser } from '@/hooks/useDashboardAuth'
import { useTheme } from '@/hooks/useTheme'

type DashboardPageProps = {
  user: DashboardUser | null
  active: string
  loading: boolean
  children?: React.ReactNode
  loadingLabel?: string
}

export default function DashboardPage({ user, active, loading, children, loadingLabel }: DashboardPageProps) {
  const loadingMessage = loadingLabel ?? 'Sincronizando tu cuenta...'
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (!user) {
    return (
      <div className={`min-h-screen px-4 py-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className={`rounded-3xl p-8 text-center shadow-lg ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-600'} text-2xl font-semibold`}>
                Lf
              </div>
              <p className="text-base font-semibold">{loadingMessage}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Obteniendo tu progreso y tus métricas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen px-4 py-6 transition-colors ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active={active} />
        <main className="flex-1 space-y-6">
          {loading ? (
            <div className={`rounded-3xl p-8 text-center shadow-lg ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-600'}`}>
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
