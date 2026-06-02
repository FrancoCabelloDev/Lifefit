'use client'

import { useEffect, useState, use } from 'react'
import {
  Dumbbell,
  Plus,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Award,
  List,
  Layers,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { api } from '@/lib/api'
import type { User, WorkoutRoutine, RoutineExercise, Exercise, PaginatedResponse } from '@/lib/types'

const levelColors: Record<string, string> = {
  beginner: 'bg-green-50 text-green-700 border-green-100',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-100',
  advanced: 'bg-rose-50 text-rose-700 border-rose-100',
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  archived: 'bg-red-50 text-red-700 border-red-100',
}

const levelLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
}

export default function RoutinesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams

  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    level: 'beginner',
    duration_minutes: 30,
    points_reward: 100,
    status: 'draft',
  })

  const [step, setStep] = useState<'form' | 'exercises'>('form')
  const [createdRoutineId, setCreatedRoutineId] = useState<string | null>(null)
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [selectedExercises, setSelectedExercises] = useState<Record<string, { sets: number; reps: number; rest_seconds: number; weight_kg: number }>>({})

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignRoutine, setAssignRoutine] = useState<WorkoutRoutine | null>(null)
  const [athletes, setAthletes] = useState<User[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    fetchRoutines()
  }, [])

  const fetchRoutines = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<PaginatedResponse<WorkoutRoutine>>("/api/workouts/routines/", {
        params: { gym: gymId }
      })
      setRoutines(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching routines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExercises = async () => {
    try {
      const data = await api.get<PaginatedResponse<Exercise>>("/api/workouts/exercises/", {
        params: { gym: gymId }
      })
      setAvailableExercises(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const openAssignDialog = async (routine: WorkoutRoutine) => {
    setAssignRoutine(routine)
    setSelectedAthleteId('')
    setAssignDialogOpen(true)
    try {
      const data = await api.get<PaginatedResponse<User>>("/api/auth/gym-members/", {
        params: { role: 'athlete' }
      })
      setAthletes(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching athletes:', error)
    }
  }

  const handleAssignRoutine = async () => {
    if (!assignRoutine || !selectedAthleteId) return
    try {
      setIsAssigning(true)
      await api.post(`/api/workouts/routines/${assignRoutine.id}/assign_to_user/`, {
        user_id: selectedAthleteId,
      })
      setAssignDialogOpen(false)
      setAssignRoutine(null)
      setSelectedAthleteId('')
    } catch (error: any) {
      alert(error?.message || 'Error al asignar rutina')
    } finally {
      setIsAssigning(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', objective: '', level: 'beginner', duration_minutes: 30, points_reward: 100, status: 'draft' })
    setEditingRoutine(null)
    setStep('form')
    setCreatedRoutineId(null)
    setSelectedExercises({})
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (routine: WorkoutRoutine) => {
    setEditingRoutine(routine)
    setFormData({
      name: routine.name,
      objective: routine.objective,
      level: routine.level,
      duration_minutes: routine.duration_minutes,
      points_reward: routine.points_reward,
      status: routine.status,
    })
    setStep('form')
    setCreatedRoutineId(null)
    setSelectedExercises({})
    setIsModalOpen(true)
  }

  const handleSubmitRoutine = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      if (editingRoutine) {
        await api.patch(`/api/workouts/routines/${editingRoutine.id}/`, { ...formData, gym: gymId })
        setIsModalOpen(false)
        resetForm()
        fetchRoutines()
      } else {
        const created: any = await api.post("/api/workouts/routines/", { ...formData, gym: gymId })
        setCreatedRoutineId(created.id)
        setStep('exercises')
        fetchExercises()
      }
    } catch (error: any) {
      alert(error?.message || 'Error al guardar rutina')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddExerciseToRoutine = async (exerciseId: string) => {
    const data = selectedExercises[exerciseId]
    if (!data) return
    try {
      await api.post("/api/workouts/routine-exercises/", {
        routine: createdRoutineId,
        exercise: exerciseId,
        sets: data.sets,
        reps: data.reps,
        rest_seconds: data.rest_seconds,
        weight_kg: data.weight_kg || null,
      })
      setSelectedExercises((prev) => {
        const next = { ...prev }
        delete next[exerciseId]
        return next
      })
    } catch (error: any) {
      alert(error?.message || 'Error al agregar ejercicio')
    }
  }

  const handleFinishRoutine = () => {
    setIsModalOpen(false)
    resetForm()
    fetchRoutines()
  }

  const handleDelete = async (routine: WorkoutRoutine) => {
    if (!confirm(`¿Eliminar la rutina "${routine.name}"?`)) return
    try {
      await api.delete(`/api/workouts/routines/${routine.id}/`)
      fetchRoutines()
    } catch (error: any) {
      alert(error?.message || 'Error al eliminar rutina')
    }
  }

  const toggleExerciseSelect = (exerciseId: string) => {
    setSelectedExercises((prev) => {
      if (prev[exerciseId]) {
        const next = { ...prev }
        delete next[exerciseId]
        return next
      }
      return { ...prev, [exerciseId]: { sets: 3, reps: 10, rest_seconds: 60, weight_kg: 0 } }
    })
  }

  const updateExerciseData = (exerciseId: string, field: string, value: number) => {
    setSelectedExercises((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: value },
    }))
  }

  const filteredRoutines = routines.filter((r) => {
    if (filterLevel !== 'all' && r.level !== filterLevel) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-8 font-inter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-lexend">
            Gestión de Rutinas
          </h1>
          <p className="text-slate-500 font-medium">Crea y administra las rutinas de entrenamiento de tu gimnasio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[140px] rounded-xl border-slate-200 h-11 bg-white focus:ring-emerald-500/10">
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                <SelectItem value="all" className="rounded-xl py-3 cursor-pointer">Todos los niveles</SelectItem>
                <SelectItem value="beginner" className="rounded-xl py-3 cursor-pointer">Principiante</SelectItem>
                <SelectItem value="intermediate" className="rounded-xl py-3 cursor-pointer">Intermedio</SelectItem>
                <SelectItem value="advanced" className="rounded-xl py-3 cursor-pointer">Avanzado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] rounded-xl border-slate-200 h-11 bg-white focus:ring-emerald-500/10">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                <SelectItem value="all" className="rounded-xl py-3 cursor-pointer">Todos los estados</SelectItem>
                <SelectItem value="draft" className="rounded-xl py-3 cursor-pointer">Borrador</SelectItem>
                <SelectItem value="published" className="rounded-xl py-3 cursor-pointer">Publicado</SelectItem>
                <SelectItem value="archived" className="rounded-xl py-3 cursor-pointer">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsModalOpen(open) }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-xl gap-2 shadow-xl shadow-emerald-600/10 transition-all active:scale-95 font-bold">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Rutina</span>
              </Button>
            </DialogTrigger>
            <DialogContent className={`bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden ${step === 'exercises' ? 'sm:max-w-[600px]' : 'sm:max-w-[425px]'}`}>
              {step === 'form' ? (
                <>
                  <div className="bg-emerald-600 p-8 text-white">
                    <DialogTitle className="text-2xl font-bold font-lexend">
                      {editingRoutine ? 'Editar Rutina' : 'Nueva Rutina'}
                    </DialogTitle>
                    <DialogDescription className="text-emerald-50/80 font-medium mt-1">
                      {editingRoutine ? 'Modifica los datos de la rutina.' : 'Define los detalles básicos de la rutina.'}
                    </DialogDescription>
                  </div>
                  <form onSubmit={handleSubmitRoutine} className="p-8 space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Nombre</Label>
                      <Input
                        id="name"
                        placeholder="Full Body Intensivo"
                        required
                        className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="objective" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Objetivo</Label>
                      <Textarea
                        id="objective"
                        placeholder="Rutina diseñada para mejorar la fuerza general..."
                        className="rounded-xl border-slate-200 focus:ring-emerald-500/10 min-h-[80px]"
                        value={formData.objective}
                        onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="level" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Nivel</Label>
                        <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                          <SelectTrigger className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10 bg-white">
                            <SelectValue placeholder="Nivel" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                            <SelectItem value="beginner" className="rounded-xl py-3 cursor-pointer">Principiante</SelectItem>
                            <SelectItem value="intermediate" className="rounded-xl py-3 cursor-pointer">Intermedio</SelectItem>
                            <SelectItem value="advanced" className="rounded-xl py-3 cursor-pointer">Avanzado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="status" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Estado</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                          <SelectTrigger className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10 bg-white">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                            <SelectItem value="draft" className="rounded-xl py-3 cursor-pointer">Borrador</SelectItem>
                            <SelectItem value="published" className="rounded-xl py-3 cursor-pointer">Publicado</SelectItem>
                            <SelectItem value="archived" className="rounded-xl py-3 cursor-pointer">Archivado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="duration_minutes" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Duración (min)</Label>
                        <Input
                          id="duration_minutes"
                          type="number"
                          min={1}
                          className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="points_reward" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Puntos de Recompensa</Label>
                        <Input
                          id="points_reward"
                          type="number"
                          min={0}
                          className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                          value={formData.points_reward}
                          onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                        onClick={() => { resetForm(); setIsModalOpen(false) }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingRoutine ? 'Guardar Cambios' : 'Crear Rutina')}
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="bg-emerald-600 p-8 text-white">
                    <DialogTitle className="text-2xl font-bold font-lexend">Agregar Ejercicios</DialogTitle>
                    <DialogDescription className="text-emerald-50/80 font-medium mt-1">
                      Selecciona los ejercicios que formarán parte de esta rutina.
                    </DialogDescription>
                  </div>
                  <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto">
                    {availableExercises.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p className="font-bold">No hay ejercicios disponibles</p>
                        <p className="text-sm mt-1">Crea ejercicios primero en la sección de ejercicios.</p>
                      </div>
                    ) : (
                      availableExercises.map((exercise) => {
                        const isSelected = !!selectedExercises[exercise.id]
                        return (
                          <div
                            key={exercise.id}
                            className={`border rounded-2xl p-5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                            onClick={() => toggleExerciseSelect(exercise.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
                                  <Dumbbell className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{exercise.name}</div>
                                  <div className="text-xs text-slate-400">{exercise.muscle_group} · {exercise.equipment}</div>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-4 pt-4 border-t border-emerald-200 grid grid-cols-4 gap-3" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Series</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="rounded-xl border-slate-200 h-10 text-sm focus:ring-emerald-500/10"
                                    value={selectedExercises[exercise.id].sets}
                                    onChange={(e) => updateExerciseData(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reps</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    className="rounded-xl border-slate-200 h-10 text-sm focus:ring-emerald-500/10"
                                    value={selectedExercises[exercise.id].reps}
                                    onChange={(e) => updateExerciseData(exercise.id, 'reps', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descanso (s)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="rounded-xl border-slate-200 h-10 text-sm focus:ring-emerald-500/10"
                                    value={selectedExercises[exercise.id].rest_seconds}
                                    onChange={(e) => updateExerciseData(exercise.id, 'rest_seconds', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peso (kg)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    className="rounded-xl border-slate-200 h-10 text-sm focus:ring-emerald-500/10"
                                    value={selectedExercises[exercise.id].weight_kg}
                                    onChange={(e) => updateExerciseData(exercise.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="col-span-4">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                                    onClick={() => handleAddExerciseToRoutine(exercise.id)}
                                  >
                                    Agregar a la Rutina
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div className="pt-4">
                      <Button
                        type="button"
                        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                        onClick={handleFinishRoutine}
                      >
                        Finalizar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="animate-pulse font-bold uppercase text-xs tracking-widest text-slate-400 font-lexend">Cargando Rutinas...</p>
        </div>
      ) : filteredRoutines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRoutines.map((routine) => {
            const exerciseCount = routine.routine_exercises?.length || 0
            const isExpanded = expandedCard === routine.id
            return (
              <Card
                key={routine.id}
                className="border-slate-200/60 shadow-xl shadow-slate-200/20 bg-white rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/30 transition-all group"
              >
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-base">{routine.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] px-2.5 py-0.5 font-bold border ${levelColors[routine.level] || 'border-slate-200 text-slate-600'}`}>
                              {levelLabels[routine.level] || routine.level}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-2.5 py-0.5 font-bold border ${statusColors[routine.status] || 'border-slate-200 text-slate-600'}`}>
                              {statusLabels[routine.status] || routine.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {routine.objective && (
                      <p className="text-sm text-slate-500 leading-relaxed">{routine.objective}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{routine.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{routine.points_reward} pts</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <List className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{exerciseCount} ejercicios</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCard(isExpanded ? null : routine.id)}
                        className="h-10 px-4 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl text-sm font-bold"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-4 h-4 mr-1" /> Ocultar ejercicios</>
                        ) : (
                          <><ChevronDown className="w-4 h-4 mr-1" /> Ver ejercicios</>
                        )}
                      </Button>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(routine)}
                          className="h-10 px-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                          title="Editar rutina"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAssignDialog(routine)}
                          className="h-10 px-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                          title="Asignar a atleta"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(routine)}
                          className="h-10 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                          title="Eliminar rutina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {exerciseCount > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {routine.routine_exercises.map((re) => (
                            <div key={re.id} className="px-6 py-4 flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0">
                                <Dumbbell className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-800 text-sm truncate">
                                  {re.exercise_detail?.name || 'Ejercicio'}
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                  {re.sets} series × {re.reps} reps
                                  {re.weight_kg ? ` · ${re.weight_kg} kg` : ''}
                                  {re.rest_seconds > 0 ? ` · ${re.rest_seconds}s descanso` : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-6 py-5 text-center text-sm text-slate-400">
                          Sin ejercicios asignados
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
            <Layers className="w-10 h-10 text-slate-200" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Sin Rutinas</h3>
            <p className="text-sm text-slate-500 max-w-[280px] mx-auto">Todavía no has creado rutinas de entrenamiento.</p>
          </div>
          <Button
            variant="outline"
            className="mt-4 border-slate-200 rounded-xl h-11 px-8 font-bold text-slate-600 hover:bg-slate-50"
            onClick={() => fetchRoutines()}
          >
            Actualizar Lista
          </Button>
        </div>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Asignar Rutina</DialogTitle>
            <DialogDescription>
              Asigna &quot;{assignRoutine?.name}&quot; a un atleta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Atleta</Label>
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11">
                  <SelectValue placeholder="Seleccionar atleta..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                  {athletes.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-500">No hay atletas disponibles</div>
                  ) : (
                    athletes.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="rounded-xl py-3 cursor-pointer">
                        {a.first_name} {a.last_name} ({a.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleAssignRoutine}
              disabled={!selectedAthleteId || isAssigning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
