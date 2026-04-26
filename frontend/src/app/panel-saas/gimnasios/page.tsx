'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MODULES = [
  { id: 'rutinas', label: 'Rutinas', icon: '🏋️' },
  { id: 'nutricion', label: 'Nutrición', icon: '🍎' },
  { id: 'retos', label: 'Retos', icon: '🎯' },
  { id: 'ranking', label: 'Ranking', icon: '🏆' },
  { id: 'checkin', label: 'Check-in', icon: '📍' },
  { id: 'coach', label: 'LifeFit Coach', icon: '🤖' },
]

export default function GymsPage() {
  const [gyms, setGyms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form State
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
    admin_password: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const fetchGyms = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('http://localhost:8000/api/gyms/gyms/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setGyms(data.results || data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGyms()
  }, [])

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
    const token = localStorage.getItem('access_token')
    
    const payload = new FormData()
    payload.append('name', formData.name)
    payload.append('slug', formData.slug)
    payload.append('ruc', formData.ruc)
    payload.append('location', formData.location)
    payload.append('contact_email', formData.contact_email)
    payload.append('brand_color', formData.brand_color)
    payload.append('status', 'active')
    
    // Módulos
    payload.append('metrics', JSON.stringify({ enabled_modules: formData.modules }))
    
    // Imagen
    if (logoFile) {
      payload.append('logo', logoFile)
    }

    // Datos del Admin
    payload.append('admin_first_name', formData.admin_first_name)
    payload.append('admin_last_name', formData.admin_last_name)
    payload.append('admin_email', formData.admin_email)
    payload.append('admin_password', formData.admin_password)

    try {
      const res = await fetch('http://localhost:8000/api/gyms/gyms/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // No se envía Content-Type explícito; fetch lo hace por nosotros con el boundary correcto para FormData
        },
        body: payload
      })

      if (res.ok) {
        setIsModalOpen(false)
        setFormData({ 
          name: '', slug: '', ruc: '', location: '', contact_email: '', 
          brand_color: '#10b981', modules: [], 
          admin_first_name: '', admin_last_name: '', admin_email: '', admin_password: '' 
        })
        setLogoFile(null)
        fetchGyms() // Recargar la lista
      } else {
        const errData = await res.json()
        alert('Error al crear gimnasio: ' + JSON.stringify(errData))
      }
    } catch (e) {
      alert('Error de conexión')
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
                  <th className="px-6 py-4 font-medium">RUC</th>
                  <th className="px-6 py-4 font-medium">Ubicación</th>
                  <th className="px-6 py-4 font-medium">Contacto</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Cargando gimnasios...</td>
                  </tr>
                ) : gyms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No hay gimnasios registrados.</td>
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
                      <td className="px-6 py-4 text-slate-600">{gym.ruc || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{gym.location || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600">{gym.contact_email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          gym.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {gym.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                          Gestionar
                        </Button>
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
                    {MODULES.map(module => (
                      <label 
                        key={module.id} 
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          formData.modules.includes(module.id) 
                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' 
                            : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="sr-only"
                          checked={formData.modules.includes(module.id)}
                          onChange={() => handleModuleToggle(module.id)}
                        />
                        <span className="text-xl">{module.icon}</span>
                        <span className="text-sm font-medium text-slate-700">{module.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECCIÓN 3: ADMIN DEL GIMNASIO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">3. Acceso del Administrador</h3>
                  <p className="text-xs text-slate-500">Se creará automáticamente el usuario dueño del gimnasio (Role: GYM_ADMIN).</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="admin_password">Contraseña Temporal</Label>
                      <Input id="admin_password" type="password" required value={formData.admin_password} onChange={e => setFormData({...formData, admin_password: e.target.value})} placeholder="••••••••" />
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
    </div>
  )
}
