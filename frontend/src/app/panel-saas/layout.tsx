'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, CreditCard, Settings, Building2, LogOut, GalleryVerticalEnd, Package } from 'lucide-react'
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getToken, getStoredUser, clearAuth } from '@/lib/auth'
import type { User } from '@/lib/types'

export default function SaaSAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = getToken()
    const user = getStoredUser<User>()

    if (!token || !user) {
      router.push('/ingresar')
      return
    }

    if (user.role !== 'super_admin') {
      router.push('/ingresar')
      return
    }
    setIsAuthenticated(true)
  }, [router])

  const handleLogout = () => {
    clearAuth()
    router.push('/ingresar')
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Verificando sesión...</div>
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/panel-saas">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <Building2 className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">LifeFit Admin</span>
                    <span className="text-xs text-muted-foreground">Panel SaaS</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/panel-saas'} tooltip="Resumen">
                    <Link href="/panel-saas">
                      <LayoutDashboard />
                      <span>Resumen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/gimnasios')} tooltip="Gimnasios">
                    <Link href="/panel-saas/gimnasios">
                      <Building2 />
                      <span>Gimnasios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/usuarios')} tooltip="Usuarios Globales">
                    <Link href="/panel-saas/usuarios">
                      <Users />
                      <span>Usuarios Globales</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Finanzas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/planes')} tooltip="Planes de Precio">
                    <Link href="/panel-saas/planes">
                      <Package />
                      <span>Planes de Precio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith('/panel-saas/finanzas')} tooltip="Facturación">
                    <Link href="/panel-saas/finanzas">
                      <CreditCard />
                      <span>Facturación</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Ajustes">
                <Link href="#">
                  <Settings />
                  <span>Ajustes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar Sesión">
                <LogOut />
                <span>Cerrar Sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h2 className="text-lg font-semibold text-slate-800 ml-2">Panel de Control</h2>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-emerald-500/20">
              AD
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}
