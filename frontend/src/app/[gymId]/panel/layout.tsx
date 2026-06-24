'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Apple,
  Headphones,
  Users2,
  ChevronDown,
  CircleDot,
  UserCircle,
  Dumbbell,
  ClipboardList,
  UtensilsCrossed,
  Target,
  Trophy,
  Radio,
  CalendarCheck,
  List,
  Medal,
  Bell,
  CheckCheck,
  DollarSign,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  BookUser,
  Ruler,
  CalendarRange,
  Gift,
  Star,
  History,
} from 'lucide-react'
import { useSubscriptionTier } from '@/lib/hooks'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

import { api } from '@/lib/api'
import { getToken, getStoredUser, clearAuth, restoreAdminTokens, getAdminBackup, dispatchAuthEvent } from '@/lib/auth'
import type { User, Gym, PaginatedResponse, Role, Notification } from '@/lib/types'
import GlobalBanner from '@/components/GlobalBanner'
import { ROLE_LABELS, ROLE_HEADERS } from '@/lib/types'

const AUTHORIZED_ROLES: Role[] = ['gym_admin', 'coach', 'nutritionist', 'receptionist', 'athlete']

interface NavSubItem {
  title: string
  url: string
}

interface NavItem {
  title: string
  url?: string
  icon?: any
  isActive?: boolean
  items?: NavSubItem[]
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function getNavData(role: Role, gymId: string, pathname: string, activeFlags?: Set<string>, tier?: string | null): { navMain: NavGroup[] } {
  const isEnabled = (flag: string) => !activeFlags || activeFlags.has(flag)
  const isPremium = tier === 'premium'

  if (role === 'athlete') {
    return {
      navMain: [
        {
          title: "Principal",
          items: [
            { title: "Resumen", url: `/${gymId}/panel`, icon: LayoutDashboard },
          ],
        },
        {
          title: "Mi Coach",
          items: [
            { title: "Plan Semanal", url: `/${gymId}/panel/mi-plan-semanal`, icon: CalendarDays },
            { title: "Rutinas", url: `/${gymId}/panel/mis-rutinas`, icon: Dumbbell },
            { title: "Mis Sesiones", url: `/${gymId}/panel/mis-sesiones`, icon: History },
            { title: "Mensajes", url: `/${gymId}/panel/mensajes-coach`, icon: MessageSquare },
          ],
        },
        {
          title: "Mi Nutrición",
          items: [
            { title: "Plan Alimentario", url: `/${gymId}/panel/mi-nutricion`, icon: UtensilsCrossed },
            { title: "Mis Medidas", url: `/${gymId}/panel/mis-medidas`, icon: Ruler },
            ...(isPremium ? [
              { title: "Citas", url: `/${gymId}/panel/mis-citas`, icon: CalendarDays },
              { title: "Mensajes", url: `/${gymId}/panel/mensajes-nutricionista`, icon: MessageSquare },
            ] : []),
          ],
        },
        {
          title: "Retos",
          items: [
            // Retos solo para Premium
            ...(isPremium ? [
              { title: "Retos Activos", url: `/${gymId}/panel/mis-retos`, icon: Target },
            ] : [
              { title: "Retos 🔒 Premium", url: `/${gymId}/panel/mis-retos`, icon: Target },
            ]),
          ],
        },
        {
          title: "Recompensas",
          items: [
            { title: "Mis Puntos", url: `/${gymId}/panel/puntos`, icon: Star },
            { title: "Canjear Recompensas", url: `/${gymId}/panel/recompensas`, icon: Gift },
          ],
        },
        {
          title: "Mi Perfil",
          items: [
            { title: "Ranking", url: `/${gymId}/panel/ranking`, icon: Medal },
            { title: "Mi Equipo", url: `/${gymId}/panel/mi-equipo`, icon: BookUser },
            { title: "Configuración", url: `/${gymId}/panel/sistema/perfil`, icon: UserCircle },
          ],
        },
      ],
    }
  }

  if (role === 'coach') {
    return {
      navMain: [
        {
          title: "Principal",
          items: [
            { title: "Página inicial", url: `/${gymId}/panel`, icon: LayoutDashboard },
          ],
        },
        {
          title: "Mis Atletas",
          items: [
            { title: "Atletas", url: `/${gymId}/panel/gestion/atletas`, icon: Users },
            { title: "Mensajes", url: `/${gymId}/panel/mensajes-coach`, icon: MessageSquare },
          ],
        },
        {
          title: "Entrenamiento",
          items: [
            { title: "Ejercicios", url: `/${gymId}/panel/entrenamiento/ejercicios`, icon: List },
            { title: "Rutinas", url: `/${gymId}/panel/entrenamiento/rutinas`, icon: ClipboardList },
            { title: "Adherencia", url: `/${gymId}/panel/entrenamiento/adherencia`, icon: TrendingUp },
            { title: "Plan Semanal", url: `/${gymId}/panel/entrenamiento/plan-semanal`, icon: CalendarDays },
          ],
        },
        {
          title: "Gamificación",
          items: [
            { title: "Retos", url: `/${gymId}/panel/gamificacion/retos`, icon: Target },
            { title: "Ranking", url: `/${gymId}/panel/ranking`, icon: Trophy },
          ],
        },
        {
          title: "Cuenta",
          items: [
            { title: "Perfil", url: `/${gymId}/panel/sistema/perfil`, icon: UserCircle },
          ],
        },
      ],
    }
  }

  if (role === 'nutritionist') {
    return {
      navMain: [
        {
          title: "Principal",
          items: [
            { title: "Página inicial", url: `/${gymId}/panel`, icon: LayoutDashboard },
          ],
        },
        {
          title: "Gestión",
          items: [
            { title: "Agenda", url: `/${gymId}/panel/agenda`, icon: CalendarDays },
            { title: "Mi Horario", url: `/${gymId}/panel/mi-horario`, icon: CalendarRange },
            { title: "Clientes", url: `/${gymId}/panel/gestion/atletas`, icon: Users },
          ],
        },
        {
          title: "Acompañamiento",
          items: [
            { title: "Mensajes", url: `/${gymId}/panel/mensajes-nutricionista`, icon: MessageSquare },
          ],
        },
        {
          title: "Plan de Alimentación",
          items: [
            { title: "Planes Nutricionales", url: `/${gymId}/panel/nutricion/planes-nutricionales`, icon: ClipboardList },
            { title: "Alimentos", url: `/${gymId}/panel/nutricion/alimentos`, icon: Apple },
          ],
        },
        {
          title: "Cuenta",
          items: [
            { title: "Perfil", url: `/${gymId}/panel/sistema/perfil`, icon: UserCircle },
          ],
        },
      ],
    }
  }

  if (role === 'receptionist') {
    return {
      navMain: [
        {
          title: "Principal",
          items: [
            { title: "Resumen", url: `/${gymId}/panel`, icon: LayoutDashboard },
          ],
        },
        {
          title: "Operaciones",
          items: [
            { title: "Check-in", url: `/${gymId}/panel/gestion/checkins`, icon: Radio },
          ],
        },
        {
          title: "Gestión",
          items: [
            { title: "Atletas", url: `/${gymId}/panel/gestion/atletas`, icon: Users },
            { title: "Planes de Membresía", url: `/${gymId}/panel/gestion/planes`, icon: CalendarCheck },
            { title: "Suscripciones", url: `/${gymId}/panel/finanzas/suscripciones`, icon: DollarSign },
          ],
        },
        {
          title: "Cuenta",
          items: [
            { title: "Perfil", url: `/${gymId}/panel/sistema/perfil`, icon: UserCircle },
          ],
        },
      ],
    }
  }

  const teamItems = [
    { title: "Coaches", url: `/${gymId}/panel/equipo/coaches` },
    isEnabled('nutricion') && { title: "Nutricionistas", url: `/${gymId}/panel/equipo/nutricionistas` },
    { title: "Atención al Cliente", url: `/${gymId}/panel/equipo/atencion` },
  ].filter(Boolean) as { title: string; url: string }[]

  const gamificationItems = [
    isEnabled('retos') && { title: "Retos", url: `/${gymId}/panel/gamificacion/retos` },
    isEnabled('ranking') && { title: "Ranking", url: `/${gymId}/panel/ranking` },
  ].filter(Boolean) as { title: string; url: string }[]

  const operacionesItems = ([
    isEnabled('checkin') && { title: "Check-in", url: `/${gymId}/panel/gestion/checkins`, icon: Radio },
    {
      title: "Gestión",
      icon: Users,
      isActive: pathname.includes('/gestion/'),
      items: [
        { title: "Atletas", url: `/${gymId}/panel/gestion/atletas` },
      ],
    },
    teamItems.length > 1 && {
      title: "Mi Equipo",
      icon: Users2,
      isActive: pathname.includes('/equipo/'),
      items: teamItems,
    },
    isEnabled('rutinas') && {
      title: "Entrenamiento",
      icon: Dumbbell,
      isActive: pathname.includes('/entrenamiento/'),
      items: [
        { title: "Ejercicios", url: `/${gymId}/panel/entrenamiento/ejercicios` },
        { title: "Rutinas", url: `/${gymId}/panel/entrenamiento/rutinas` },
      ],
    },
    gamificationItems.length > 0 && {
      title: "Gamificación",
      icon: Target,
      isActive: pathname.includes('/gamificacion/') || pathname.includes('/puntos/'),
      items: [
        ...gamificationItems,
        { title: "Puntos & Recompensas", url: `/${gymId}/panel/puntos/recompensas` },
        { title: "Configurar Puntos", url: `/${gymId}/panel/puntos/configuracion` },
      ],
    },
    {
      title: "Finanzas",
      icon: DollarSign,
      isActive: pathname.includes('/finanzas'),
      items: [
        { title: "Suscripciones", url: `/${gymId}/panel/finanzas/suscripciones` },
        { title: "Planes de Precio", url: `/${gymId}/panel/finanzas/planes-precio` },
        { title: "Facturación", url: `/${gymId}/panel/finanzas/facturacion` },
      ],
    },
  ] as const).filter(Boolean) as (NavItem | { title: string; icon: any; isActive: boolean; items: { title: string; url: string }[] })[]

  return {
    navMain: [
      {
        title: "Principal",
        items: [
          { title: "Resumen", url: `/${gymId}/panel`, icon: LayoutDashboard },
        ],
      },
      {
        title: "Operaciones",
        items: operacionesItems,
      },
      {
        title: "Sistema",
        items: [
          { title: "Configuración", url: `/${gymId}/panel/sistema/configuracion`, icon: Settings },
          { title: "Perfil", url: `/${gymId}/panel/sistema/perfil`, icon: UserCircle },
        ],
      },
    ],
  }
}

export default function GymPanelLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ gymId: string }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { gymId } = use(params)
  
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userRole, setUserRole] = useState<Role>('gym_admin')
  const [gymName, setGymName] = useState('')
  const [gymLogo, setGymLogo] = useState<string | null>(null)
  const [gymColor, setGymColor] = useState('#10b981')
  const [userInitial, setUserInitial] = useState('AD')
  const [userName, setUserName] = useState('Admin')
  const [showNotif, setShowNotif] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)

  const { tier: subscriptionTier } = useSubscriptionTier()

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/notifications/')
      return (data?.results || []) as Notification[]
    },
    refetchInterval: 30000,
    staleTime: 0,
  })
  const notifications = notifQuery.data || []

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/notifications/unread_count/')
      return (data?.unread_count || 0) as number
    },
    refetchInterval: 15000,
  })
  const unreadCount = unreadCountQuery.data || 0

  const { data: featureFlags } = useQuery({
    queryKey: ['gym-feature-flags'],
    queryFn: async () => {
      const data = await api.get<any>('/api/gyms/feature-flags/')
      const flags = (data?.results || data || []) as Array<{ feature_flag_detail: { code: string }; is_active: boolean }>
      return new Set(flags.filter(f => f.is_active).map(f => f.feature_flag_detail.code))
    },
    staleTime: 60000,
  })

  const queryClient = useQueryClient()
  const markReadMutation = useMutation({
    mutationFn: () => api.post('/api/gyms/notifications/mark_read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  useEffect(() => {
    const token = getToken()
    const user = getStoredUser<User>()

    if (!token || !user) {
      router.push('/tugimnasio')
      return
    }

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      router.push('/tugimnasio')
      return
    }

    setIsAuthorized(true)
    setIsImpersonating(!!getAdminBackup())
    setUserRole(user.role)
    setUserName(`${user.first_name} ${user.last_name}`)
    setUserInitial(user.first_name?.[0]?.toUpperCase() || 'AD')

    const fetchGymData = async () => {
      try {
        const data = await api.get<PaginatedResponse<Gym>>("/api/gyms/gyms/", {
          params: { slug: gymId }
        })
        const myGym = data.results?.[0] || (Array.isArray(data) ? data[0] : null)
        if (myGym) {
          setGymName(myGym.name)
          if (myGym.logo) {
            const logoUrl = myGym.logo.startsWith('http')
              ? myGym.logo
              : `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'}${myGym.logo}`
            setGymLogo(logoUrl)
          }
          setGymColor(myGym.brand_color || '#10b981')
        }
      } catch (error) {
        console.error("Error fetching gym", error)
      }
    }

    fetchGymData()

    const handleAuthChanged = () => {
      const u = getStoredUser<User>()
      if (u) {
        setUserRole(u.role)
        setUserName(`${u.first_name} ${u.last_name}`)
        setUserInitial(u.first_name?.[0]?.toUpperCase() || 'AD')
      }
      setIsImpersonating(!!getAdminBackup())
    }

    window.addEventListener('lifefit-auth-changed', handleAuthChanged)
    return () => window.removeEventListener('lifefit-auth-changed', handleAuthChanged)
  }, [router, gymId])

  const handleRestoreAdmin = () => {
    const backup = getAdminBackup()
    if (!backup) return
    restoreAdminTokens()
    if (backup.user.role === 'super_admin') {
      window.location.href = '/panel-saas'
    } else {
      window.location.href = `/${gymId}/panel`
    }
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/tugimnasio')
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-inter">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const navData = getNavData(userRole, gymId, pathname, featureFlags, subscriptionTier)
  const roleLabel = ROLE_LABELS[userRole]
  const roleHeader = ROLE_HEADERS[userRole]

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-[#fcfcfc] font-inter">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border">
            <SidebarHeader className="h-20 flex items-center px-5 mb-2 border-b border-white/5 bg-slate-900">
              <div className="flex items-center gap-4 overflow-hidden w-full">
                <div 
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg p-0.5 shrink-0 transition-transform hover:scale-105"
                  style={{ border: `3px solid ${gymColor}20` }}
                >
                  {gymLogo ? (
                    <img src={gymLogo} alt="" className="h-full w-full object-contain rounded-[14px]" />
                  ) : (
                    <div className="text-xl font-bold font-lexend" style={{ color: gymColor }}>
                      {gymName.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[16px] font-semibold text-white tracking-tight leading-tight font-lexend">
                    {gymName}
                  </span>
                  <div className="flex items-center mt-1">
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase font-inter border border-emerald-500/20">
                      Premium
                    </span>
                  </div>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="bg-slate-900">
              {navData.navMain.map((group) => (
                <SidebarGroup key={group.title}>
                  {group.title !== "Finanzas" && (
                    <SidebarGroupLabel className="text-slate-500 font-semibold text-[11px] uppercase tracking-[0.1em] px-4 mb-2 font-lexend">
                      {group.title}
                    </SidebarGroupLabel>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        item.items ? (
                          <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={item.isActive}
                            className="group/collapsible"
                          >
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton 
                                  tooltip={item.title}
                                  className="h-10 px-4 hover:bg-white/5 active:scale-95 transition-all text-slate-300 hover:text-white"
                                >
                                  {item.icon && <item.icon className="w-5 h-5 opacity-70 group-hover:opacity-100" />}
                                  <span className="font-medium font-inter">{item.title}</span>
                                  <ChevronDown className="ml-auto h-4 w-4 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-6 mt-1 border-l border-white/10 space-y-1">
                                  {item.items.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                        <Link 
                                          href={subItem.url}
                                          className="h-9 text-slate-400 hover:text-white transition-colors font-inter text-sm"
                                        >
                                          <CircleDot className="w-2 h-2 mr-2 opacity-0 group-data-[active=true]:opacity-100" />
                                          <span>{subItem.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        ) : (() => {
                          const premiumRoutes = ['mis-retos']
                          const isPremiumRoute = item.url && premiumRoutes.some(r => item.url!.includes(r))
                          const isLocked = isPremiumRoute && userRole === 'athlete' && subscriptionTier === 'basic'
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton
                                asChild
                                tooltip={item.title}
                                isActive={pathname === (item.url || '#')}
                                className="h-10 px-4 hover:bg-white/5 active:scale-95 transition-all text-slate-300 hover:text-white data-[active=true]:bg-emerald-600 data-[active=true]:text-white shadow-none"
                              >
                                <Link href={item.url || '#'}>
                                  {item.icon && <item.icon className="w-5 h-5 opacity-70 group-data-[active=true]:opacity-100" />}
                                  <span className="font-medium font-inter">{item.title}</span>
                                  {isLocked && <span className="ml-auto text-[10px] opacity-60">🔒</span>}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })()
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>

            <SidebarFooter className="bg-slate-900 border-t border-white/5 p-4 mt-auto">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                    {userInitial}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-white truncate font-inter">{userName}</span>
                    <span className="text-[10px] text-slate-500 truncate font-inter">{roleLabel}</span>
                  </div>
                </div>
                <Separator className="bg-white/5" />
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-all text-sm font-medium font-inter"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>

          <main className="flex-1 flex flex-col min-w-0">
            <GlobalBanner />
            <header className="h-16 sm:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm shadow-slate-100/50">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-slate-500 hover:bg-slate-50" />
                <Separator orientation="vertical" className="h-6 bg-slate-100" />
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
                   <span className="font-black text-slate-900 uppercase tracking-tight text-sm font-lexend">{roleHeader}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-slate-900 font-inter">{userName}</span>
                  <span className="text-[10px] text-emerald-600 font-black tracking-widest uppercase font-lexend">Sucursal Activa</span>
                </div>

                {isImpersonating && (
                  <button
                    onClick={handleRestoreAdmin}
                    className="h-10 px-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:scale-105 text-xs font-bold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Volver a Admin
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => { setShowNotif(prev => !prev); notifQuery.refetch() }}
                    className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm transition-all hover:bg-slate-100 hover:scale-105 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/20">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotif && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                      <div className="absolute right-0 top-12 z-50 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-sm">Notificaciones</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markReadMutation.mutate()}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Marcar todas leídas
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifQuery.isLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                            </div>
                          ) : notifications.length > 0 ? (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-all cursor-pointer ${!n.is_read ? 'bg-emerald-50/50' : ''}`}
                                onClick={() => {
                                  if (n.link) router.push(n.link)
                                  setShowNotif(false)
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`min-w-2 h-2 rounded-full mt-1.5 ${!n.is_read ? 'bg-emerald-500' : 'bg-transparent'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                                    {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {new Date(n.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-12 text-center text-slate-400">
                              <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="text-sm font-medium">Sin notificaciones</p>
                              <p className="text-xs mt-1">No tienes notificaciones nuevas.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm transition-transform hover:scale-105 cursor-pointer">
                  <UserCircle className="w-6 h-6" />
                </div>
              </div>
            </header>
            <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
