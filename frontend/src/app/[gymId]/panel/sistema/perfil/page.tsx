'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, Calendar, Award, Key, Save, Loader2, CheckCircle2, AlertTriangle, Medal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { showError, showSuccess } from '@/lib/toast'
import { ProfileSkeleton } from '@/components/ui/skeletons'
import type { User as UserType, UserBadge, UserProgress } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

export default function PerfilPage() {
  const router = useRouter()
  const storedUser = getStoredUser<UserType>()

  const [user, setUser] = useState<UserType | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dni, setDni] = useState('')
  const [saving, setSaving] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [userRes, badgesRes, progressRes] = await Promise.all([
        api.get<any>('/api/auth/me/'),
        api.get<any>('/api/challenges/user-badges/'),
        api.get<any>('/api/challenges/progress/my_dashboard/'),
      ])
      setUser(userRes)
      setBadges(Array.isArray(badgesRes) ? badgesRes : badgesRes?.results || [])
      setProgress(progressRes)
      setFirstName(userRes.first_name || '')
      setLastName(userRes.last_name || '')
      setPhone(userRes.phone || '')
      setDni(userRes.dni || '')
    } catch (err) {
      showError(err, 'Error al cargar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/api/auth/me/', { first_name: firstName, last_name: lastName, phone, dni })
      showSuccess('Perfil actualizado correctamente')
      setEditing(false)
      fetchData()
    } catch (err) {
      showError(err, 'Error al actualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setChangingPassword(true)
    try {
      await api.post('/api/auth/change-password/', { old_password: oldPassword, new_password: newPassword })
      showSuccess('Contraseña cambiada correctamente')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showError(err, 'Error al cambiar contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  if (isLoading) return <ProfileSkeleton />

  if (!user) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">No se pudo cargar el perfil</h2>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>Volver</Button>
      </div>
    )
  }

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '?'
  const memberSince = user.date_joined
    ? new Date(user.date_joined).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const xpPercent = progress
    ? (progress.next_level_xp > 0 ? Math.min((progress.current_xp / progress.next_level_xp) * 100, 100) : 0)
    : 0

  const isGoogle = user.is_google_account

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500 mt-1">Información personal y configuración de tu cuenta</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-24 h-24 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-4xl mx-auto mb-4">
                {initials}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.first_name} {user.last_name}</h2>
              <p className="text-slate-500 text-sm mt-1">{user.email}</p>
              <Badge className="mt-3 bg-emerald-50 text-emerald-700 border-emerald-100 text-xs px-3 py-1">
                {ROLE_LABELS[user.role] || user.role}
              </Badge>
              {isGoogle && (
                <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-100 text-xs">
                  Google Account
                </Badge>
              )}
            </CardContent>
          </Card>

          {progress && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Nivel {progress.level}</p>
                    <p className="text-2xl font-bold text-slate-900">{progress.total_points} pts</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Medal className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>XP: {progress.current_xp} / {progress.next_level_xp}</span>
                    <span>{Math.round(xpPercent)}%</span>
                  </div>
                  <Progress value={xpPercent} className="h-2 [&>div]:bg-amber-400" />
                </div>
              </CardContent>
            </Card>
          )}

          {badges.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4" /> Mis Logros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex flex-wrap gap-2">
                  {badges.map((ub) => (
                    <div key={ub.id} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs px-2.5 py-1.5 rounded-full border border-amber-100">
                      <Award className="w-3 h-3" />
                      {ub.badge_detail?.name || 'Insignia'}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" /> Información Personal
                </CardTitle>
                <CardDescription>Tus datos de perfil</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
            </CardHeader>
            <CardContent>
              {editing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>DNI</Label>
                      <Input value={dni} onChange={(e) => setDni(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Cambios
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Nombre</p>
                      <p className="text-sm text-slate-900 mt-0.5">{user.first_name} {user.last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Email</p>
                      <p className="text-sm text-slate-900 mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Teléfono</p>
                      <p className="text-sm text-slate-900 mt-0.5">{user.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">DNI</p>
                      <p className="text-sm text-slate-900 mt-0.5">{user.dni || '—'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Miembro desde
                      </p>
                      <p className="text-sm text-slate-900 mt-0.5">{memberSince}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Rol
                      </p>
                      <p className="text-sm text-slate-900 mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!isGoogle && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" /> Cambiar Contraseña
                </CardTitle>
                <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Contraseña Actual</Label>
                    <Input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nueva Contraseña</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repite la contraseña"
                    />
                  </div>
                  {passwordError && (
                    <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-xl">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {passwordError}
                    </div>
                  )}
                  <Button type="submit" disabled={changingPassword} variant="outline">
                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Cambiar Contraseña
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
