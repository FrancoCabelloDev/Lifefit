'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Megaphone, Plus, Trash2, Edit } from 'lucide-react'
import { api } from '@/lib/api'

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience: string;
  is_active: boolean;
  created_at: string;
}

export default function AnunciosPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({ title: '', message: '', type: 'info', target_audience: 'gym_admins', is_active: true })

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/api/system/announcements/')
      setAnnouncements((res as any).results || res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/system/announcements/', formData)
      setIsCreating(false)
      fetchAnnouncements()
      setFormData({ title: '', message: '', type: 'info', target_audience: 'gym_admins', is_active: true })
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio?')) return
    try {
      await api.delete(`/api/system/announcements/${id}/`)
      fetchAnnouncements()
    } catch (error) {
      console.error(error)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/system/announcements/${id}/`, { is_active: !currentStatus })
      fetchAnnouncements()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Anuncios Globales</h1>
          <p className="text-slate-500 mt-1">Comunícate exclusivamente con los dueños de los gimnasios (B2B).</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Anuncio
        </Button>
      </div>

      {isCreating && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="text-lg">Crear Anuncio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Mensaje</Label>
                <Input required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Información</SelectItem>
                      <SelectItem value="warning">Advertencia</SelectItem>
                      <SelectItem value="success">Éxito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audiencia</Label>
                  <div className="h-10 px-3 flex items-center border border-slate-200 rounded-md bg-slate-50 text-slate-500 text-sm">
                    Dueños de Gimnasio
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900">Guardar y Publicar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p>Cargando anuncios...</p>
      ) : (
        <div className="grid gap-4">
          {announcements.map((ann) => (
            <Card key={ann.id} className={!ann.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${ann.type === 'warning' ? 'bg-amber-100 text-amber-600' : ann.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{ann.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{ann.message}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {ann.target_audience === 'all' ? 'Todos' : ann.target_audience === 'athletes' ? 'Atletas' : 'Dueños'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Visible</Label>
                    <Switch checked={ann.is_active} onCheckedChange={() => toggleActive(ann.id, ann.is_active)} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {announcements.length === 0 && !isCreating && (
             <p className="text-slate-500 text-center py-8">No hay anuncios creados. Empieza creando uno.</p>
          )}
        </div>
      )}
    </div>
  )
}
