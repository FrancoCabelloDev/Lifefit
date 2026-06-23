'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, Utensils, Dumbbell, Trophy, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'

interface PointsConfig {
  id: string
  nutrition_week_points: number
  workout_week_points: number
  challenge_points: number
  updated_at: string
}

interface ConfigRow {
  key: keyof Omit<PointsConfig, 'id' | 'updated_at'>
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const CONFIG_ROWS: ConfigRow[] = [
  {
    key: 'nutrition_week_points',
    label: 'Semana de nutrición aprobada',
    description: 'Puntos otorgados cuando el nutricionista aprueba la semana de un atleta',
    icon: Utensils,
    color: 'text-emerald-500',
  },
  {
    key: 'workout_week_points',
    label: 'Semana de entrenamiento completada',
    description: 'Puntos otorgados al completar una semana de rutinas',
    icon: Dumbbell,
    color: 'text-blue-500',
  },
  {
    key: 'challenge_points',
    label: 'Reto completado',
    description: 'Puntos base otorgados al completar un reto del gimnasio',
    icon: Trophy,
    color: 'text-amber-500',
  },
]

export default function ConfiguracionPuntosPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const queryClient = useQueryClient()

  const { data: config, isLoading } = useQuery({
    queryKey: ['points-config', gymId],
    queryFn: () => api.get<PointsConfig>(`/api/gamification/${gymId}/points-config/`),
  })

  const [draft, setDraft] = useState<Partial<PointsConfig>>({})

  const getValue = (key: keyof Omit<PointsConfig, 'id' | 'updated_at'>) =>
    draft[key] !== undefined ? draft[key] : config?.[key] ?? 0

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch<PointsConfig>(`/api/gamification/${gymId}/points-config/`, draft),
    onSuccess: (updated) => {
      queryClient.setQueryData(['points-config', gymId], updated)
      setDraft({})
      showSuccess('Configuración guardada')
    },
    onError: (err) => showError(err, 'Error al guardar'),
  })

  const hasChanges = Object.keys(draft).length > 0

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurar Puntos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define cuántos puntos gana un atleta por cada acción completada en tu gimnasio.
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-emerald-600/20"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar cambios
          </button>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Settings2 className="w-5 h-5 text-slate-400" />
            Acciones y puntos
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {CONFIG_ROWS.map(({ key, label, description, icon: Icon, color }) => (
            <div key={key} className="py-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={getValue(key) as number}
                  onChange={(e) => setDraft(d => ({ ...d, [key]: parseInt(e.target.value) || 0 }))}
                  className="w-20 text-right text-base font-bold text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                />
                <span className="text-xs font-medium text-slate-500">pts</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Los cambios aplican a partir de la próxima acción completada. Las semanas ya aprobadas no se recalculan.
      </p>
    </div>
  )
}
