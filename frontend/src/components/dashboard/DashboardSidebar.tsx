'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AUTH_EVENT } from '@/hooks/useDashboardAuth'

type UserProps = {
  first_name: string
  last_name: string
  email: string
  role?: string | null
}

type SidebarProps = {
  user: UserProps
  active: string
}

const baseRoutes = [
  { href: '/resumen', label: 'Resumen' },
  { href: '/retos', label: 'Retos' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/rutinas', label: 'Rutinas' },
  { href: '/nutricion', label: 'Nutrición' },
  { href: '/perfil', label: 'Perfil' },
  { href: '/seguridad', label: 'Seguridad' },
]

export default function DashboardSidebar({ user, active }: SidebarProps) {
  const router = useRouter()
  const routes = user.role === 'super_admin' ? [...baseRoutes, { href: '/admin', label: 'Admin' }] : baseRoutes

  const getRoleLabel = () => {
    switch (user.role) {
      case 'super_admin':
        return 'Administrador'
      case 'gym_owner':
        return 'Dueño de Gimnasio'
      case 'coach':
        return 'Entrenador'
      case 'athlete':
        return 'Atleta'
      default:
        return 'Usuario'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('lifefit_access_token')
    localStorage.removeItem('lifefit_refresh_token')
    localStorage.removeItem('lifefit_user')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_EVENT))
    }
    router.replace('/ingresar')
  }

  return (
    <aside className="lg:w-64">
      <div className="rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-slate-800">
        <div className="mb-4 rounded-2xl bg-emerald-100 p-4 text-center dark:bg-emerald-500/10">
          <p className="text-xs uppercase text-emerald-600">{getRoleLabel()}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-2xl border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
          >
            Cerrar sesion
          </button>
        </div>
        <nav className="space-y-2 text-sm">
          {routes.map(({ href, label, disabled }) => {
            const isActive = href === active
            const commonClasses =
              'block rounded-2xl px-4 py-2 font-medium transition ' +
              (isActive
                ? 'bg-emerald-500 text-white'
                : disabled
                  ? 'text-slate-400 dark:text-slate-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800')
            return disabled ? (
              <span key={label} className={commonClasses}>
                {label}
              </span>
            ) : (
              <Link key={label} href={href} className={commonClasses}>
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
