'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, ShieldAlert, User as UserIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch('http://localhost:8000/api/auth/users/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          const usersList = data.results || data
          setUsers(usersList.filter((u: any) => u.role !== 'super_admin'))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Usuarios Globales</h1>
          <p className="text-slate-500 mt-1">Directorio completo de administradores, coaches y atletas de la plataforma.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-lg text-slate-800">Directorio de Usuarios</CardTitle>
            <CardDescription>Visualiza a todos los usuarios registrados en LifeFit.</CardDescription>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9 w-64 bg-white" placeholder="Buscar por email o nombre..." />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuario</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Gimnasio Asociado</th>
                  <th className="px-6 py-4 font-medium">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Cargando usuarios...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay usuarios registrados.</td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden">
                          {u.google_picture ? (
                            <img src={u.google_picture} alt={u.first_name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'gym_admin' ? 'bg-blue-100 text-blue-800' :
                          u.role === 'coach' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {u.role === 'super_admin' && <ShieldAlert className="w-3 h-3" />}
                          {u.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {u.gym ? u.gym : <span className="text-slate-400 italic">No asociado</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="font-semibold text-emerald-600">Lvl {u.nivel}</span> ({u.puntos} pts)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
