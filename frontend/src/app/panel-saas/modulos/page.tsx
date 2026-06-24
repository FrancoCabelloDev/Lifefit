'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Plus, ToggleLeft, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureFlag {
  id:                  string
  name:                string
  code:                string
  description:         string
  is_active_globally:  boolean
}

// ── Impact descriptions shown in the deactivation warning modal ───────────────

const MODULE_IMPACT: Record<string, string> = {
  rutinas:  'Los atletas dejarán de ver su plan semanal, rutinas y sesiones de entrenamiento en su panel.',
  nutricion:'Los atletas dejarán de ver su plan alimentario, medidas corporales y citas con nutricionista.',
  retos:    'Los atletas dejarán de ver sus retos activos.',
  ranking:  'Los atletas dejarán de ver la tabla de clasificación del gimnasio.',
  checkin:  'El personal dejará de tener acceso al módulo de registro de asistencia.',
}

// ── Deactivation confirmation modal ──────────────────────────────────────────

interface ConfirmModalProps {
  flag:     FeatureFlag
  onCancel: () => void
  onConfirm:() => void
  loading:  boolean
}

function DeactivateModal({ flag, onCancel, onConfirm, loading }: ConfirmModalProps) {
  const impact = MODULE_IMPACT[flag.code]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: 'modal-in 220ms cubic-bezier(0.23,1,0.32,1) both',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Desactivar módulo "{flag.name}"
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Esta acción afecta a todos los gimnasios de la plataforma.
            </p>
          </div>
        </div>

        {/* Impact */}
        {impact && (
          <div className="mx-6 mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-sm text-amber-800 leading-relaxed">
              <span className="font-semibold">Impacto visible:</span> {impact}
            </p>
            <p className="text-xs text-amber-600 mt-2">
              Los datos de los usuarios se conservan. Al reactivar el módulo todo reaparecerá sin pérdida de información.
            </p>
          </div>
        )}

        <div className="mx-6 mb-6 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            Puedes reactivarlo en cualquier momento desde esta misma pantalla.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-10 rounded-xl text-sm font-semibold text-white',
              'bg-amber-500 hover:bg-amber-600 disabled:opacity-50',
              'flex items-center justify-center gap-2',
            )}
            style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
            onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Desactivar de todas formas'
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  )
}

// ── Create form ───────────────────────────────────────────────────────────────

interface CreateFormProps {
  onSave:   () => void
  onCancel: () => void
}

function CreateFlagForm({ onSave, onCancel }: CreateFormProps) {
  const [form, setForm]     = useState({ name: '', code: '', description: '', is_active_globally: false })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/system/feature-flags/', form)
      onSave()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Nuevo módulo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nombre</label>
              <input
                required
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Ej. Clases grupales"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Código</label>
              <input
                required
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Ej. clases_grupales"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Descripción</label>
            <input
              className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Qué controla este módulo"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear módulo
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ModulosPage() {
  const [flags, setFlags]         = useState<FeatureFlag[]>([])
  const [loading, setLoading]     = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<FeatureFlag | null>(null)
  const [toggling, setToggling]   = useState(false)

  async function fetchFlags() {
    try {
      const res = await api.get('/api/system/feature-flags/')
      setFlags((res as any).results || res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFlags() }, [])

  async function handleToggle(flag: FeatureFlag) {
    // Activating → no confirmation needed, toggle immediately
    if (!flag.is_active_globally) {
      try {
        await api.patch(`/api/system/feature-flags/${flag.id}/`, { is_active_globally: true })
        fetchFlags()
      } catch (err) {
        console.error(err)
      }
      return
    }
    // Deactivating → show confirmation modal
    setPendingToggle(flag)
  }

  async function confirmDeactivate() {
    if (!pendingToggle) return
    setToggling(true)
    try {
      await api.patch(`/api/system/feature-flags/${pendingToggle.id}/`, { is_active_globally: false })
      setPendingToggle(null)
      fetchFlags()
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este módulo permanentemente?')) return
    try {
      await api.delete(`/api/system/feature-flags/${id}/`)
      fetchFlags()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Módulos</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Activa o desactiva funcionalidades en toda la plataforma.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(v => !v)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), background-color 150ms' }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
        >
          <Plus className="w-4 h-4" />
          Nuevo módulo
        </button>
      </div>

      {/* Create form */}
      {isCreating && (
        <CreateFlagForm
          onSave={() => { setIsCreating(false); fetchFlags() }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Flags list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : flags.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <ToggleLeft className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Sin módulos configurados</p>
          <p className="text-xs text-slate-400">Crea el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map(flag => (
            <div
              key={flag.id}
              className="bg-white border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm"
              style={{ transition: 'box-shadow 150ms' }}
            >
              <div className={cn(
                'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200',
                flag.is_active_globally ? 'bg-emerald-50' : 'bg-slate-100',
              )}>
                <ToggleLeft className={cn(
                  'w-4 h-4 transition-colors duration-200',
                  flag.is_active_globally ? 'text-emerald-500' : 'text-slate-400',
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{flag.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-500">
                    {flag.code}
                  </span>
                </div>
                {flag.description && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{flag.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <Switch
                    checked={flag.is_active_globally}
                    onCheckedChange={() => handleToggle(flag)}
                  />
                  <span className={cn(
                    'text-[10px] font-bold tracking-wide',
                    flag.is_active_globally ? 'text-emerald-600' : 'text-slate-400',
                  )}>
                    {flag.is_active_globally ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(flag.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  style={{ transition: 'transform 150ms cubic-bezier(0.23,1,0.32,1), color 150ms, background-color 150ms' }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deactivation confirmation modal */}
      {pendingToggle && (
        <DeactivateModal
          flag={pendingToggle}
          onCancel={() => setPendingToggle(null)}
          onConfirm={confirmDeactivate}
          loading={toggling}
        />
      )}
    </div>
  )
}
