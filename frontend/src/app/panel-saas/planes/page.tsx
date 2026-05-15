"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { SubscriptionPlan, PaginatedResponse, BillingCycle } from "@/lib/types"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Edit2, Archive, CheckCircle, RefreshCcw, Trash2, GripHorizontal } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const FEATURES_LIST = [
  { id: "rutinas", label: "Rutinas", icon: "🏋️" },
  { id: "nutricion", label: "Nutrición", icon: "🍎" },
  { id: "retos", label: "Retos", icon: "🎯" },
  { id: "ranking", label: "Ranking", icon: "🏆" },
  { id: "checkin", label: "Check-in", icon: "📍" },
  { id: "coach", label: "LifeFit Coach", icon: "🤖" },
]

function SortablePlanCard({ plan, handleOpenModal }: { plan: SubscriptionPlan, handleOpenModal: (p?: SubscriptionPlan) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: plan.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col relative group z-10 hover:z-20">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-6 left-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 transition-colors"
      >
        <GripHorizontal className="h-5 w-5" />
      </div>
      <div className="flex justify-between items-start mb-4 pl-6">
        <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(plan)} className="h-8 w-8 text-slate-400 hover:text-emerald-600">
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-3xl font-extrabold text-emerald-600">S/ {plan.price}</span>
        <span className="text-sm text-slate-500">/{plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'annual' ? 'año' : plan.billing_cycle}</span>
      </div>
      <p className="text-sm text-slate-600 mb-6 flex-grow">{plan.description}</p>
      
      <ul className="space-y-2 mb-6">
        <li className="flex items-center text-sm text-slate-700">
          <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Hasta {plan.max_athletes === 999999 ? '∞' : plan.max_athletes} Atletas
        </li>
        <li className="flex items-center text-sm text-slate-700">
          <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Hasta {plan.max_coaches} Coaches
        </li>
        <li className="flex items-center text-sm text-slate-700">
          <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Hasta {plan.max_nutritionists} Nutricionistas
        </li>
        {Object.entries(plan.features || {}).filter(([_, val]) => val).map(([key]) => {
          const feature = FEATURES_LIST.find(f => f.id === key)
          return feature ? (
            <li key={key} className="flex items-center text-sm text-slate-700">
              <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" /> Módulo: {feature.label}
            </li>
          ) : null
        })}
      </ul>
      <Button variant="outline" className="w-full" onClick={() => handleOpenModal(plan)}>
        Editar Plan
      </Button>
    </div>
  )
}

export default function SaaSPlanesPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)

  const defaultFormState = {
    name: "",
    description: "",
    price: "",
    billing_cycle: "monthly" as BillingCycle,
    max_athletes: 50,
    max_coaches: 2,
    max_nutritionists: 1,
    display_order: 0,
    features: {
      rutinas: true,
      nutricion: true,
      retos: false,
      ranking: false,
      checkin: false,
      coach: false,
    } as Record<string, boolean>,
  }

  const [form, setForm] = useState(defaultFormState)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const data = await api.get<PaginatedResponse<SubscriptionPlan>>("/api/subscriptions/plans/")
      setPlans(data.results || [])
    } catch (error) {
      toast.error("Error", { description: "No se pudieron cargar los planes" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setForm({
        name: plan.name,
        description: plan.description,
        price: plan.price.toString(),
        billing_cycle: plan.billing_cycle,
        max_athletes: plan.max_athletes,
        max_coaches: plan.max_coaches,
        max_nutritionists: plan.max_nutritionists,
        display_order: plan.display_order || 0,
        features: plan.features || defaultFormState.features,
      })
    } else {
      setEditingPlan(null)
      setForm(defaultFormState)
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const payload = {
        ...form,
        currency: "PEN",
        price: parseFloat(form.price),
      }

      if (editingPlan) {
        await api.put(`/api/subscriptions/plans/${editingPlan.id}/`, payload)
        toast.success("Éxito", { description: "Plan actualizado correctamente" })
      } else {
        await api.post("/api/subscriptions/plans/", payload)
        toast.success("Éxito", { description: "Plan creado correctamente" })
      }
      setIsModalOpen(false)
      await fetchPlans()
    } catch (error) {
      toast.error("Error", { description: "Hubo un problema al guardar el plan" })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      if (plan.is_active) {
        await api.delete(`/api/subscriptions/plans/${plan.id}/`)
        toast.success("Plan archivado")
      } else {
        await api.patch(`/api/subscriptions/plans/${plan.id}/`, { is_active: true })
        toast.success("Plan reactivado")
      }
      await fetchPlans()
    } catch (error) {
      toast.error("Error", { description: "No se pudo cambiar el estado del plan" })
    }
  }

  const handleHardDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar DEFINITIVAMENTE el plan "${plan.name}"? Esta acción no se puede deshacer.`)) {
      return
    }
    try {
      await api.delete(`/api/subscriptions/plans/${plan.id}/hard_delete/`)
      toast.success("Plan eliminado definitivamente")
      await fetchPlans()
    } catch (error: any) {
      const msg = error.response?.data?.detail || "No se pudo eliminar el plan. Es probable que esté en uso."
      toast.error("No permitido", { description: msg })
    }
  }

  const activePlans = plans.filter(p => p.is_active)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      // Reordenar localmente
      const oldIndex = activePlans.findIndex(p => p.id === active.id)
      const newIndex = activePlans.findIndex(p => p.id === over.id)
      
      const newActivePlans = arrayMove(activePlans, oldIndex, newIndex).map((p, index) => ({
        ...p,
        display_order: index + 1
      }))
      
      // Actualizar el array general "plans" para reflejarlo en la tabla
      const updatedPlans = [...plans]
      newActivePlans.forEach(plan => {
        const index = updatedPlans.findIndex(p => p.id === plan.id)
        if (index !== -1) {
          updatedPlans[index] = plan
        }
      })
      
      // Ordenar por display_order para mantener consistencia
      updatedPlans.sort((a, b) => a.display_order - b.display_order)
      setPlans(updatedPlans)
      
      // Enviar la actualización masiva al backend
      try {
        const payload = newActivePlans.map(p => ({ id: p.id, display_order: p.display_order }))
        await api.post("/api/subscriptions/plans/reorder/", payload)
        toast.success("Orden guardado correctamente")
        await fetchPlans()
      } catch (error) {
        toast.error("Error al guardar el nuevo orden")
        await fetchPlans() // Revertir en caso de error
      }
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-emerald-600" />
            Planes de Precio (SaaS)
          </h1>
          <p className="text-muted-foreground mt-1">Administra los paquetes de suscripción que ofreces a los gimnasios.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700">
          + Crear Plan
        </Button>
      </div>

      {/* PRICING CARDS */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planes Activos</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : activePlans.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500">
            No hay planes activos configurados.
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={activePlans.map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {activePlans.map(plan => (
                  <SortablePlanCard key={plan.id} plan={plan} handleOpenModal={handleOpenModal} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* TABLE */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Todos los Planes (Historial)</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Orden</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Ciclo</th>
                  <th className="px-6 py-4">Límites (Atl/Coa/Nut)</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-500">{plan.display_order}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{plan.name}</td>
                    <td className="px-6 py-4">S/ {plan.price}</td>
                    <td className="px-6 py-4 capitalize">{plan.billing_cycle}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {plan.max_athletes} / {plan.max_coaches} / {plan.max_nutritionists}
                    </td>
                    <td className="px-6 py-4">
                      {plan.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Archivado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(plan)} className="text-slate-400 hover:text-emerald-600">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggleActive(plan)} 
                          className={plan.is_active ? "text-slate-400 hover:text-red-600" : "text-slate-400 hover:text-emerald-600"}
                          title={plan.is_active ? "Archivar" : "Reactivar"}
                        >
                          {plan.is_active ? <Archive className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleHardDelete(plan)} 
                          className="text-slate-400 hover:text-red-700"
                          title="Eliminar Definitivamente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No hay planes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Plan'}</DialogTitle>
            <DialogDescription>
              Define los límites y módulos incluidos en este plan de suscripción.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Ej: Básico" />
                </div>
                <div>
                  <Label>Precio (S/)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required min="0" />
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select value={form.billing_cycle} onValueChange={(v: BillingCycle) => setForm({...form, billing_cycle: v})}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input type="number" value={form.display_order} onChange={e => setForm({...form, display_order: parseInt(e.target.value) || 0})} required min="0" placeholder="Ej: 1" />
                </div>
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Descripción corta del plan..." />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Máx. Atletas</Label>
                  <Input type="number" value={form.max_athletes} onChange={e => setForm({...form, max_athletes: parseInt(e.target.value) || 0})} required min="1" />
                </div>
                <div>
                  <Label>Máx. Coaches</Label>
                  <Input type="number" value={form.max_coaches} onChange={e => setForm({...form, max_coaches: parseInt(e.target.value) || 0})} required min="0" />
                </div>
                <div>
                  <Label>Máx. Nutricionistas</Label>
                  <Input type="number" value={form.max_nutritionists} onChange={e => setForm({...form, max_nutritionists: parseInt(e.target.value) || 0})} required min="0" />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Módulos incluidos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                  {FEATURES_LIST.map(feat => (
                    <div key={feat.id} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Switch 
                        id={`feat-${feat.id}`}
                        checked={form.features[feat.id] || false} 
                        onCheckedChange={(checked) => setForm({
                          ...form, 
                          features: { ...form.features, [feat.id]: checked }
                        })} 
                      />
                      <Label htmlFor={`feat-${feat.id}`} className="cursor-pointer font-medium text-slate-700">
                        {feat.icon} {feat.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Guardando...' : editingPlan ? 'Actualizar Plan' : 'Crear Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
