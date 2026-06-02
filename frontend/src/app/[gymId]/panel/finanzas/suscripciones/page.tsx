'use client'

import { useEffect, useState, use } from 'react'
import { Users, UserCheck, Clock, Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { api } from '@/lib/api'
import type { GymSubscription, PaginatedResponse } from '@/lib/types'

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: 'Activa', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { label: 'Vencida', class: 'bg-slate-50 text-slate-600 border-slate-200' },
  canceled: { label: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export default function SuscripcionesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [subscriptions, setSubscriptions] = useState<GymSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setIsLoading(true)
    api.get<GymSubscription[] | PaginatedResponse<GymSubscription>>('/api/gyms/subscriptions/')
      .then(data => setSubscriptions(Array.isArray(data) ? data : data.results || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const activeCount = subscriptions.filter(s => s.status === 'active').length
  const expiredCount = subscriptions.filter(s => s.status === 'expired').length

  const filtered = subscriptions.filter(s =>
    s.athlete_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suscripciones</h1>
        <p className="text-slate-500 mt-1">Atletas con planes de membresía asignados.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center"><UserCheck className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
              <p className="text-xs text-slate-500 font-medium">Activas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><Clock className="w-6 h-6 text-slate-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{expiredCount}</p>
              <p className="text-xs text-slate-500 font-medium">Vencidas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center"><Users className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{subscriptions.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <CardTitle className="text-lg text-slate-800">Atletas Suscritos</CardTitle>
            <CardDescription>{filtered.length} registros</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar atleta..." className="pl-10 h-9 bg-white border-slate-200" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center px-4">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Sin suscripciones</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Asigna un plan a los atletas desde la sección Atletas para verlos aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Atleta</th>
                    <th className="px-6 py-4 font-medium">Plan</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium">Inicio</th>
                    <th className="px-6 py-4 font-medium">Vencimiento</th>
                    <th className="px-6 py-4 font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(sub => (
                    <tr key={sub.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{sub.athlete_name}</td>
                      <td className="px-6 py-4 text-slate-600">{sub.plan_name || '—'}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`${statusConfig[sub.status]?.class || 'bg-slate-100 text-slate-800'} border px-2.5 py-0.5 text-xs font-medium`}>
                          {statusConfig[sub.status]?.label || sub.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{sub.start_date}</td>
                      <td className="px-6 py-4 text-slate-500">{sub.end_date || '—'}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {sub.plan_price ? `S/ ${sub.plan_price}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
