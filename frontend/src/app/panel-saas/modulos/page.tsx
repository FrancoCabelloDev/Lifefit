'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, ToggleLeft, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'

interface FeatureFlag {
  id: string;
  name: string;
  code: string;
  description: string;
  is_active_globally: boolean;
}

export default function ModulosPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({ name: '', code: '', description: '', is_active_globally: false })

  const fetchFlags = async () => {
    try {
      const res = await api.get('/api/system/feature-flags/')
      setFlags((res as any).results || res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/system/feature-flags/', formData)
      setIsCreating(false)
      fetchFlags()
      setFormData({ name: '', code: '', description: '', is_active_globally: false })
    } catch (error) {
      console.error(error)
    }
  }

  const toggleFlag = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/system/feature-flags/${id}/`, { is_active_globally: !currentStatus })
      fetchFlags()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este feature flag?')) return
    try {
      await api.delete(`/api/system/feature-flags/${id}/`)
      fetchFlags()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Módulos (Feature Flags)</h1>
          <p className="text-slate-500 mt-1">Activa o desactiva funcionalidades experimentales en toda la plataforma.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Módulo
        </Button>
      </div>

      {isCreating && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Crear Módulo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre (Amigable)</Label>
                  <Input required placeholder="Ej. Nuevo diseño de rutinas" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Código (Técnico)</Label>
                  <Input required placeholder="Ej. new_routine_ui" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900">Crear Feature Flag</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p>Cargando módulos...</p>
      ) : (
        <div className="grid gap-4">
          {flags.map((flag) => (
            <Card key={flag.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-slate-100 text-slate-600">
                    <ToggleLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{flag.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-500">{flag.code}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{flag.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <Switch checked={flag.is_active_globally} onCheckedChange={() => toggleFlag(flag.id, flag.is_active_globally)} />
                    <span className={`text-xs font-medium ${flag.is_active_globally ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {flag.is_active_globally ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(flag.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {flags.length === 0 && !isCreating && (
             <p className="text-slate-500 text-center py-8">No hay Feature Flags. Crea uno para controlar módulos.</p>
          )}
        </div>
      )}
    </div>
  )
}
