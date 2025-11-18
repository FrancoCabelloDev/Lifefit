'use client'

import DashboardPage from '@/components/dashboard/DashboardPage'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useTheme } from '@/hooks/useTheme'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type GymOption = {
  id: string
  name: string
}

export default function PerfilPage() {
  const { user, token, loading: authLoading, setUser } = useDashboardAuth()
  const { theme } = useTheme()
  const [gyms, setGyms] = useState<GymOption[]>([])
  const [formValues, setFormValues] = useState({ first_name: '', last_name: '', gym: '' })
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (user) {
      setFormValues({
        first_name: user.first_name,
        last_name: user.last_name,
        gym: user.gym ? String(user.gym) : '',
      })
    }
  }, [user])

  useEffect(() => {
    if (!token) return
    const fetchGyms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/gyms/gyms/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setGyms(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch (error) {
        console.error(error)
      }
    }
    fetchGyms()
  }, [token])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      })
      if (!response.ok) {
        throw new Error('No pudimos actualizar tu perfil.')
      }
      const data = await response.json()
      setUser?.(data)
      localStorage.setItem('lifefit_user', JSON.stringify(data))
      setStatusMessage('Perfil actualizado correctamente.')
    } catch (error) {
      console.error(error)
      setStatusMessage('Ocurrió un error al guardar.')
    }
  }

  if (!user) {
    return <DashboardPage user={user} active="/perfil" loading loadingLabel="Cargando perfil..." />
  }

  return (
    <DashboardPage user={user} active="/perfil" loading={authLoading} loadingLabel="Cargando perfil...">
      <>
        <header className="rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 dark:text-slate-100">
          <p className="text-xs uppercase text-emerald-600">Perfil</p>
          <h1 className="text-2xl font-semibold">Información básica</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Actualiza tus datos para que tu coach te identifique.</p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 dark:text-slate-100">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre</label>
              <input
                type="text"
                value={formValues.first_name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, first_name: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Apellido</label>
              <input
                type="text"
                value={formValues.last_name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, last_name: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Gimnasio</label>
              <select
                value={formValues.gym}
                onChange={(event) => setFormValues((prev) => ({ ...prev, gym: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Sin asignar</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Guardar cambios
            </button>
            {statusMessage && <p className="text-center text-xs text-slate-500 dark:text-slate-300">{statusMessage}</p>}
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-900 dark:text-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tema de la aplicación</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Actualmente estás usando el modo {theme === 'dark' ? 'oscuro' : 'claro'}.
              </p>
            </div>
            <ThemeToggle label="Cambiar modo" />
          </div>
        </section>
      </>
    </DashboardPage>
  )
}
