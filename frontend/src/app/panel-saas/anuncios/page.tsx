'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Megaphone, Plus, Trash2, Building2, Users, ChevronRight, Globe } from 'lucide-react'
import { api } from '@/lib/api'
import { showSuccess, showError } from '@/lib/toast'
import type { Gym, PaginatedResponse } from '@/lib/types'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  target_audience: string
  target_gym: string | null
  target_gym_name: string | null
  is_active: boolean
  created_at: string
}

const TYPE_CONFIG = {
  info:    { label: 'Información', color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500'    },
  warning: { label: 'Advertencia', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500'   },
  success: { label: 'Éxito',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
}

const AUDIENCE_LABELS: Record<string, string> = {
  all:           'Todos los usuarios',
  gym_admins:    'Administradores',
  athletes:      'Atletas',
  coaches:       'Coaches',
  nutritionists: 'Nutricionistas',
  receptionists: 'Atención al Cliente',
}

const EMPTY_FORM = {
  title: '',
  message: '',
  type: 'info',
  target_gym: '',       // '' = todos los gimnasios
  target_audience: 'all',
  is_active: true,
}

export default function AnunciosPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [gyms, setGyms] = useState<Gym[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get<any>('/api/system/announcements/')
      setAnnouncements(res.results || res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchGyms = async () => {
    try {
      const res = await api.get<PaginatedResponse<Gym>>('/api/gyms/gyms/')
      setGyms(res.results || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchAnnouncements()
    fetchGyms()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/system/announcements/', {
        ...form,
        target_gym: form.target_gym || null,
      })
      showSuccess('Anuncio publicado correctamente')
      setIsCreating(false)
      setForm({ ...EMPTY_FORM })
      fetchAnnouncements()
    } catch (err) {
      showError(err, 'Error al publicar el anuncio')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/system/announcements/${id}/`)
      showSuccess('Anuncio eliminado')
      fetchAnnouncements()
    } catch (err) {
      showError(err, 'Error al eliminar')
    }
  }

  const toggleActive = async (ann: Announcement) => {
    try {
      await api.patch(`/api/system/announcements/${ann.id}/`, { is_active: !ann.is_active })
      fetchAnnouncements()
    } catch (err) {
      showError(err, 'Error al actualizar')
    }
  }

  const selectedGym = gyms.find(g => g.id === form.target_gym)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Anuncios Globales</h1>
          <p className="text-slate-500 mt-1">Comunícate con usuarios específicos de un gimnasio o toda la plataforma.</p>
        </div>
        <Button
          onClick={() => setIsCreating(v => !v)}
          className="bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-transform text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Anuncio
        </Button>
      </div>

      {/* Formulario de creación */}
      {isCreating && (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-base font-bold text-slate-800">Crear Anuncio</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Paso 1 — Destinatario */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <p className="text-sm font-semibold text-slate-700">¿A qué gimnasio?</p>
                </div>
                <Select value={form.target_gym} onValueChange={v => setForm({ ...form, target_gym: v === 'all' ? '' : v, target_audience: 'all' })}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Selecciona un gimnasio..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-1.5">
                    <SelectItem value="all" className="rounded-xl py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold">Todos los gimnasios</span>
                      </div>
                    </SelectItem>
                    {gyms.map(g => (
                      <SelectItem key={g.id} value={g.id} className="rounded-xl py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {g.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Paso 2 — Audiencia dentro del gimnasio */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <p className="text-sm font-semibold text-slate-700">¿A qué rol?</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'all',           label: 'Todos',              icon: '👥' },
                    { value: 'gym_admins',    label: 'Administradores',    icon: '🛡️' },
                    { value: 'athletes',      label: 'Atletas',            icon: '🏋️' },
                    { value: 'coaches',       label: 'Coaches',            icon: '🎯' },
                    { value: 'nutritionists', label: 'Nutricionistas',     icon: '🥗' },
                    { value: 'receptionists', label: 'Atención al Cliente',icon: '💬' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, target_audience: opt.value })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-[0.97] text-left ${
                        form.target_audience === opt.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span className="leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Preview del destinatario */}
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                  <Megaphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Este anuncio se mostrará a{' '}
                    <strong className="text-slate-700">{AUDIENCE_LABELS[form.target_audience]}</strong>
                    {' '}de{' '}
                    <strong className="text-slate-700">{selectedGym ? selectedGym.name : 'todos los gimnasios'}</strong>
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Paso 3 — Contenido */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <p className="text-sm font-semibold text-slate-700">Contenido del anuncio</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Título</Label>
                  <Input
                    required
                    placeholder="Ej: Mantenimiento programado el sábado"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="rounded-xl border-slate-200 h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mensaje</Label>
                  <Textarea
                    required
                    placeholder="Describe el anuncio con más detalle..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="rounded-xl border-slate-200 min-h-[80px] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo</Label>
                  <div className="flex gap-2">
                    {(['info', 'warning', 'success'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-[0.97] ${
                          form.type === t
                            ? TYPE_CONFIG[t].color + ' border-current'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {TYPE_CONFIG[t].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsCreating(false); setForm({ ...EMPTY_FORM }) }} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-transform text-white">
                  Publicar anuncio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de anuncios */}
      {loading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : announcements.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Megaphone className="w-10 h-10 text-slate-200 mb-3" />
          <p className="font-semibold text-slate-600">No hay anuncios creados</p>
          <p className="text-sm text-slate-400 mt-1">Crea un anuncio para comunicarte con los gimnasios.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info
            return (
              <div
                key={ann.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border bg-white transition-opacity ${!ann.is_active ? 'opacity-50' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm">{ann.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{ann.message}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                    {ann.target_gym_name
                      ? <><Building2 className="w-3 h-3" /> {ann.target_gym_name}</>
                      : <><Globe className="w-3 h-3" /> Todos los gimnasios</>
                    }
                    <ChevronRight className="w-3 h-3" />
                    <Users className="w-3 h-3" />
                    {AUDIENCE_LABELS[ann.target_audience] || ann.target_audience}
                    <span className="ml-1">· {new Date(ann.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{ann.is_active ? 'Visible' : 'Oculto'}</span>
                    <Switch checked={ann.is_active} onCheckedChange={() => toggleActive(ann)} />
                  </div>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors active:scale-[0.97]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
