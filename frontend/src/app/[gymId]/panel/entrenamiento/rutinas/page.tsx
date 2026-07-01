'use client'

import { useEffect, useState, use } from 'react'
import {
  Dumbbell, Plus, Search, Loader2, Edit, Trash2,
  Clock, List, Layers, ChevronDown, ChevronUp,
  X, GripVertical, CheckCircle2, Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { showError, showSuccess } from '@/lib/toast'
import { levelColors, levelLabels, routineStatusColors, routineStatusLabels } from '@/lib/constants'
import type { WorkoutRoutine, RoutineExercise, Exercise, PaginatedResponse } from '@/lib/types'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExerciseConfig {
  sets: number
  reps: number
  rest_seconds: number
  weight_kg: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
]
const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived',  label: 'Archivado' },
]

// ── Exercise row in the manager panel ─────────────────────────────────────────

function ExerciseRow({
  exercise,
  config,
  isAdded,
  onToggle,
  onUpdate,
  onAddNow,
}: {
  exercise: Exercise
  config: ExerciseConfig | undefined
  isAdded: boolean
  onToggle: () => void
  onUpdate: (field: string, value: number) => void
  onAddNow: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-150',
        isAdded ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
          isAdded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
        )}>
          <Dumbbell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{exercise.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{[exercise.muscle_group, exercise.equipment].filter(Boolean).join(' · ') || 'Sin categoría'}</p>
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
          isAdded ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300',
        )}>
          {isAdded && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
      </button>

      {isAdded && config && (
        <div className="px-4 pb-4 space-y-3" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-4 gap-2">
            {([
              { key: 'sets',         label: 'Series',    min: 1 },
              { key: 'reps',         label: 'Reps',      min: 1 },
              { key: 'rest_seconds', label: 'Desc. (s)', min: 0 },
              { key: 'weight_kg',    label: 'Peso (kg)', min: 0 },
            ] as const).map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{f.label}</label>
                <Input
                  type="number"
                  min={f.min}
                  step={f.key === 'weight_kg' ? 0.5 : 1}
                  value={config[f.key]}
                  onChange={e => onUpdate(f.key, parseFloat(e.target.value) || 0)}
                  className="h-9 rounded-xl text-sm border-slate-200"
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onAddNow}
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            Confirmar ejercicio
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Exercise Manager Panel (for existing routines) ────────────────────────────

function ExerciseManagerPanel({
  routine,
  gymId,
  onClose,
}: {
  routine: WorkoutRoutine
  gymId: string
  onClose: () => void
}) {
  const [existing, setExisting]           = useState<RoutineExercise[]>([])
  const [available, setAvailable]         = useState<Exercise[]>([])
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [removing, setRemoving]           = useState<string | null>(null)
  const [staged, setStaged]               = useState<Record<string, ExerciseConfig>>({})

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<RoutineExercise>>('/api/workouts/routine-exercises/', { params: { routine: routine.id } })
        .then(r => Array.isArray(r) ? r : r.results ?? []),
      api.get<PaginatedResponse<Exercise>>('/api/workouts/exercises/', { params: { gym: gymId } })
        .then(r => Array.isArray(r) ? r : r.results ?? []),
    ]).then(([ex, av]) => {
      setExisting(ex)
      setAvailable(av)
    }).catch(e => showError(e, 'Error al cargar ejercicios')).finally(() => setLoading(false))
  }, [routine.id, gymId])

  const existingIds = new Set(existing.map(re => re.exercise_detail?.id ?? (re.exercise as any)?.id ?? re.exercise))

  const handleRemove = async (reId: string) => {
    setRemoving(reId)
    try {
      await api.delete(`/api/workouts/routine-exercises/${reId}/`)
      setExisting(prev => prev.filter(re => re.id !== reId))
      showSuccess('Ejercicio eliminado')
    } catch (e) {
      showError(e, 'Error al eliminar')
    } finally {
      setRemoving(null)
    }
  }

  const handleToggleStaged = (exerciseId: string) => {
    setStaged(prev => {
      if (prev[exerciseId]) {
        const next = { ...prev }
        delete next[exerciseId]
        return next
      }
      return { ...prev, [exerciseId]: { sets: 3, reps: 10, rest_seconds: 60, weight_kg: 0 } }
    })
  }

  const handleUpdateStaged = (exerciseId: string, field: string, value: number) => {
    setStaged(prev => ({ ...prev, [exerciseId]: { ...prev[exerciseId], [field]: value } }))
  }

  const handleConfirmAdd = async (exerciseId: string) => {
    const cfg = staged[exerciseId]
    if (!cfg) return
    try {
      const created = await api.post<RoutineExercise>('/api/workouts/routine-exercises/', {
        routine: routine.id,
        exercise: exerciseId,
        sets: cfg.sets,
        reps: cfg.reps,
        rest_seconds: cfg.rest_seconds,
        weight_kg: cfg.weight_kg || null,
      })
      setExisting(prev => [...prev, created])
      setStaged(prev => {
        const next = { ...prev }
        delete next[exerciseId]
        return next
      })
      showSuccess('Ejercicio agregado')
    } catch (e) {
      showError(e, 'Error al agregar')
    }
  }

  const filteredAvailable = available.filter(ex =>
    !existingIds.has(ex.id) &&
    (ex.name.toLowerCase().includes(search.toLowerCase()) ||
     ex.muscle_group?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-bold text-slate-900">Ejercicios de rutina</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">{routine.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Current exercises */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-3">
                En esta rutina ({existing.length})
              </p>
              {existing.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin ejercicios aún</p>
              ) : (
                <div className="space-y-2">
                  {existing.map(re => {
                    const exName = re.exercise_detail?.name ?? (re.exercise as any)?.name ?? '—'
                    return (
                      <div
                        key={re.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{exName}</p>
                          <p className="text-[11px] text-slate-400">
                            {re.sets}×{re.reps} · {re.rest_seconds}s desc.
                            {re.weight_kg ? ` · ${re.weight_kg}kg` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(re.id)}
                          disabled={removing === re.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                        >
                          {removing === re.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Add from catalog */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs font-bold text-slate-500">Agregar ejercicio</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar ejercicio..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-slate-200 text-sm"
                />
              </div>
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  {available.length === 0
                    ? 'No hay ejercicios en el catálogo. Créalos en Ejercicios.'
                    : 'Todos los ejercicios ya están agregados.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAvailable.map(ex => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      config={staged[ex.id]}
                      isAdded={!!staged[ex.id]}
                      onToggle={() => handleToggleStaged(ex.id)}
                      onUpdate={(f, v) => handleUpdateStaged(ex.id, f, v)}
                      onAddNow={() => handleConfirmAdd(ex.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RoutinesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  useRoleGuard(gymId, ['coach'])

  const [routines, setRoutines]     = useState<WorkoutRoutine[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [filterLevel, setFilterLevel]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [managingRoutine, setManagingRoutine] = useState<WorkoutRoutine | null>(null)

  // ── Create/Edit modal ─────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null)
  const [formData, setFormData] = useState({
    name: '', objective: '', level: 'beginner',
    duration_minutes: 30, points_reward: 100, status: 'draft', is_public: false,
  })

  // ── New-routine exercise step ─────────────────────────────────────────────
  const [step, setStep]                   = useState<'form' | 'exercises'>('form')
  const [createdRoutineId, setCreatedRoutineId] = useState<string | null>(null)
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [staged, setStaged] = useState<Record<string, ExerciseConfig>>({})
  const [exSearch, setExSearch] = useState('')

  useEffect(() => { fetchRoutines() }, [])

  const fetchRoutines = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<PaginatedResponse<WorkoutRoutine>>('/api/workouts/routines/', { params: { gym: gymId } })
      setRoutines(Array.isArray(data) ? data : data.results ?? [])
    } catch { /* silent */ } finally { setIsLoading(false) }
  }

  const fetchExercises = async () => {
    try {
      const data = await api.get<PaginatedResponse<Exercise>>('/api/workouts/exercises/', { params: { gym: gymId } })
      setAvailableExercises(Array.isArray(data) ? data : data.results ?? [])
    } catch { /* silent */ }
  }

  const resetForm = () => {
    setFormData({ name: '', objective: '', level: 'beginner', duration_minutes: 30, points_reward: 100, status: 'draft', is_public: false })
    setEditingRoutine(null); setStep('form'); setCreatedRoutineId(null); setStaged({}); setExSearch('')
  }

  const openCreateModal = () => { resetForm(); setIsModalOpen(true) }
  const openEditModal = (routine: WorkoutRoutine) => {
    setEditingRoutine(routine)
    setFormData({ name: routine.name, objective: routine.objective, level: routine.level, duration_minutes: routine.duration_minutes, points_reward: routine.points_reward, status: routine.status, is_public: routine.is_public ?? false })
    setStep('form'); setCreatedRoutineId(null); setStaged({}); setExSearch('')
    setIsModalOpen(true)
  }

  const handleSubmitRoutine = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { points_reward, ...coachPayload } = formData
      if (editingRoutine) {
        await api.patch(`/api/workouts/routines/${editingRoutine.id}/`, coachPayload)
        showSuccess('Rutina actualizada')
        setIsModalOpen(false); resetForm(); fetchRoutines()
      } else {
        const created: any = await api.post('/api/workouts/routines/', coachPayload)
        setCreatedRoutineId(created.id); setStep('exercises'); fetchExercises()
      }
    } catch (e: any) {
      showError(e, 'Error al guardar rutina')
    } finally { setIsSubmitting(false) }
  }

  const handleToggleStaged = (exerciseId: string) => {
    setStaged(prev => {
      if (prev[exerciseId]) { const next = { ...prev }; delete next[exerciseId]; return next }
      return { ...prev, [exerciseId]: { sets: 3, reps: 10, rest_seconds: 60, weight_kg: 0 } }
    })
  }
  const handleUpdateStaged = (exerciseId: string, field: string, value: number) => {
    setStaged(prev => ({ ...prev, [exerciseId]: { ...prev[exerciseId], [field]: value } }))
  }
  const handleConfirmAddToNew = async (exerciseId: string) => {
    const cfg = staged[exerciseId]
    if (!cfg || !createdRoutineId) return
    try {
      await api.post('/api/workouts/routine-exercises/', { routine: createdRoutineId, exercise: exerciseId, sets: cfg.sets, reps: cfg.reps, rest_seconds: cfg.rest_seconds, weight_kg: cfg.weight_kg || null })
      setStaged(prev => { const next = { ...prev }; delete next[exerciseId]; return next })
      showSuccess('Ejercicio agregado')
    } catch (e: any) { showError(e, 'Error al agregar') }
  }
  const handleFinishRoutine = () => { setIsModalOpen(false); resetForm(); fetchRoutines() }
  const handleDelete = async (routine: WorkoutRoutine) => {
    if (!confirm(`¿Eliminar la rutina "${routine.name}"?`)) return
    try {
      await api.delete(`/api/workouts/routines/${routine.id}/`)
      showSuccess('Rutina eliminada')
      fetchRoutines()
    } catch (e: any) { showError(e, 'Error al eliminar rutina') }
  }

  const filteredRoutines = routines.filter(r => {
    if (filterLevel !== 'all' && r.level !== filterLevel) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  const filteredAvailable = availableExercises.filter(ex =>
    !staged[ex.id] &&
    (ex.name.toLowerCase().includes(exSearch.toLowerCase()) ||
     ex.muscle_group?.toLowerCase().includes(exSearch.toLowerCase()))
  )

  return (
    <div className="space-y-6 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rutinas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Crea y organiza las rutinas de tus atletas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-36 rounded-xl border-slate-200 h-10 bg-white text-sm">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-1.5">
              <SelectItem value="all" className="rounded-xl py-2.5 cursor-pointer text-sm">Todos los niveles</SelectItem>
              {LEVEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="rounded-xl py-2.5 cursor-pointer text-sm">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 rounded-xl border-slate-200 h-10 bg-white text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-1.5">
              <SelectItem value="all" className="rounded-xl py-2.5 cursor-pointer text-sm">Todos</SelectItem>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="rounded-xl py-2.5 cursor-pointer text-sm">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 rounded-xl gap-2 shadow-sm transition-all active:scale-[0.97] font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Rutina
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-600">Sin rutinas</p>
            <p className="text-sm text-slate-400 mt-1">Crea tu primera rutina para empezar</p>
          </div>
          <Button onClick={openCreateModal} variant="outline" className="rounded-xl h-10 px-6 border-slate-200 text-sm font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Crear primera rutina
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRoutines.map(routine => {
            const exerciseCount = routine.routine_exercises?.length ?? 0
            const isExpanded = expandedCard === routine.id
            return (
              <div
                key={routine.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{routine.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-semibold border', levelColors[routine.level])}>
                          {levelLabels[routine.level] ?? routine.level}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-semibold border', routineStatusColors[routine.status])}>
                          {routineStatusLabels[routine.status] ?? routine.status}
                        </Badge>
                        {routine.is_public && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold border bg-blue-50 text-blue-700 border-blue-100">Pública</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {routine.objective && (
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{routine.objective}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{routine.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><List className="w-3.5 h-3.5" />{exerciseCount} ej.</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setExpandedCard(isExpanded ? null : routine.id)}
                      className="h-8 px-3 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium"
                    >
                      {isExpanded ? <><ChevronUp className="w-3.5 h-3.5 mr-1" />Ocultar</> : <><ChevronDown className="w-3.5 h-3.5 mr-1" />Ver ejercicios</>}
                    </Button>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setManagingRoutine(routine)}
                        className="h-8 px-3 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl font-semibold"
                        title="Gestionar ejercicios"
                      >
                        <Settings2 className="w-3.5 h-3.5 mr-1" />Ejercicios
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => openEditModal(routine)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                        title="Editar rutina"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDelete(routine)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                        title="Eliminar rutina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Exercise list (expanded) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60">
                    {exerciseCount === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2">
                        <p className="text-xs text-slate-400">Sin ejercicios configurados</p>
                        <button
                          onClick={() => setManagingRoutine(routine)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                        >
                          Agregar ejercicios
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {routine.routine_exercises.map((re, i) => (
                          <div key={re.id} className="flex items-center gap-3 px-5 py-3">
                            <span className="text-xs font-bold text-slate-400 w-5 text-center tabular-nums">{i + 1}</span>
                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                              <Dumbbell className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">{re.exercise_detail?.name ?? (re.exercise as any)?.name ?? '—'}</p>
                              <p className="text-xs text-slate-400">{re.sets}×{re.reps} · {re.rest_seconds}s</p>
                            </div>
                            {re.weight_kg && (
                              <span className="text-xs text-slate-400 font-medium shrink-0">{re.weight_kg}kg</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create/Edit dialog ── */}
      <Dialog open={isModalOpen} onOpenChange={open => { if (!open) { resetForm(); setIsModalOpen(false) } else setIsModalOpen(true) }}>
        <DialogContent className={cn('bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden', step === 'exercises' ? 'sm:max-w-[560px]' : 'sm:max-w-[420px]')}>
          {step === 'form' ? (
            <>
              <div className="bg-emerald-600 px-7 py-6 text-white">
                <DialogTitle className="text-xl font-bold">{editingRoutine ? 'Editar rutina' : 'Nueva rutina'}</DialogTitle>
                <DialogDescription className="text-emerald-100/80 text-sm mt-0.5">
                  {editingRoutine ? 'Modifica los datos de la rutina.' : 'Define los detalles de la rutina.'}
                </DialogDescription>
              </div>
              <form onSubmit={handleSubmitRoutine} className="px-7 py-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Nombre</Label>
                  <Input required placeholder="Full Body Intensivo" className="rounded-xl h-10 border-slate-200 text-sm" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Objetivo</Label>
                  <Textarea placeholder="Describe el objetivo de la rutina..." className="rounded-xl border-slate-200 text-sm min-h-[70px] resize-none" value={formData.objective} onChange={e => setFormData(f => ({ ...f, objective: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Nivel</Label>
                    <Select value={formData.level} onValueChange={v => setFormData(f => ({ ...f, level: v }))}>
                      <SelectTrigger className="rounded-xl h-10 border-slate-200 bg-white text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-1.5">
                        {LEVEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="rounded-xl py-2 cursor-pointer text-sm">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Estado</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="rounded-xl h-10 border-slate-200 bg-white text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-1.5">
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="rounded-xl py-2 cursor-pointer text-sm">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Duración (min)</Label>
                    <Input type="number" min={1} className="rounded-xl h-10 border-slate-200 text-sm" value={formData.duration_minutes} onChange={e => setFormData(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, is_public: !f.is_public }))}
                  className={cn('w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors text-left', formData.is_public ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300')}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Rutina pública</p>
                    <p className="text-xs text-slate-400">Visible para todos los atletas</p>
                  </div>
                  <div className={cn('w-9 h-5 rounded-full flex items-center transition-colors', formData.is_public ? 'bg-emerald-500' : 'bg-slate-200')}>
                    <div className={cn('w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-0.5', formData.is_public ? 'translate-x-4' : 'translate-x-0')} />
                  </div>
                </button>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" className="flex-1 h-11 rounded-xl text-slate-500 hover:bg-slate-50 font-semibold" onClick={() => { resetForm(); setIsModalOpen(false) }}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRoutine ? 'Guardar cambios' : 'Crear rutina →'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="bg-emerald-600 px-7 py-6 text-white">
                <DialogTitle className="text-xl font-bold">Agregar ejercicios</DialogTitle>
                <DialogDescription className="text-emerald-100/80 text-sm mt-0.5">Selecciona los ejercicios para esta rutina.</DialogDescription>
              </div>
              <div className="px-7 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
                {availableExercises.length === 0 ? (
                  <div className="text-center py-10">
                    <Dumbbell className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Sin ejercicios en el catálogo</p>
                    <p className="text-xs text-slate-400 mt-1">Ve a Ejercicios para crear el catálogo primero.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="Buscar ejercicio..." value={exSearch} onChange={e => setExSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-slate-200 text-sm" />
                    </div>
                    <div className="space-y-2">
                      {filteredAvailable.map(ex => (
                        <ExerciseRow
                          key={ex.id}
                          exercise={ex}
                          config={staged[ex.id]}
                          isAdded={!!staged[ex.id]}
                          onToggle={() => handleToggleStaged(ex.id)}
                          onUpdate={(f, v) => handleUpdateStaged(ex.id, f, v)}
                          onAddNow={() => handleConfirmAddToNew(ex.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="px-7 pb-6">
                <Button onClick={handleFinishRoutine} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                  Finalizar rutina
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Exercise manager side panel ── */}
      {managingRoutine && (
        <ExerciseManagerPanel
          routine={managingRoutine}
          gymId={gymId}
          onClose={() => { setManagingRoutine(null); fetchRoutines() }}
        />
      )}
    </div>
  )
}
