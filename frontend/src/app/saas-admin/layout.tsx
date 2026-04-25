'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, CreditCard, Settings, Building2, LogOut } from 'lucide-react'

export default function SaaSAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/ingresar')
      return
    }

    try {
      const user = JSON.parse(userStr)
      if (user.role !== 'super_admin') {
        router.push('/ingresar')
        return
      }
      setIsAuthenticated(true)
    } catch (e) {
      router.push('/ingresar')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    router.push('/ingresar')
  }

  if (!isAuthenticated) {
    // Evita renderizar el layout si no está autenticado (evita parpadeos)
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Verificando sesión...</div>
  }

  return (
    <div className="flex min-h-screen bg-slate-50 antialiased font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 text-slate-300 flex flex-col hidden md:flex border-r border-zinc-800 shadow-xl z-20">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-zinc-950">
          <span className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            LifeFit Admin
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">General</div>
          
          <Link href="/saas-admin" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <LayoutDashboard className="w-5 h-5 text-zinc-400" />
            Resumen
          </Link>
          <Link href="/saas-admin/gimnasios" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <Building2 className="w-5 h-5 text-zinc-400" />
            Gimnasios
          </Link>
          <Link href="/saas-admin/usuarios" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <Users className="w-5 h-5 text-zinc-400" />
            Usuarios Globales
          </Link>
          <Link href="/saas-admin/finanzas" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <CreditCard className="w-5 h-5 text-zinc-400" />
            Finanzas
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-900 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-zinc-400" />
            Ajustes
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors mt-1 text-left"
          >
            <LogOut className="w-5 h-5 text-zinc-400" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Panel de Control</h2>
          <div className="flex items-center gap-4">
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
    </div>
  )
}
