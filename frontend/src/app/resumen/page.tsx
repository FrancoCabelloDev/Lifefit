'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type WorkoutRoutine = {
  id: string
  name: string
  objective: string
  level: string
  duration_minutes: number
  routine_exercises?: Array<{
    id: string
    order: number
    exercise_detail?: { name: string }
    sets: number
    reps: number
  }>
}

type WorkoutSession = {
  id: string
  performed_at: string
  completion_percentage: number
  duration_minutes: number
  status: string
  routine?: string
  points_awarded?: number
}

type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  created_at: string
}

type RecentActivity = {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  color: string
  icon: string
}

export default function ResumenPage() {
  const { user, token, loading: authLoading } = useDashboardAuth()
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([])
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [gyms, setGyms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const isAdmin = user?.role === 'super_admin'
        
        if (isAdmin) {
          // Fetch admin data
          const [usersRes, challengesRes, badgesRes, gymsRes, routinesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/auth/users/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/api/challenges/challenges/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/api/challenges/badges/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/api/gyms/gyms/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/api/workouts/routines/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ])

          if (usersRes.ok) {
            const data = await usersRes.json()
            setAllUsers(Array.isArray(data) ? data : data.results ?? [])
          }
          if (challengesRes.ok) {
            const data = await challengesRes.json()
            setChallenges(Array.isArray(data) ? data : data.results ?? [])
          }
          if (badgesRes.ok) {
            const data = await badgesRes.json()
            setBadges(Array.isArray(data) ? data : data.results ?? [])
          }
          if (gymsRes.ok) {
            const data = await gymsRes.json()
            setGyms(Array.isArray(data) ? data : data.results ?? [])
          }
          if (routinesRes.ok) {
            const data = await routinesRes.json()
            setRoutines(Array.isArray(data) ? data : data.results ?? [])
          }
        } else {
          // Fetch athlete data
          const [routinesResponse, sessionsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/workouts/routines/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}/api/workouts/sessions/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ])

          if (routinesResponse.ok) {
            const routinesJson = await routinesResponse.json()
            const normalizedRoutines = Array.isArray(routinesJson) ? routinesJson : routinesJson.results ?? []
            setRoutines(normalizedRoutines)
          }
          if (sessionsResponse.ok) {
            const sessionsJson = await sessionsResponse.json()
            const normalizedSessions = Array.isArray(sessionsJson) ? sessionsJson : sessionsJson.results ?? []
            setSessions(normalizedSessions)
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, user?.role])

  if (!user) {
    return <DashboardPage user={user} active="/resumen" loading loadingLabel="Sincronizando tu cuenta..." />
  }

  const loadingState = authLoading || loading
  const isAdmin = user.role === 'super_admin'

  // Generate recent activity from all data
  const recentActivity: RecentActivity[] = []
  
  if (isAdmin) {
    challenges.slice(0, 2).forEach(challenge => {
      recentActivity.push({
        id: challenge.id,
        type: 'challenge',
        title: 'Nuevo reto creado',
        description: `"${challenge.name}" por Admin`,
        timestamp: challenge.created_at,
        color: 'bg-amber-100 text-amber-700',
        icon: '🎯'
      })
    })
    
    badges.slice(0, 1).forEach(badge => {
      recentActivity.push({
        id: badge.id,
        type: 'badge',
        title: 'Insignia creada',
        description: `"${badge.name}"`,
        timestamp: badge.created_at,
        color: 'bg-purple-100 text-purple-700',
        icon: '🏅'
      })
    })
    
    routines.slice(0, 1).forEach(routine => {
      recentActivity.push({
        id: routine.id,
        type: 'routine',
        title: 'Rutina publicada',
        description: `"${routine.name}"`,
        timestamp: routine.created_at || new Date().toISOString(),
        color: 'bg-blue-100 text-blue-700',
        icon: '💪'
      })
    })
    
    gyms.slice(0, 1).forEach(gym => {
      recentActivity.push({
        id: gym.id,
        type: 'gym',
        title: 'Gimnasio registrado',
        description: gym.name,
        timestamp: gym.created_at,
        color: 'bg-emerald-100 text-emerald-700',
        icon: '🏢'
      })
    })

    // Sort by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Generate mock chart data (last 7 days)
  const generateChartData = () => {
    const days = ['27 Oct', '28 Oct', '29 Oct', '30 Oct', '31 Oct', '1 Nov', '2 Nov']
    const trainings = [185, 195, 210, 190, 220, 245, 260]
    const activeUsers = [135, 142, 165, 155, 175, 190, 200]
    return { days, trainings, activeUsers }
  }

  const chartData = generateChartData()

  // Quick stats for admin
  const adminStats = [
    { label: 'Usuarios Registrados', value: allUsers.length, icon: '👥', color: 'bg-blue-100 text-blue-700' },
    { label: 'Retos Activos', value: challenges.filter(c => c.status === 'active').length, icon: '🎯', color: 'bg-amber-100 text-amber-700' },
    { label: 'Gimnasios', value: gyms.length, icon: '🏢', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Insignias', value: badges.length, icon: '🏅', color: 'bg-purple-100 text-purple-700' },
  ]

  // Athlete stats
  const quickStats = [
    { label: 'Nivel', value: user.nivel },
    { label: 'Puntos', value: user.puntos },
    { label: 'Rol', value: user.role.replace('_', ' ') },
  ]

  const nextRoutine = routines[0]
  const latestSessions = sessions.slice(0, 3)

  if (isAdmin) {
    // ADMIN DASHBOARD
    return (
      <DashboardPage user={user} active="/resumen" loading={loadingState} loadingLabel="Cargando dashboard...">
        <>
          {/* Header */}
          <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div>
              <p className="text-xs uppercase text-emerald-600">Panel Administrativo</p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Administración de Lifefit
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">Gestiona toda la plataforma desde aquí</p>
            </div>
          </header>

          {/* Stats Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {adminStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white p-5 shadow-lg transition-colors dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`rounded-full p-3 text-2xl ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Chart and Recent Activity */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Chart */}
            <div className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Actividad Diaria (Últimos 7 días)
              </h2>
              <div className="relative h-64">
                <svg className="w-full h-full" viewBox="0 0 600 200">
                  {/* Y-axis labels */}
                  <text x="10" y="20" className="text-xs fill-slate-500">260</text>
                  <text x="10" y="80" className="fill-slate-500 text-xs">195</text>
                  <text x="10" y="140" className="fill-slate-500 text-xs">130</text>
                  <text x="10" y="200" className="fill-slate-500 text-xs">65</text>
                  
                  {/* Grid lines */}
                  <line x1="40" y1="20" x2="580" y2="20" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="40" y1="80" x2="580" y2="80" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="40" y1="140" x2="580" y2="140" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="40" y1="200" x2="580" y2="200" stroke="#e2e8f0" strokeWidth="1" />
                  
                  {/* Trainings line (green) */}
                  <polyline
                    points="75,130 145,115 215,85 285,110 355,60 425,25 495,10"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartData.trainings.map((value, i) => (
                    <circle key={`t-${i}`} cx={75 + i * 70} cy={260 - value} r="4" fill="#10b981" />
                  ))}
                  
                  {/* Active Users line (blue) */}
                  <polyline
                    points="75,165 145,155 215,115 285,135 355,100 425,75 495,60"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartData.activeUsers.map((value, i) => (
                    <circle key={`u-${i}`} cx={75 + i * 70} cy={260 - value} r="4" fill="#3b82f6" />
                  ))}
                  
                  {/* X-axis labels */}
                  {chartData.days.map((day, i) => (
                    <text key={day} x={60 + i * 70} y="215" className="fill-slate-500 text-xs">{day}</text>
                  ))}
                </svg>
                
                {/* Legend */}
                <div className="mt-4 flex gap-4 justify-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-600 dark:text-slate-300">Entrenamientos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-slate-600 dark:text-slate-300">Usuarios Activos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Actividad Reciente
              </h2>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className={`rounded-xl p-2 text-lg ${activity.color}`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No hay actividad reciente
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Users Table */}
          <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Usuarios Registrados
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total: {allUsers.filter(u => u.role !== 'super_admin').length} usuarios
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Registrado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allUsers.filter(u => u.role !== 'super_admin').slice(0, 10).map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'gym_owner' ? 'bg-blue-100 text-blue-800' :
                          u.role === 'coach' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allUsers.filter(u => u.role !== 'super_admin').length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mostrando 10 de {allUsers.filter(u => u.role !== 'super_admin').length} usuarios
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      </DashboardPage>
    )
  }

  // ATHLETE DASHBOARD (original)
  return (
    <DashboardPage user={user} active="/resumen" loading={loadingState} loadingLabel="Sincronizando tu cuenta...">
        <>
          <header className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-emerald-600">Hola de nuevo</p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {user.first_name}, tu progreso esta en marcha
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">Manten tu racha de entrenamiento y desbloquea nuevas insignias.</p>
              </div>
              <div className="flex gap-3">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-slate-100 px-4 py-3 text-center dark:bg-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Proxima rutina recomendada</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">{nextRoutine ? nextRoutine.duration_minutes + ' min' : 'Pendiente'}</span>
              </div>
              {nextRoutine ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{nextRoutine.objective}</p>
                  <ul className="space-y-2">
                    {nextRoutine.routine_exercises?.map((step) => (
                      <li key={step.id} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        #{step.order} {step.exercise_detail?.name} - {step.sets}x{step.reps}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Todavia no hay rutinas disponibles para ti.</p>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ultimas sesiones registradas</h2>
                <span className="text-xs text-slate-500 dark:text-slate-300">{latestSessions.length} sesiones</span>
              </div>
              <ul className="mt-4 space-y-3">
                {latestSessions.length ? (
                  latestSessions.map((session) => (
                    <li key={session.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm transition-colors dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white">{new Date(session.performed_at).toLocaleString()}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Completado: {session.completion_percentage}% - {session.duration_minutes} min - {session.status}
                        {session.points_awarded ? ` - ${session.points_awarded} pts` : ''}
                      </p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Registra tu primera sesion desde el panel de rutinas.</p>
                )}
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg transition-colors dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Estado general</h2>
              <span className="text-xs text-slate-500 dark:text-slate-300">Actualizado al dia de hoy</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                <p className="text-xs uppercase text-slate-400 dark:text-slate-500">Rutinas activas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{routines.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Disponibles para ti</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                <p className="text-xs uppercase text-slate-400 dark:text-slate-500">Sesiones registradas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{sessions.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Historial reciente</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 transition-colors dark:border-slate-800">
                <p className="text-xs uppercase text-slate-400 dark:text-slate-500">Proxima accion</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {nextRoutine ? `Completar ${nextRoutine.name}` : 'Explora las rutinas disponibles'}
                </p>
              </div>
            </div>
          </section>
        </>
    </DashboardPage>
  )
}
