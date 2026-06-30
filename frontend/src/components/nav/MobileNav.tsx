'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Star, MessageSquare,
  MoreHorizontal, UserCircle, Users, ClipboardList,
  Target, UtensilsCrossed, X, History, Ruler,
  Trophy, Gift, Medal, BookUser, ChevronRight,
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
  href?: string
  icon: React.ElementType
  badge?: number
  matchPrefix?: boolean
  action?: 'more'
}

interface DrawerItem {
  label: string
  href: string
  icon: React.ElementType
  matchPrefix?: boolean
}

// ── Athlete "Más" drawer items ────────────────────────────────────────────────
function getAthleteDrawerItems(gymId: string): DrawerItem[] {
  return [
    { label: 'Mis Sesiones',       href: `/${gymId}/panel/mis-sesiones`,            icon: History,    matchPrefix: true },
    { label: 'Mis Medidas',        href: `/${gymId}/panel/mis-medidas`,              icon: Ruler,      matchPrefix: true },
    { label: 'Retos',              href: `/${gymId}/panel/mis-retos`,                icon: Trophy,     matchPrefix: true },
    { label: 'Mis Puntos',         href: `/${gymId}/panel/puntos`,                   icon: Star,       matchPrefix: true },
    { label: 'Canjear Recompensas',href: `/${gymId}/panel/recompensas`,              icon: Gift,       matchPrefix: true },
    { label: 'Ranking',            href: `/${gymId}/panel/ranking`,                  icon: Medal,      matchPrefix: true },
    { label: 'Mi Equipo',          href: `/${gymId}/panel/mi-equipo`,                icon: BookUser,   matchPrefix: true },
    { label: 'Perfil',             href: `/${gymId}/panel/sistema/perfil`,            icon: UserCircle },
  ]
}

// ── Tabs per role ─────────────────────────────────────────────────────────────
function getTabs(gymId: string, role: Role, unreadCount: number): TabItem[] {
  if (role === 'athlete') {
    return [
      { label: 'Inicio',   href: `/${gymId}/panel`,           icon: LayoutDashboard },
      { label: 'Planes',   href: `/${gymId}/panel/mis-planes`, icon: CalendarDays,   matchPrefix: true },
      { label: 'Puntos',   href: `/${gymId}/panel/puntos`,     icon: Star,           matchPrefix: true },
      { label: 'Mensajes', href: `/${gymId}/panel/mensajes`,   icon: MessageSquare,  matchPrefix: true, badge: unreadCount },
      { label: 'Más',      icon: MoreHorizontal, action: 'more' },
    ]
  }
  if (role === 'coach') {
    return [
      { label: 'Inicio',   href: `/${gymId}/panel`,                        icon: LayoutDashboard },
      { label: 'Atletas',  href: `/${gymId}/panel/gestion/atletas`,         icon: Users,          matchPrefix: true },
      { label: 'Rutinas',  href: `/${gymId}/panel/entrenamiento/rutinas`,   icon: ClipboardList,  matchPrefix: true },
      { label: 'Mensajes', href: `/${gymId}/panel/mensajes-coach`,          icon: MessageSquare,  matchPrefix: true, badge: unreadCount },
      { label: 'Perfil',   href: `/${gymId}/panel/sistema/perfil`,          icon: UserCircle },
    ]
  }
  if (role === 'nutritionist') {
    return [
      { label: 'Inicio',   href: `/${gymId}/panel`,                                     icon: LayoutDashboard },
      { label: 'Clientes', href: `/${gymId}/panel/gestion/atletas`,                     icon: Users,           matchPrefix: true },
      { label: 'Planes',   href: `/${gymId}/panel/nutricion/planes-nutricionales`,      icon: UtensilsCrossed, matchPrefix: true },
      { label: 'Mensajes', href: `/${gymId}/panel/mensajes-nutricionista`,              icon: MessageSquare,   matchPrefix: true, badge: unreadCount },
      { label: 'Perfil',   href: `/${gymId}/panel/sistema/perfil`,                     icon: UserCircle },
    ]
  }
  // gym_admin, receptionist, super_admin
  return [
    { label: 'Inicio',   href: `/${gymId}/panel`,                  icon: LayoutDashboard },
    { label: 'Atletas',  href: `/${gymId}/panel/gestion/atletas`,  icon: Users,          matchPrefix: true },
    { label: 'Retos',    href: `/${gymId}/panel/gamificacion/retos`, icon: Target,        matchPrefix: true },
    { label: 'Mensajes', href: `/${gymId}/panel/mensajes-coach`,   icon: MessageSquare,  matchPrefix: true, badge: unreadCount },
    { label: 'Perfil',   href: `/${gymId}/panel/sistema/perfil`,   icon: UserCircle },
  ]
}

// ── "Más" bottom drawer ───────────────────────────────────────────────────────
function MasDrawer({
  gymId,
  onClose,
}: {
  gymId: string
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const items = getAthleteDrawerItems(gymId)

  const isActive = (item: DrawerItem) =>
    item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href

  const go = (href: string) => {
    router.push(href)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-base font-bold text-slate-900">Más opciones</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-2 grid grid-cols-1 gap-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors text-left w-full',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100',
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn('text-sm font-semibold flex-1', active ? 'text-emerald-700' : 'text-slate-700')}>{item.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MobileNav({ gymId, role, unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tabs = getTabs(gymId, role, unreadCount)

  const isActive = (tab: TabItem) => {
    if (!tab.href) return false
    if (tab.href === `/${gymId}/panel`) return pathname === `/${gymId}/panel`
    if (tab.matchPrefix) return pathname.startsWith(tab.href)
    return pathname === tab.href
  }

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[60px]">
          {tabs.map((tab) => {
            const active = tab.action === 'more' ? drawerOpen : isActive(tab)
            const Icon = tab.icon

            if (tab.action === 'more') {
              return (
                <button
                  key="more"
                  onClick={() => setDrawerOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
                >
                  <Icon
                    className={cn('w-[22px] h-[22px] transition-colors duration-150', active ? 'text-emerald-700' : 'text-slate-400')}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span className={cn('text-[10px] font-semibold tracking-tight', active ? 'text-emerald-700' : 'text-slate-400')}>
                    {tab.label}
                  </span>
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-emerald-600" />}
                </button>
              )
            }

            return (
              <Link
                key={tab.href}
                href={tab.href!}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              >
                <span className="relative">
                  <Icon
                    className={cn('w-[22px] h-[22px] transition-colors duration-150', active ? 'text-emerald-700' : 'text-slate-400')}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  ) : null}
                </span>
                <span className={cn('text-[10px] font-semibold tracking-tight transition-colors duration-150', active ? 'text-emerald-700' : 'text-slate-400')}>
                  {tab.label}
                </span>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-emerald-600" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {drawerOpen && (
        <MasDrawer gymId={gymId} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  )
}
