'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, UserCheck, Power, PowerOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

import { api } from '@/lib/api'
import type { Gym, PaginatedResponse } from '@/lib/types'
import { setTokens, setStoredUser, dispatchAuthEvent, backupAdminTokens } from '@/lib/auth'

import { Switch } from '@/components/ui/switch'

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableModules, setAvailableModules] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const router = useRouter()
  
  // Gestión de Módulos (Nivel 2)
  const [isManageModulesOpen, setIsManageModulesOpen] = useState(false)
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const [gymModules, setGymModules] = useState<any[]>([])
  const [isLoadingModules, setIsLoadingModules] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    ruc: '',
    location: '',
    contact_email: '',
    brand_color: '#10b981',
    modules: [] as string[],
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    max_athletes: 100,
    max_coaches: 2,
    max_nutritionists: 2,
    saas_plan_id: '',
    billing_cycle: 'monthly',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ gym: Gym; action: 'deactivate' | 'activate' } | null>(null)

  const fetchGyms = async () => {
    try {
      const data = await api.get<PaginatedResponse<Gym>>("/api/gyms/gyms/")
      setGyms(data.results || (Array.isArray(data) ? data : []))
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGyms()
    fetchAvailableModules()
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const res = await api.get('/api/subscriptions/plans/')
      setPlans((res as any).results || res)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAvailableModules = async () => {
    try {
      const res = await api.get('/api/system/feature-flags/')
      const allModules = (res as any).results || res
      // Solo mostrar módulos que están activos globalmente
      setAvailableModules(allModules.filter((m: any) => m.is_active_globally))
    } catch (e) {
      console.error(e)
    }
  }

  const openManageModules = async (gym: Gym) => {
    setSelectedGym(gym)
    setIsManageModulesOpen(true)
    setIsLoadingModules(true)
    try {
      const res = await api.get(`/api/gyms/feature-flags/?gym_id=${gym.id}`)
      setGymModules((res as any).results || res)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingModules(false)
    }
  }

  const toggleGymModule = async (gymId: string, featureFlagId: string, currentFlagId: string | null, isActive: boolean) => {
    try {
      if (currentFlagId) {
        // Toggle existing GymFeatureFlag
        await api.patch(`/api/gyms/feature-flags/${currentFlagId}/`, { is_active: !isActive })
      } else {
        // Create new GymFeatureFlag
        await api.post(`/api/gyms/feature-flags/`, { gym: gymId, feature_flag: featureFlagId, is_active: true })
      }
      // Refresh
      const res = await api.get(`/api/gyms/feature-flags/?gym_id=${gymId}`)
      setGymModules((res as any).results || res)
    } catch (e) {
      console.error(e)
    }
  }

  const handleImpersonate = async (gymId: string) => {
    try {
      backupAdminTokens()
      const res: any = await api.post('/api/auth/impersonate/', { gym_id: gymId })
      setTokens(res.access, res.refresh)
      setStoredUser(res.user)
      dispatchAuthEvent()
      if (res.gym_slug) {
        router.push(`/${res.gym_slug}/panel`)
      }
    } catch (e) {
      console.error(e)
      alert("Error al entrar como administrador. Asegúrate de que este gimnasio tiene un admin creado.")
    }
  }

  const handleToggleStatus = async (gym: Gym, action: 'deactivate' | 'activate') => {
    try {
      await api.post(`/api/gyms/gyms/${gym.id}/${action}/`, {})
      setConfirmDelete(null)
      fetchGyms()
    } catch (e) {
      console.error(e)
      alert('Error al cambiar el estado del gimnasio.')
    }
  }

  // Auto-ajustar límites y módulos según el plan SaaS seleccionado
  useEffect(() => {
    if (formData.saas_plan_id && plans.length > 0) {
      const selectedPlan = plans.find(p => p.id === formData.saas_plan_id)
      if (selectedPlan) {
        // Extraer los módulos que están en true en el plan
        const activeModules: string[] = []
        if (selectedPlan.features) {
          for (const [key, value] of Object.entries(selectedPlan.features)) {
            if (value === true) {
              activeModules.push(key)
            }
          }
        }
        
        setFormData(prev => {
          // Evitar re-renders infinitos
          const prevModulesStr = [...prev.modules].sort().join(',')
          const activeModulesStr = [...activeModules].sort().join(',')
          
          if (prev.max_athletes !== selectedPlan.max_athletes || 
              prev.max_coaches !== selectedPlan.max_coaches || 
              prev.max_nutritionists !== selectedPlan.max_nutritionists ||
              prevModulesStr !== activeModulesStr) {
            return {
              ...prev,
              max_athletes: selectedPlan.max_athletes || 50,
              max_coaches: selectedPlan.max_coaches || 2,
              max_nutritionists: selectedPlan.max_nutritionists || 1,
              modules: activeModules
            }
          }
          return prev
        })
      }
    }
  }, [formData.saas_plan_id, plans])

  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => {
      const isSelected = prev.modules.includes(moduleId)
      return {
        ...prev,
        modules: isSelected 
          ? prev.modules.filter(m => m !== moduleId)
          : [...prev.modules, moduleId]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = new FormData()
    payload.append('name', formData.name)
    payload.append('slug', formData.slug)
    payload.append('ruc', formData.ruc)
    payload.append('location', formData.location)
    payload.append('contact_email', formData.contact_email)
    payload.append('brand_color', formData.brand_color)
    payload.append('status', 'active')
    payload.append('metrics', JSON.stringify({ enabled_modules: formData.modules }))
    
    if (logoFile) {
      payload.append('logo', logoFile)
    }

    payload.append('admin_first_name', formData.admin_first_name)
    payload.append('admin_last_name', formData.admin_last_name)
    payload.append('admin_email', formData.admin_email)
    payload.append('max_athletes', String(formData.max_athletes))
    payload.append('max_coaches', String(formData.max_coaches))
    payload.append('max_nutritionists', String(formData.max_nutritionists))
    payload.append('saas_plan_id', formData.saas_plan_id)
    payload.append('billing_cycle', formData.billing_cycle)

    try {
      await api.post("/api/gyms/gyms/", payload, { formData: true })
      setIsModalOpen(false)
      setFormData({ 
        name: '', slug: '', ruc: '', location: '', contact_email: '', 
        brand_color: '#10b981', modules: [], 
        admin_first_name: '', admin_last_name: '', admin_email: '',
        max_athletes: 100, max_coaches: 2, max_nutritionists: 2,
        saas_plan_id: '', billing_cycle: 'monthly'
      })
      setLogoFile(null)
      fetchGyms()
    } catch (e: any) {
      alert('Error al crear gimnasio: ' + (e?.message || 'Error de conexión'))
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gimnasios Asociados</h1>
          <p className="text-slate-500 mt-1">Gestión de clientes B2B, licencias y módulos habilitados.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Gimnasio
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-lg text-slate-800">Directorio de Clientes</CardTitle>
            <CardDescription>Visualiza los gimnasios que utilizan LifeFit.</CardDescription>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9 w-64 bg-white" placeholder="Buscar gimnasio..." />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Plan SaaS</th>
                  <th className="px-6 py-4 font-medium">RUC</th>
                  <th className="px-6 py-4 font-medium">Ubicación</th>
                  <th className="px-6 py-4 font-medium">Contacto</th>
                  <th className="px-6 py-4 font-medium">Fecha Registro</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Cargando gimnasios...</td>
                  </tr>
                ) : gyms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No hay gimnasios registrados.</td>
                  </tr>
                ) : (
                  gyms.map((gym: any) => (
                    <tr key={gym.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                        {gym.logo ? (
                          <img src={gym.logo} alt={gym.name} className="w-8 h-8 rounded-md object-cover border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: gym.brand_color || '#10b981' }}>
                            {gym.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {gym.name}
                      </td>
                      <td className="px-6 py-4">
                        {gym.active_plan ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 inline-block w-max">
                              {gym.active_plan.name}
                            </span>
                            <span className="text-xs text-slate-500 mt-0.5">
                              S/ {gym.active_plan.price} ({gym.active_plan.billing_cycle})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Sin Plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{gym.ruc || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{gym.location || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600">{gym.contact_email || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {gym.created_at ? (
                          new Date(gym.created_at).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {gym.deleted_at ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            Desactivado
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            gym.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {gym.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openManageModules(gym)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            Módulos
                          </Button>
                          {gym.deleted_at ? (
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ gym, action: 'activate' })} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Reactivar">
                              <Power className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ gym, action: 'deactivate' })} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Desactivar">
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleImpersonate(gym.id)} className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50" title="Entrar como Admin">
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal / Dialog de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl bg-white shadow-2xl border-0 overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl">Registrar Nuevo Gimnasio</CardTitle>
              <CardDescription>Ingresa los detalles corporativos y credenciales de acceso.</CardDescription>
            </CardHeader>
            <div className="overflow-y-auto p-6">
              <form id="create-gym-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* SECCIÓN 1: DATOS CORPORATIVOS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">1. Datos Corporativos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Gimnasio</Label>
                      <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Iron Peak Fitness" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug (URL identificador)</Label>
                      <Input id="slug" required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="ej. iron-peak" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ruc">RUC</Label>
                      <Input id="ruc" value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} placeholder="Ej. 20123456789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input id="location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ej. Madrid, Centro" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Correo de Contacto</Label>
                      <Input id="contact_email" type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} placeholder="contacto@gym.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand_color">Color de Marca</Label>
                      <div className="flex gap-3">
                        <Input id="brand_color" type="color" className="w-16 h-10 p-1 cursor-pointer" value={formData.brand_color} onChange={e => setFormData({...formData, brand_color: e.target.value})} />
                        <Input type="text" value={formData.brand_color} onChange={e => setFormData({...formData, brand_color: e.target.value})} placeholder="#10b981" className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="logo">Logo del Gimnasio (Opcional)</Label>
                      <Input id="logo" type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECCIÓN 2: MÓDULOS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">2. Módulos Contratados</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableModules.map(module => (
                      <label 
                        key={module.id} 
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          formData.modules.includes(module.code) 
                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' 
                            : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="sr-only"
                          checked={formData.modules.includes(module.code)}
                          onChange={() => handleModuleToggle(module.code)}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{module.name}</span>
                          <span className="text-xs text-slate-500">{module.code}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECCIÓN 3: PLAN DE SUSCRIPCIÓN SAAS */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">3. Plan de Suscripción (SaaS)</h3>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600 mb-2 block">Plan Seleccionado</Label>
                    <Select value={formData.saas_plan_id} onValueChange={(val) => setFormData({...formData, saas_plan_id: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un plan SaaS" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - S/{p.price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing_cycle">Ciclo de Facturación</Label>
                      <Select 
                        value={formData.billing_cycle} 
                        onValueChange={(value) => setFormData({...formData, billing_cycle: value})}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecciona el ciclo" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-md z-[100]">
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECCIÓN 4: LÍMITES DE CAPACIDAD */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">4. Límites de Uso (Tier)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_athletes">Atletas Máximos</Label>
                      <Input id="max_athletes" type="number" min="1" required value={formData.max_athletes} onChange={e => setFormData({...formData, max_athletes: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_coaches">Coaches Máximos</Label>
                      <Input id="max_coaches" type="number" min="0" required value={formData.max_coaches} onChange={e => setFormData({...formData, max_coaches: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_nutritionists">Nutricionistas Máximos</Label>
                      <Input id="max_nutritionists" type="number" min="0" required value={formData.max_nutritionists} onChange={e => setFormData({...formData, max_nutritionists: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECCIÓN 5: ADMIN DEL GIMNASIO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">5. Acceso del Administrador</h3>
                  <p className="text-xs text-slate-500">Se enviará un correo automático de invitación para que el dueño cree su propia contraseña.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_first_name">Nombre</Label>
                      <Input id="admin_first_name" required value={formData.admin_first_name} onChange={e => setFormData({...formData, admin_first_name: e.target.value})} placeholder="Ej. Juan" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_last_name">Apellidos</Label>
                      <Input id="admin_last_name" required value={formData.admin_last_name} onChange={e => setFormData({...formData, admin_last_name: e.target.value})} placeholder="Ej. Pérez" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_email">Email (Login)</Label>
                      <Input id="admin_email" type="email" required value={formData.admin_email} onChange={e => setFormData({...formData, admin_email: e.target.value})} placeholder="admin@gym.com" />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" form="create-gym-form" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Crear Cliente B2B y Administrador
              </Button>
            </div>
          </Card>
        </div>
      )}
      {isManageModulesOpen && selectedGym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-white shadow-2xl border-0 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl">Módulos: {selectedGym.name}</CardTitle>
              <CardDescription>Activa o desactiva funciones exclusivas para este cliente.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingModules ? (
                <p className="text-center text-slate-500 py-8">Cargando módulos...</p>
              ) : (
                <div className="space-y-4">
                  {availableModules.map(flag => {
                    const gymFlag = gymModules.find(m => m.feature_flag === flag.id)
                    const isActive = gymFlag ? gymFlag.is_active : false
                    
                    return (
                      <div key={flag.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                        <div>
                          <p className="font-medium text-slate-900">{flag.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{flag.code}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isActive ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                          <Switch 
                            checked={isActive} 
                            onCheckedChange={() => toggleGymModule(selectedGym.id, flag.id, gymFlag?.id || null, isActive)} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setIsManageModulesOpen(false)}>Cerrar</Button>
            </div>
          </Card>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white shadow-2xl border-0">
            <CardHeader>
              <CardTitle className="text-xl">
                {confirmDelete.action === 'deactivate' ? 'Desactivar Gimnasio' : 'Reactivar Gimnasio'}
              </CardTitle>
              <CardDescription>
                {confirmDelete.action === 'deactivate'
                  ? `¿Estás seguro de desactivar "${confirmDelete.gym.name}"? Los usuarios no podrán acceder al panel.`
                  : `¿Estás seguro de reactivar "${confirmDelete.gym.name}"? Los usuarios volverán a tener acceso al panel.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button
                onClick={() => handleToggleStatus(confirmDelete.gym, confirmDelete.action)}
                className={confirmDelete.action === 'deactivate' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
              >
                {confirmDelete.action === 'deactivate' ? 'Desactivar' : 'Reactivar'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
