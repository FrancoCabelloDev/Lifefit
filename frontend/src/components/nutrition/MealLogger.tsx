'use client'

import { useRef, useState } from 'react'
import { Camera, CheckCircle2, ChevronDown, ChevronUp, Clock, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { showError } from '@/lib/toast'
import { toast } from 'sonner'
import type { MealTemplate } from '@/lib/types'

export type MealLogStatus = 'completed' | 'skipped' | 'alternative'

export type MealLogEntry = {
  id?: string
  meal_template: string
  status: MealLogStatus
  alternative_food_text?: string
  photo_url?: string | null
  nutritionist_approved?: boolean | null
  nutritionist_notes?: string
}

interface MealLoggerProps {
  meals: MealTemplate[]
  date: string
  onRefresh: () => void
  logs: MealLogEntry[]
}

const MEAL_TIMES: Record<string, string> = {
  breakfast:       '7:00',
  mid_morning:     '10:00',
  lunch:           '13:00',
  afternoon_snack: '16:00',
  dinner:          '19:00',
  late_snack:      '21:00',
  snack:           '—',
}

const STATUS_STYLES = {
  completed:   { accent: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700',  label: 'Completado' },
  skipped:     { accent: 'border-l-amber-400',   badge: 'bg-amber-50 text-amber-700',      label: 'Saltado' },
  alternative: { accent: 'border-l-blue-400',    badge: 'bg-blue-50 text-blue-700',        label: 'Comí otra cosa' },
} as const

export default function MealLogger({ meals, date, onRefresh, logs }: MealLoggerProps) {
  const [updating, setUpdating]     = useState<string | null>(null)
  const [uploading, setUploading]   = useState<string | null>(null)
  const [altText, setAltText]       = useState<Record<string, string>>({})
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({})
  const fileInputRefs               = useRef<Record<string, HTMLInputElement | null>>({})

  const uploadPhoto = async (logId: string, mealId: string, file: File) => {
    setUploading(mealId)
    try {
      const form = new FormData()
      form.append('photo', file)
      await api.post(`/api/nutrition/meal-logs/${logId}/upload-photo/`, form)
      toast.success('Foto enviada. Tu nutricionista la revisará pronto.')
      onRefresh()
    } catch (err) {
      showError(err, 'Error al subir la foto')
    } finally {
      setUploading(null)
    }
  }

  const handleFileChange = (logId: string, mealId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadPhoto(logId, mealId, file)
    e.target.value = ''
  }

  const getLog = (id: string) => logs.find(l => l.meal_template === id)

  const updateStatus = async (mealId: string, newStatus: MealLogStatus, text = '') => {
    setUpdating(mealId)
    try {
      await api.post('/api/nutrition/meal-logs/update_status/', {
        meal_template_id: mealId,
        date,
        status: newStatus,
        alternative_food_text: newStatus === 'alternative' ? text : '',
      })
      onRefresh()
    } catch (err) {
      showError(err, 'Error al actualizar')
    } finally {
      setUpdating(null)
    }
  }

  const handleStatus = (mealId: string, newStatus: MealLogStatus) => {
    const cur = getLog(mealId)?.status
    // Tap same → deselect (reset to completed so log exists but neutral-ish)
    updateStatus(mealId, cur === newStatus ? 'completed' : newStatus, altText[mealId] ?? '')
  }

  return (
    <div className="space-y-3">
      {meals.map(meal => {
        const log              = getLog(meal.id)
        const status           = log?.status ?? null
        const style            = status ? STATUS_STYLES[status] : null
        const isUpdating       = updating === meal.id
        const isUploading      = uploading === meal.id
        const isExpanded       = expanded[meal.id] ?? false
        const foodItems: any[] = (meal as any).food_items ?? []
        const totalCal         = foodItems.reduce((s: number, fi: any) => s + parseFloat(fi.calories ?? 0), 0)
        const canUploadPhoto   = status === 'completed' && !!log?.id
        const approvalStatus   = log?.nutritionist_approved

        return (
          <div
            key={meal.id}
            className={cn(
              'bg-white rounded-2xl border border-slate-200 border-l-4 overflow-hidden transition-all duration-150',
              style ? style.accent : 'border-l-slate-200',
            )}
          >
            <div className="px-5 py-4">
              {/* ── Header row ── */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Type + time */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {meal.meal_type_display}
                    </span>
                    <span className="text-slate-200">·</span>
                    <span className="text-xs text-slate-400">{MEAL_TIMES[meal.meal_type]}</span>
                    {style && (
                      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full ml-1', style.badge)}>
                        {style.label}
                      </span>
                    )}
                  </div>

                  {/* Meal name */}
                  <p className="text-[15px] font-semibold text-slate-800 leading-snug">{meal.name}</p>

                  {/* Description */}
                  {meal.description && (
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{meal.description}</p>
                  )}
                </div>

                {/* Calorie pill */}
                {(totalCal > 0 || meal.calories > 0) && (
                  <span className="shrink-0 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1">
                    {Math.round(totalCal || meal.calories)} kcal
                  </span>
                )}
              </div>

              {/* ── Macros row ── */}
              {(meal.protein_g > 0 || meal.carbs_g > 0 || meal.fats_g > 0) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-sm text-slate-500">
                  <span><span className="font-medium text-slate-700">{meal.protein_g}g</span> proteína</span>
                  <span><span className="font-medium text-slate-700">{meal.carbs_g}g</span> carbos</span>
                  <span><span className="font-medium text-slate-700">{meal.fats_g}g</span> grasa</span>
                </div>
              )}

              {/* ── Ingredients toggle ── */}
              {foodItems.length > 0 && (
                <>
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [meal.id]: !p[meal.id] }))}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-3 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Ocultar ingredientes' : `Ver ${foodItems.length} ingrediente${foodItems.length > 1 ? 's' : ''}`}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 rounded-xl bg-slate-50 divide-y divide-slate-100 overflow-hidden">
                      {foodItems.map((fi: any) => (
                        <div key={fi.id} className="flex items-center justify-between px-3 py-2">
                          <span className="text-sm text-slate-700">{fi.food_name}</span>
                          <span className="text-xs text-slate-400">
                            {parseFloat(fi.quantity_g).toFixed(0)}g &nbsp;·&nbsp; {Math.round(parseFloat(fi.calories))} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Alternative text display */}
              {status === 'alternative' && log?.alternative_food_text && (
                <p className="mt-2 text-sm text-blue-600 italic">"{log.alternative_food_text}"</p>
              )}

              {/* ── Action buttons ── */}
              <div className="flex flex-wrap gap-2 mt-4">
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <>
                    <ActionBtn
                      active={status === 'completed'}
                      onClick={() => handleStatus(meal.id, 'completed')}
                      activeClass="bg-emerald-600 text-white border-emerald-600"
                      inactiveClass="text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Completado
                    </ActionBtn>
                    <ActionBtn
                      active={status === 'skipped'}
                      onClick={() => handleStatus(meal.id, 'skipped')}
                      activeClass="bg-amber-500 text-white border-amber-500"
                      inactiveClass="text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700"
                    >
                      Saltar
                    </ActionBtn>
                    <ActionBtn
                      active={status === 'alternative'}
                      onClick={() => handleStatus(meal.id, 'alternative')}
                      activeClass="bg-blue-600 text-white border-blue-600"
                      inactiveClass="text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                    >
                      Comí otra cosa
                    </ActionBtn>
                  </>
                )}
              </div>
            </div>

            {/* ── Alternative input panel ── */}
            {status === 'alternative' && (
              <div className="px-5 py-4 bg-blue-50 border-t border-blue-100">
                <label className="block text-sm font-medium text-blue-800 mb-2">¿Qué comiste en su lugar?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={altText[meal.id] ?? log?.alternative_food_text ?? ''}
                    onChange={e => setAltText(p => ({ ...p, [meal.id]: e.target.value }))}
                    placeholder="Ej: Ensalada con atún, fruta de temporada..."
                    className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400"
                  />
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(meal.id, 'alternative', altText[meal.id] ?? '')}
                    className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* ── Evidencia fotográfica ── */}
            {canUploadPhoto && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {approvalStatus === true && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verificado por nutricionista
                      </span>
                    )}
                    {approvalStatus === false && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" />
                        {log?.nutritionist_notes ? `Rechazado: ${log.nutritionist_notes}` : 'Rechazado — vuelve a subir foto'}
                      </span>
                    )}
                    {approvalStatus === null && log?.photo_url && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Pendiente de revisión
                      </span>
                    )}
                    {!log?.photo_url && (
                      <span className="text-xs text-slate-400">Sin evidencia fotográfica</span>
                    )}
                  </div>

                  {approvalStatus !== true && (
                    <>
                      <input
                        ref={el => { fileInputRefs.current[meal.id] = el }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange(log!.id!, meal.id)}
                      />
                      <button
                        disabled={isUploading}
                        onClick={() => fileInputRefs.current[meal.id]?.click()}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                        {log?.photo_url ? 'Cambiar foto' : 'Subir evidencia'}
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail de la foto subida */}
                {log?.photo_url && (
                  <div className="mt-2.5">
                    <img
                      src={log.photo_url}
                      alt="Evidencia de comida"
                      className="h-24 w-auto rounded-xl object-cover border border-slate-200"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── ActionBtn ─────────────────────────────────────────────────────────────

function ActionBtn({
  active, onClick, activeClass, inactiveClass, children,
}: {
  active: boolean
  onClick: () => void
  activeClass: string
  inactiveClass: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-xl text-sm font-medium border transition-all duration-150 active:scale-95',
        active ? activeClass : inactiveClass,
      )}
    >
      {children}
    </button>
  )
}
