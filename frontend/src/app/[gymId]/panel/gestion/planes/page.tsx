'use client'

import { useState, useEffect, use } from 'react'
import { Plus, Edit, Trash, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { GymMembershipPlan } from '@/lib/types'
import { toast } from 'sonner'

export default function GymMembershipPlansPage({ params }: { params: Promise<{ gymId: string }> }) {
  const unwrappedParams = use(params)
  const gymId = unwrappedParams.gymId
  
  const [plans, setPlans] = useState<GymMembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<GymMembershipPlan | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [durationDays, setDurationDays] = useState('30')
  const [features, setFeatures] = useState<string[]>([''])
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (gymId) fetchPlans()
  }, [gymId])

  const fetchPlans = async () => {
    try {
      setIsLoading(true)
      const res = await api.get(`/api/gyms/membership-plans/?gym_slug=${gymId}`)
      setPlans((res as any).results || res)
    } catch (error) {
      toast.error('Error al cargar los planes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (plan?: GymMembershipPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setName(plan.name)
      setDescription(plan.description)
      setPrice(plan.price)
      setDurationDays(plan.duration_days?.toString() || '30')
      setFeatures(plan.features?.length ? plan.features : [''])
      setIsActive(plan.is_active)
    } else {
      setEditingPlan(null)
      setName('')
      setDescription('')
      setPrice('')
      setDurationDays('30')
      setFeatures([''])
      setIsActive(true)
    }
    setIsModalOpen(true)
  }

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    setFeatures(newFeatures)
  }

  const addFeature = () => setFeatures([...features, ''])
  const removeFeature = (index: number) => setFeatures(features.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean empty features
    const cleanFeatures = features.filter(f => f.trim() !== '')
    
    const payload = {
      gym: typeof gymId === 'string' && isNaN(Number(gymId)) ? undefined : gymId, // Needs numeric gym ID ideally, backend handles it if gym_admin
      name,
      description,
      price,
      duration_days: parseInt(durationDays),
      features: cleanFeatures,
      is_active: isActive
    }

    try {
      if (editingPlan) {
        await api.patch(`/api/gyms/membership-plans/${editingPlan.id}/`, payload)
        toast.success('Plan actualizado')
      } else {
        await api.post('/api/gyms/membership-plans/', payload)
        toast.success('Plan creado')
      }
      setIsModalOpen(false)
      fetchPlans()
    } catch (error) {
      toast.error('Error al guardar el plan')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return
    try {
      await api.delete(`/api/gyms/membership-plans/${id}/`)
      toast.success('Plan eliminado')
      fetchPlans()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planes de Membresía</h1>
          <p className="text-slate-500">Administra los planes que ofreces a tus atletas.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Cargando planes...</p>
        ) : plans.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">No hay planes creados</h3>
            <p className="text-slate-500 mb-4">Crea tu primer plan para que los atletas puedan registrarse.</p>
            <Button onClick={() => handleOpenModal()} variant="outline">Crear mi primer plan</Button>
          </div>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className={`border-slate-200 ${!plan.is_active && 'opacity-60'}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(plan)}>
                      <Edit className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">S/ {plan.price}</span>
                  <span className="text-slate-500"> / {plan.duration_days} días</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">Beneficios:</p>
                  <ul className="space-y-1">
                    {plan.features?.map((f, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start">
                        <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
            <DialogDescription>
              Configura el precio y los beneficios que verán tus atletas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nombre del Plan</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Plan Crossfit Pro" required />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descripción del plan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Precio (S/)</Label>
                  <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="100.00" required />
                </div>
                <div className="grid gap-2">
                  <Label>Duración (Días)</Label>
                  <Input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} placeholder="30" required />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Beneficios (Mostrados en el registro)</Label>
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      value={feature} 
                      onChange={e => handleFeatureChange(index, e.target.value)} 
                      placeholder="Ej: Acceso a todas las clases" 
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)} disabled={features.length === 1}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addFeature} className="mt-2 w-fit">
                  <Plus className="h-3 w-3 mr-1" /> Agregar beneficio
                </Button>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="active">Plan Activo (Visible para clientes)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">Guardar Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
