'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  Award,
  CircleDot,
  UserCircle
} from 'lucide-react'
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
import { getToken, getStoredUser, clearAuth } from '@/lib/auth'
import type { User, Gym, PaginatedResponse } from '@/lib/types'

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

export default function GymAdminLayout({
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
  const [gymName, setGymName] = useState('')
  const [gymLogo, setGymLogo] = useState<string | null>(null)
  const [gymColor, setGymColor] = useState('#10b981')
  const [userInitial, setUserInitial] = useState('AD')
  const [userName, setUserName] = useState('Admin')

  useEffect(() => {
    const token = getToken()
    const user = getStoredUser<User>()

    if (!token || !user) {
      router.push('/tugimnasio')
      return
    }

    if (user.role !== 'gym_admin') {
      router.push('/tugimnasio')
      return
    }
    setIsAuthorized(true)
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
  }, [router, gymId])

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

  const navData: { navMain: NavGroup[] } = {
    navMain: [
      {
        title: "Principal",
        items: [
          {
            title: "Resumen",
            url: `/${gymId}/panel`,
            icon: LayoutDashboard,
          },
        ],
      },
      {
        title: "Operaciones",
        items: [
          {
            title: "Gestión",
            icon: Users,
            isActive: pathname.includes('/atletas'),
            items: [
              {
                title: "Atletas",
                url: `/${gymId}/panel/atletas`,
              },
            ],
          },
          {
            title: "Mi Equipo",
            icon: Users2,
            isActive: pathname.includes('/coaches') || pathname.includes('/nutricionistas') || pathname.includes('/atencion'),
            items: [
              {
                title: "Coaches",
                url: `/${gymId}/panel/coaches`,
              },
              {
                title: "Nutricionistas",
                url: `/${gymId}/panel/nutricionistas`,
              },
              {
                title: "Atención al Cliente",
                url: `/${gymId}/panel/atencion`,
              },
            ],
          },
        ],
      },
      {
        title: "Sistema",
        items: [
          {
            title: "Configuración",
            url: `/${gymId}/panel/configuracion`,
            icon: Settings,
          },
        ],
      },
    ],
  }

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
                  <SidebarGroupLabel className="text-slate-500 font-semibold text-[11px] uppercase tracking-[0.1em] px-4 mb-2 font-lexend">
                    {group.title}
                  </SidebarGroupLabel>
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
                        ) : (
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
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
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
                    <span className="text-[10px] text-slate-500 truncate font-inter">Administrador</span>
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
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm shadow-slate-100/50">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-slate-500 hover:bg-slate-50" />
                <Separator orientation="vertical" className="h-6 bg-slate-100" />
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
                   <span className="font-black text-slate-900 uppercase tracking-tight text-sm font-lexend">Panel Admin</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-slate-900 font-inter">{userName}</span>
                  <span className="text-[10px] text-emerald-600 font-black tracking-widest uppercase font-lexend">Sucursal Activa</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm transition-transform hover:scale-105 cursor-pointer">
                  <UserCircle className="w-6 h-6" />
                </div>
              </div>
            </header>
            <div className="p-8 flex-1 overflow-y-auto">
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
