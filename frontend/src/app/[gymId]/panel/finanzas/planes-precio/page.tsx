'use client'

import { useEffect, useState, use } from 'react'
import {
  Plus, Pencil, Trash2, Search, Loader2, Check, X, DollarSign, CalendarDays, GripVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

import { api } from '@/lib/api'
import type { GymMembershipPlan } from '@/lib/types'

export default function PlanesPrecioPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const [plans, setPlans] = useState<GymMembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; edit?: GymMembershipPlan }>({ open: false })
  const [form, setForm] = useState({ name: '', description: '', price: '', duration_days: 30, features: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const fetchPlans = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<any>(`/api/gyms/membership-plans/?gym_slug=${gymId}`)
      setPlans(Array.isArray(data) ? data : data.results || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [])

  const openCreate = () => {
    setForm({ name: '', description: '', price: '', duration_days: 30, features: '', is_active: true })
    setModal({ open: true })
  }

  const openEdit = (plan: GymMembershipPlan) => {
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      duration_days: plan.duration_days,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_active: plan.is_active,
    })
    setModal({ open: true, edit: plan })
  }

  const handleSave = async () => {
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: form.price,
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
      }
      if (modal.edit) {
        await api.patch(`/api/gyms/membership-plans/${modal.edit.id}/`, payload)
      } else {
        await api.post('/api/gyms/membership-plans/', payload)
      }
      setModal({ open: false })
      fetchPlans()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (plan: GymMembershipPlan) => {
    try {
      await api.patch(`/api/gyms/membership-plans/${plan.id}/`, { is_active: !plan.is_active })
      fetchPlans()
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (plan: GymMembershipPlan) => {
    if (!confirm(`¿Eliminar "${plan.name}"?`)) return
    try {
      await api.delete(`/api/gyms/membership-plans/${plan.id}/`)
      fetchPlans()
    } catch (e) { console.error(e) }
  }

  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 font-inter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-lexend">Planes de Precio</h1>
          <p className="text-slate-500 font-medium mt-1">Crea y gestiona los planes de membresía de tu gimnasio.</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2">
          <Plus className="w-4 h-4" /> Nuevo Plan
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar planes..." className="pl-10 h-10 bg-white border-slate-200 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-slate-200/60 rounded-[2rem] shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
            <DollarSign className="w-16 h-16 text-slate-200" />
            <p className="font-semibold text-lg text-slate-400">No hay planes de precio</p>
            <p className="text-sm text-slate-400">Crea tu primer plan de membresía para los atletas.</p>
            <Button onClick={openCreate} variant="outline" className="rounded-xl mt-2">Crear Plan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(plan => (
            <Card key={plan.id} className={`border-slate-200/60 rounded-[2rem] shadow-sm transition-all hover:shadow-md ${!plan.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description || 'Sin descripción'}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(plan)} className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(plan)} className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">S/ {plan.price}</span>
                  <span className="text-sm text-slate-500">/{plan.duration_days} días</span>
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Switch checked={plan.is_active} onCheckedChange={() => handleToggleActive(plan)} />
                    <span className={`text-xs font-semibold ${plan.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {plan.duration_days} días
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-white shadow-2xl border-0 rounded-[2rem]">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-xl">{modal.edit ? 'Editar Plan' : 'Crear Nuevo Plan'}</CardTitle>
              <CardDescription>Configura los detalles del plan de membresía.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Plan</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. Membresía Mensual" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Breve descripción del plan..." className="rounded-xl" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio (S/)</Label>
                  <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="99.00" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Duración (días)</Label>
                  <Input type="number" min="1" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: parseInt(e.target.value) || 30 })} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Beneficios (uno por línea)</Label>
                <Textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="Acceso ilimitado al gym&#10;Clases grupales incluidas&#10;Estacionamiento gratuito" className="rounded-xl" rows={4} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <span className="text-sm font-medium text-slate-700">Plan activo</span>
              </div>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[2rem]">
              <Button variant="outline" onClick={() => setModal({ open: false })} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.price} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal.edit ? 'Guardar Cambios' : 'Crear Plan'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
