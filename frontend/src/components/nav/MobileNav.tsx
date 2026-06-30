'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Trophy, MessageSquare,
  UserCircle, Users, ClipboardList, Target, UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

interface MobileNavProps {
  gymId: string
  role: Role
  unreadCount?: number
}

interface TabItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  matchPrefix?: boolean
}

function gettabs(gymId: string, role: Role, unreadCount: number): TabItem[] {
  if (role === 'athlete') {
    return [
      { label: 'Inicio',    href: `/${gymId}/panel`,              icon: LayoutDashboard },
      { label: 'Plan',      href: `/${gymId}/panel/mi-plan-semanal`, icon: CalendarDays },
      { label: 'Retos',     href: `/${gymId}/panel/mis-retos`,    icon: Trophy },
      { label: 'Mensajes',  href: `/${gymId}/panel/mensajes-coach`, icon: MessageSquare, badge: unreadCount },
      { label: 'Perfil',    href: `/${gymId}/panel/sistema/perfil`, icon: UserCircle },
    ]
  }
  if (role === 'coach') {
    return [
      { label: 'Inicio',    href: `/${gymId}/panel`,                    icon: LayoutDashboard },
      { label: 'Atletas',   href: `/${gymId}/panel/gestion/atletas`,    icon: Users, matchPrefix: true },
      { label: 'Rutinas',   href: `/${gymId}/panel/entrenamiento/rutinas`, icon: ClipboardList, matchPrefix: true },
      { label: 'Mensajes',  href: `/${gymId}/panel/mensajes-coach`,     icon: MessageSquare, badge: unreadCount },
      { label: 'Perfil',    href: `/${gymId}/panel/sistema/perfil`,     icon: UserCircle },
    ]
  }
  if (role === 'nutritionist') {
    return [
      { label: 'Inicio',    href: `/${gymId}/panel`,                              icon: LayoutDashboard },
      { label: 'Clientes',  href: `/${gymId}/panel/gestion/atletas`,              icon: Users, matchPrefix: true },
      { label: 'Planes',    href: `/${gymId}/panel/nutricion/planes-nutricionales`, icon: UtensilsCrossed, matchPrefix: true },
      { label: 'Mensajes',  href: `/${gymId}/panel/mensajes-nutricionista`,       icon: MessageSquare, badge: unreadCount },
      { label: 'Perfil',    href: `/${gymId}/panel/sistema/perfil`,               icon: UserCircle },
    ]
  }
  // gym_admin, receptionist, super_admin
  return [
    { label: 'Inicio',    href: `/${gymId}/panel`,                 icon: LayoutDashboard },
    { label: 'Atletas',   href: `/${gymId}/panel/gestion/atletas`, icon: Users, matchPrefix: true },
    { label: 'Retos',     href: `/${gymId}/panel/gamificacion/retos`, icon: Target, matchPrefix: true },
    { label: 'Mensajes',  href: `/${gymId}/panel/mensajes-coach`,  icon: MessageSquare, badge: unreadCount },
    { label: 'Perfil',    href: `/${gymId}/panel/sistema/perfil`,  icon: UserCircle },
  ]
}

export function MobileNav({ gymId, role, unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname()
  const tabs = gettabs(gymId, role, unreadCount)

  const isActive = (tab: TabItem) => {
    if (tab.href === `/${gymId}/panel`) return pathname === `/${gymId}/panel`
    if (tab.matchPrefix) return pathname.startsWith(tab.href)
    return pathname === tab.href || pathname.startsWith(tab.href + '/')
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[60px]">
        {tabs.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              <span className="relative">
                <Icon
                  className={cn(
                    'w-[22px] h-[22px] transition-colors duration-150',
                    active ? 'text-emerald-700' : 'text-slate-400',
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </span>
              <span className={cn(
                'text-[10px] font-semibold tracking-tight transition-colors duration-150',
                active ? 'text-emerald-700' : 'text-slate-400',
              )}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-emerald-600" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
