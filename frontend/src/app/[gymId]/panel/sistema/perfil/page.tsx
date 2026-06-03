'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Shield, Calendar, Award, Key, Save, Loader2,
  CheckCircle2, AlertTriangle, Medal, Camera, Briefcase,
  Star, Users, Target, Trash2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { api } from '@/lib/api'
import { getStoredUser, clearAuth } from '@/lib/auth'
import { showError, showSuccess } from '@/lib/toast'
import { ProfileSkeleton } from '@/components/ui/skeletons'
import type { User as UserType, UserBadge, UserProgress } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

const STAFF_ROLES = ['coach', 'nutritionist']

export default function PerfilPage() {
  const router = useRouter()
  const storedUser = getStoredUser<UserType>()
  const isAthlete = storedUser?.role === 'athlete'
  const isStaff = storedUser?.role ? STAFF_ROLES.includes(storedUser.role) : false

  const [user, setUser] = useState<UserType | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Info personal
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dni, setDni] = useState('')
  const [saving, setSaving] = useState(false)

  // Contraseña
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Eliminar cuenta
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await api.delete('/api/accounts/me/')
      clearAuth()
      router.push('/unirse')
    } catch (error: any) {
      showError(error, 'Error al eliminar la cuenta')
      setIsDeleting(false)
    }
  }

  // Objetivos atleta
  const [fitnessGoal, setFitnessGoal] = useState('')
  const [goalNotes, setGoalNotes] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [savingGoal, setSavingGoal] = useState(false)

  // Perfil profesional (staff)
  const [editingPro, setEditingPro] = useState(false)
  const [bio, setBio] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [yearsExp, setYearsExp] = useState('')
  const [maxClients, setMaxClients] = useState('20')
  const [savingPro, setSavingPro] = useState(false)
  const [picFile, setPicFile] = useState<File | null>(null)
  const [picPreview, setPicPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const requests: Promise<any>[] = [api.get<any>('/api/auth/me/')]
      if (isAthlete) {
        requests.push(
          api.get<any>('/api/challenges/user-badges/'),
          api.get<any>('/api/challenges/progress/my_dashboard/'),
        )
      }
      const [userRes, badgesRes, progressRes] = await Promise.all(requests)
      setUser(userRes)
      setFirstName(userRes.first_name || '')
      setLastName(userRes.last_name || '')
      setPhone(userRes.phone || '')
      setDni(userRes.dni || '')
      setFitnessGoal(userRes.fitness_goal || '')
      setGoalNotes(userRes.goal_notes || '')
      setBio(userRes.bio || '')
      setSpecialty(userRes.specialty || '')
      setYearsExp(userRes.years_experience != null ? String(userRes.years_experience) : '')
      setMaxClients(userRes.max_clients != null ? String(userRes.max_clients) : '20')
      if (isAthlete) {
        setBadges(Array.isArray(badgesRes) ? badgesRes : badgesRes?.results || [])
        setProgress(progressRes)
      }
    } catch (err) {
      showError(err, 'Error al cargar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

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

  const handleSavePro = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPro(true)
    try {
      const formData = new FormData()
      formData.append('bio', bio)
      formData.append('specialty', specialty)
      if (yearsExp) formData.append('years_experience', yearsExp)
      formData.append('max_clients', maxClients)
      if (picFile) formData.append('profile_picture', picFile)
      await api.patch('/api/auth/me/', formData, { formData: true } as any)
      showSuccess('Presentación actualizada')
      setPicFile(null)
      setEditingPro(false)
      fetchData()
    } catch (err) {
      showError(err, 'Error al actualizar presentación')
    } finally {
      setSavingPro(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPicFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPicPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGoal(true)
    try {
      await api.patch('/api/auth/me/', { fitness_goal: fitnessGoal, goal_notes: goalNotes })
      showSuccess('Objetivo actualizado')
      setEditingGoal(false)
      fetchData()
    } catch (err) {
      showError(err, 'Error al guardar objetivo')
    } finally {
      setSavingGoal(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas no coinciden'); return }
    if (newPassword.length < 6) { setPasswordError('Mínimo 6 caracteres'); return }
    setChangingPassword(true)
    try {
      await api.post('/api/auth/change-password/', { old_password: oldPassword, new_password: newPassword })
      showSuccess('Contraseña cambiada correctamente')
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
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
  const avatarSrc = picPreview || user.profile_picture || null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500 mt-1">Información personal y configuración de tu cuenta</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar card */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Foto de perfil"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-4xl">
                    {initials}
                  </div>
                )}
                {isStaff && editingPro && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </>
                )}
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
              {isStaff && user.specialty && (
                <p className="mt-3 text-xs text-slate-500 font-medium">{user.specialty}</p>
              )}
            </CardContent>
          </Card>

          {/* Nivel (solo atletas) */}
          {isAthlete && progress && (
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

          {/* Logros (solo atletas) */}
          {isAthlete && badges.length > 0 && (
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

        {/* Columna derecha */}
        <div className="lg:col-span-2 space-y-6">

          {/* Objetivo fitness — solo atletas */}
          {isAthlete && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" /> Mi Objetivo
                  </CardTitle>
                  <CardDescription>Tu coach verá esto para personalizar tu plan</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingGoal(!editingGoal)}>
                  {editingGoal ? 'Cancelar' : fitnessGoal ? 'Editar' : 'Agregar'}
                </Button>
              </CardHeader>
              <CardContent>
                {editingGoal ? (
                  <form onSubmit={handleSaveGoal} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Objetivo principal</Label>
                      <Select value={fitnessGoal} onValueChange={setFitnessGoal}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu objetivo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight_loss">🔥 Pérdida de peso</SelectItem>
                          <SelectItem value="muscle_gain">💪 Ganancia muscular</SelectItem>
                          <SelectItem value="endurance">🏃 Resistencia</SelectItem>
                          <SelectItem value="flexibility">🧘 Flexibilidad</SelectItem>
                          <SelectItem value="sport_perf">🏅 Rendimiento deportivo</SelectItem>
                          <SelectItem value="general_fitness">⭐ Fitness general</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notas adicionales <span className="text-slate-400 font-normal">(opcional)</span></Label>
                      <Textarea
                        value={goalNotes}
                        onChange={e => setGoalNotes(e.target.value)}
                        placeholder="Ej: Quiero bajar 5kg antes de julio, tengo una lesión en la rodilla derecha..."
                        rows={3}
                        maxLength={400}
                      />
                    </div>
                    <Button type="submit" disabled={savingGoal || !fitnessGoal} className="bg-emerald-600 hover:bg-emerald-700">
                      {savingGoal ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      Guardar objetivo
                    </Button>
                  </form>
                ) : fitnessGoal ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {fitnessGoal === 'weight_loss' ? '🔥' : fitnessGoal === 'muscle_gain' ? '💪' : fitnessGoal === 'endurance' ? '🏃' : fitnessGoal === 'flexibility' ? '🧘' : fitnessGoal === 'sport_perf' ? '🏅' : '⭐'}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {fitnessGoal === 'weight_loss' ? 'Pérdida de peso' : fitnessGoal === 'muscle_gain' ? 'Ganancia muscular' : fitnessGoal === 'endurance' ? 'Resistencia' : fitnessGoal === 'flexibility' ? 'Flexibilidad' : fitnessGoal === 'sport_perf' ? 'Rendimiento deportivo' : 'Fitness general'}
                      </span>
                    </div>
                    {goalNotes && <p className="text-sm text-slate-500 mt-1">{goalNotes}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Aún no has definido tu objetivo. Tu coach lo necesita para personalizar tu plan.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información personal */}
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
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>DNI</Label>
                      <Input value={dni} onChange={e => setDni(e.target.value)} />
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

          {/* Presentación profesional — solo coach / nutritionist */}
          {isStaff && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Presentación Profesional
                  </CardTitle>
                  <CardDescription>
                    Así te verán los atletas en el directorio del gimnasio
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingPro(!editingPro)}>
                  {editingPro ? 'Cancelar' : 'Editar'}
                </Button>
              </CardHeader>
              <CardContent>
                {editingPro ? (
                  <form onSubmit={handleSavePro} className="space-y-4">
                    {/* Foto */}
                    <div className="space-y-2">
                      <Label>Foto de perfil</Label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-4 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 cursor-pointer transition-colors"
                      >
                        {avatarSrc ? (
                          <img src={avatarSrc} className="w-14 h-14 rounded-xl object-cover" alt="preview" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {picFile ? picFile.name : 'Haz clic para subir una foto'}
                          </p>
                          <p className="text-xs text-slate-400">JPG, PNG — máx. 5 MB</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Biografía</Label>
                        <span className="text-xs text-slate-400">{bio.length} / 600</span>
                      </div>
                      <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        maxLength={600}
                        rows={4}
                        placeholder="Preséntate a los atletas: tu enfoque, metodología, logros..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 space-y-2">
                        <Label>Especialidad</Label>
                        <Input
                          value={specialty}
                          onChange={e => setSpecialty(e.target.value)}
                          placeholder="CrossFit, Nutrición deportiva…"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Años de experiencia</Label>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={yearsExp}
                          onChange={e => setYearsExp(e.target.value)}
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> Máx. clientes
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          value={maxClients}
                          onChange={e => setMaxClients(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={savingPro} className="bg-emerald-600 hover:bg-emerald-700">
                      {savingPro ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Guardar Presentación
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {avatarSrc ? (
                        <img src={avatarSrc} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {user.bio ? (
                          <p className="text-sm text-slate-600 leading-relaxed">{user.bio}</p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">Sin biografía. Haz clic en "Editar" para presentarte.</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                          <Briefcase className="w-3 h-3" /> Especialidad
                        </p>
                        <p className="text-sm font-medium text-slate-700">{user.specialty || '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                          <Star className="w-3 h-3" /> Experiencia
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {user.years_experience != null ? `${user.years_experience} años` : '—'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1 mb-1">
                          <Users className="w-3 h-3" /> Máx. clientes
                        </p>
                        <p className="text-sm font-medium text-slate-700">{user.max_clients ?? 20}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cambiar contraseña */}
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
                    <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nueva Contraseña</Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repite la contraseña" />
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

          {/* Zona peligrosa — solo para atletas */}
          {isAthlete && (
            <Card className="border-rose-200 bg-rose-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Zona peligrosa
                </CardTitle>
                <CardDescription className="text-rose-600/80 text-sm">
                  Las acciones de esta sección son permanentes e irreversibles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Eliminar mi cuenta</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Se eliminarán tu acceso y membresía activa. Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex-shrink-0"
                    onClick={() => { setDeleteConfirmText(''); setDeleteModalOpen(true) }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal confirmación de eliminación de cuenta */}
      <Dialog open={deleteModalOpen} onOpenChange={open => { if (!isDeleting) setDeleteModalOpen(open) }}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-rose-600 px-8 pt-8 pb-6 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold leading-tight">
              Eliminar mi cuenta
            </DialogTitle>
            <DialogDescription className="text-rose-100 mt-1 font-medium">
              Esta acción es permanente e irreversible.
            </DialogDescription>
          </div>

          <div className="px-8 py-6 space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              Al eliminar tu cuenta perderás acceso al gimnasio, se cancelará tu membresía activa
              y todos tus datos de progreso dejarán de estar disponibles.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Escribe <span className="text-rose-600 font-bold">ELIMINAR</span> para confirmar
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                className="border-rose-200 focus:border-rose-400 focus:ring-rose-400/20"
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="ghost"
                className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'ELIMINAR' || isDeleting}
              >
                {isDeleting
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : 'Eliminar mi cuenta'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
