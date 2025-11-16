'use client'

import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import { useDashboardAuth } from '@/hooks/useDashboardAuth'
import { useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export default function SeguridadPage() {
  const { user, token, loading: authLoading, setUser } = useDashboardAuth()
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [googleMessage, setGoogleMessage] = useState('')

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordForm),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'No pudimos actualizar tu contraseña.')
      }
      setPasswordMessage('Contraseña actualizada correctamente.')
      setPasswordForm({ old_password: '', new_password: '' })
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Error al actualizar contraseña.')
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/disconnect/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('No pudimos desvincular Google.')
      }
      setGoogleMessage('Cuenta de Google desconectada.')
      if (user) {
        setUser?.({ ...user, is_google_account: false })
      }
    } catch (error) {
      setGoogleMessage(error instanceof Error ? error.message : 'Error al desvincular.')
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-500">Cargando seguridad...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar user={user} active="/seguridad" />

        <main className="flex-1 space-y-6">
          <header className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-xs uppercase text-emerald-600">Seguridad</p>
            <h1 className="text-2xl font-semibold text-slate-900">Protege tu cuenta</h1>
            <p className="text-sm text-slate-500">Actualiza tu contraseña o desconecta proveedores externos.</p>
          </header>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
            <form className="mt-4 space-y-3" onSubmit={handlePasswordChange}>
              <input
                type="password"
                placeholder="Contraseña actual"
                value={passwordForm.old_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, old_password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                required
              />
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                required
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Actualizar contraseña
              </button>
              {passwordMessage && <p className="text-center text-xs text-slate-500">{passwordMessage}</p>}
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Conexiones</h2>
            <p className="text-sm text-slate-500">
              {user.is_google_account ? 'Tu cuenta está vinculada con Google.' : 'Google no está vinculado actualmente.'}
            </p>
            <button
              onClick={handleDisconnectGoogle}
              disabled={!user.is_google_account}
              className="mt-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Desvincular Google
            </button>
            {googleMessage && <p className="mt-2 text-xs text-slate-500">{googleMessage}</p>}
          </section>
        </main>
      </div>
    </div>
  )
}
