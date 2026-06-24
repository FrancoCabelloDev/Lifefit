'use client'

import { useEffect, useState, use } from 'react'
import {
  Dumbbell,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
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
import { showError } from '@/lib/toast'
import type { Exercise, PaginatedResponse } from '@/lib/types'
import { useRoleGuard } from '@/hooks/useRoleGuard'

const categoryColors: Record<string, string> = {
  strength: 'bg-red-50 text-red-700 border-red-100',
  cardio: 'bg-orange-50 text-orange-700 border-orange-100',
  mobility: 'bg-blue-50 text-blue-700 border-blue-100',
  flexibility: 'bg-purple-50 text-purple-700 border-purple-100',
  hiit: 'bg-amber-50 text-amber-700 border-amber-100',
}

export default function ExercisesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  useRoleGuard(gymId, ['coach'])

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'strength',
    equipment: '',
    muscle_group: '',
    description: '',
  })

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<PaginatedResponse<Exercise>>("/api/workouts/exercises/", {
        params: { gym: gymId }
      })
      setExercises(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', category: 'strength', equipment: '', muscle_group: '', description: '' })
    setEditingExercise(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormData({
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      muscle_group: exercise.muscle_group,
      description: exercise.description,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      if (editingExercise) {
        await api.patch(`/api/workouts/exercises/${editingExercise.id}/`, { ...formData, gym: gymId })
      } else {
        await api.post("/api/workouts/exercises/", { ...formData, gym: gymId })
      }
      setIsModalOpen(false)
      resetForm()
      fetchExercises()
    } catch (error: any) {
      showError(error, 'Error al guardar ejercicio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (exercise: Exercise) => {
    if (!confirm(`¿Eliminar el ejercicio "${exercise.name}"?`)) return
    try {
      await api.delete(`/api/workouts/exercises/${exercise.id}/`)
      fetchExercises()
    } catch (error: any) {
      showError(error, 'Error al eliminar ejercicio')
    }
  }

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscle_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.equipment.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 font-inter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-lexend">
            Gestión de Ejercicios
          </h1>
          <p className="text-slate-500 font-medium">Administra el catálogo de ejercicios de tu gimnasio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder="Buscar ejercicio..."
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-emerald-500/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsModalOpen(open) }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-6 rounded-xl gap-2 shadow-xl shadow-emerald-600/10 transition-all active:scale-95 font-bold">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Ejercicio</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-emerald-600 p-8 text-white">
                <DialogTitle className="text-2xl font-bold font-lexend">
                  {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                </DialogTitle>
                <DialogDescription className="text-emerald-50/80 font-medium mt-1">
                  {editingExercise ? 'Modifica los datos del ejercicio.' : 'Registra un nuevo ejercicio en el catálogo.'}
                </DialogDescription>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Press de banca"
                    required
                    className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Categoría</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10 bg-white">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-xl bg-white p-2">
                      <SelectItem value="strength" className="rounded-xl py-3 cursor-pointer">Fuerza</SelectItem>
                      <SelectItem value="cardio" className="rounded-xl py-3 cursor-pointer">Cardio</SelectItem>
                      <SelectItem value="mobility" className="rounded-xl py-3 cursor-pointer">Movilidad</SelectItem>
                      <SelectItem value="flexibility" className="rounded-xl py-3 cursor-pointer">Flexibilidad</SelectItem>
                      <SelectItem value="hiit" className="rounded-xl py-3 cursor-pointer">HIIT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="equipment" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Equipamiento</Label>
                    <Input
                      id="equipment"
                      placeholder="Barra, mancuernas..."
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      value={formData.equipment}
                      onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="muscle_group" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Grupo Muscular</Label>
                    <Input
                      id="muscle_group"
                      placeholder="Pecho, espalda..."
                      className="rounded-xl border-slate-200 h-11 focus:ring-emerald-500/10"
                      value={formData.muscle_group}
                      onChange={(e) => setFormData({ ...formData, muscle_group: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-wider">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Instrucciones y observaciones del ejercicio..."
                    className="rounded-xl border-slate-200 focus:ring-emerald-500/10 min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
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
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingExercise ? 'Guardar Cambios' : 'Crear Ejercicio')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden bg-white rounded-[2rem]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              <p className="animate-pulse font-bold uppercase text-xs tracking-widest text-slate-400 font-lexend">Cargando Ejercicios...</p>
            </div>
          ) : filteredExercises.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Nombre</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Categoría</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Grupo Muscular</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend">Equipamiento</th>
                    <th className="px-8 py-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-lexend text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExercises.map((exercise) => (
                    <tr key={exercise.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            <Dumbbell className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-base">{exercise.name}</div>
                            {exercise.description && (
                              <div className="text-xs text-slate-400 max-w-[200px] truncate">{exercise.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge variant="outline" className={`capitalize px-3 py-1 font-semibold border ${categoryColors[exercise.category] || 'border-slate-200 text-slate-600'}`}>
                          {exercise.category === 'strength' ? 'Fuerza' :
                           exercise.category === 'cardio' ? 'Cardio' :
                           exercise.category === 'mobility' ? 'Movilidad' :
                           exercise.category === 'flexibility' ? 'Flexibilidad' :
                           exercise.category === 'hiit' ? 'HIIT' : exercise.category}
                        </Badge>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-600">{exercise.muscle_group || '-'}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-medium text-slate-600">{exercise.equipment || '-'}</div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(exercise)}
                            className="h-10 px-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                            title="Editar ejercicio"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(exercise)}
                            className="h-10 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                            title="Eliminar ejercicio"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                <Dumbbell className="w-10 h-10 text-slate-200" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-tight">Sin Ejercicios</h3>
                <p className="text-sm text-slate-500 max-w-[280px] mx-auto">Todavía no has registrado ejercicios en el catálogo.</p>
              </div>
              <Button
                variant="outline"
                className="mt-4 border-slate-200 rounded-xl h-11 px-8 font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => fetchExercises()}
              >
                Actualizar Lista
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
