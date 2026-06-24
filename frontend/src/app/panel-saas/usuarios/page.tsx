'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, ShieldAlert, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { User, PaginatedResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const ROLE_LABELS: Record<string, string> = {
  gym_admin:     'Gym Admin',
  coach:         'Coach',
  nutritionist:  'Nutricionista',
  receptionist:  'Recepción',
  athlete:       'Atleta',
  super_admin:   'Super Admin',
}

const ROLE_STYLES: Record<string, string> = {
  super_admin:  'bg-purple-100 text-purple-800',
  gym_admin:    'bg-blue-100   text-blue-800',
  coach:        'bg-amber-100  text-amber-800',
  nutritionist: 'bg-teal-100   text-teal-800',
  receptionist: 'bg-indigo-100 text-indigo-800',
  athlete:      'bg-slate-100  text-slate-700',
}

export default function UsersPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)

  useEffect(() => {
    api.get<PaginatedResponse<User>>('/api/auth/users/')
      .then(data => {
        const list = data.results || (Array.isArray(data) ? data : [])
        setUsers(list.filter((u: any) => u.role !== 'super_admin'))
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u: any) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Usuarios Globales</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Directorio de administradores, coaches y atletas de la plataforma.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-400 tabular-nums">
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base text-slate-800">Directorio</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Todos los usuarios registrados en LifeFit
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                className="pl-8 h-9 text-sm bg-white"
                placeholder="Buscar por nombre, email o rol…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Usuario</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Rol</th>
                  <th className="px-6 py-3 font-semibold">Gimnasio</th>
                  <th className="px-6 py-3 font-semibold">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                      Cargando usuarios…
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                      {search ? `Sin resultados para "${search}"` : 'No hay usuarios registrados.'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((u: any) => (
                    <tr key={u.id} className="bg-white hover:bg-slate-50/70 transition-colors duration-100">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {u.google_picture
                              ? <img src={u.google_picture} alt="" className="w-full h-full object-cover" />
                              : <UserIcon className="w-4 h-4 text-slate-400" />
                            }
                          </div>
                          <span className="font-medium text-slate-900">
                            {u.first_name} {u.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{u.email}</td>
                      <td className="px-6 py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                          ROLE_STYLES[u.role] ?? 'bg-slate-100 text-slate-700',
                        )}>
                          {u.role === 'super_admin' && <ShieldAlert className="w-3 h-3" />}
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {u.gym
                          ? <span className="font-medium text-slate-700">{u.gym}</span>
                          : <span className="text-slate-400 text-xs italic">Sin gimnasio</span>
                        }
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-emerald-600 text-xs">
                          Lvl {u.nivel ?? '—'}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">
                          ({u.puntos ?? 0} pts)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500 tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1)' }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === '…'
                      ? <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
                      : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                            page === p
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-white',
                          )}
                        >
                          {p}
                        </button>
                      )
                  )
                }
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1)' }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
