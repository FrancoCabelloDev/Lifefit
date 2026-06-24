'use client'

import { useState, use, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, Dumbbell, Search, UserPlus, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User } from '@/lib/types'

type CoachMessage = {
  id: string
  coach: string
  athlete: string
  athlete_name: string
  sender_name: string
  sender_is_coach: boolean
  body: string
  is_read: boolean
  created_at: string
}

type CoachThread = {
  athlete_id: string
  athlete_name: string
  athlete_email: string
  last_message: string
  last_message_at: string | null
  unread: number
  total: number
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ── Vista coach ──────────────────────────────────────────────────────────────
function CoachMessagesView({ gymId, user }: { gymId: string; user: User }) {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedThread, setSelectedThread] = useState<CoachThread | null>(null)
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')

  const threadsQuery = useQuery({
    queryKey: ['coach-message-threads', gymId],
    queryFn: () => api.get<CoachThread[]>('/api/gyms/coach-messages/threads/'),
    enabled: user?.role === 'coach',
    refetchInterval: 15000,
  })

  const assignedAthletesQuery = useQuery({
    queryKey: ['coach-assigned-athletes', gymId],
    queryFn: () => api.get<{ results: Array<{ id: string; first_name: string; last_name: string; email: string }> }>(
      '/api/gyms/coach-messages/my_athletes/'
    ),
    enabled: user?.role === 'coach',
  })

  const messagesQuery = useQuery({
    queryKey: ['coach-messages-with', gymId, selectedThread?.athlete_id],
    queryFn: () => api.get<CoachMessage[]>('/api/gyms/coach-messages/with_athlete/', {
      params: { athlete_id: selectedThread!.athlete_id },
    }),
    enabled: !!selectedThread,
    refetchInterval: 10000,
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post('/api/gyms/coach-messages/', {
      athlete: selectedThread!.athlete_id,
      body,
    }),
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['coach-messages-with', gymId, selectedThread?.athlete_id] })
      queryClient.invalidateQueries({ queryKey: ['coach-message-threads', gymId] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  // Merge: todos los atletas asignados + threads existentes (misma lógica que nutricionista)
  const contacts: CoachThread[] = (() => {
    const existingThreads = threadsQuery.data ?? []
    const assigned = assignedAthletesQuery.data?.results ?? []
    const threadMap = new Map(existingThreads.map(t => [t.athlete_id, t]))

    const merged: CoachThread[] = assigned.map(a => {
      const t = threadMap.get(a.id)
      return t ?? {
        athlete_id:    a.id,
        athlete_name:  `${a.first_name} ${a.last_name}`.trim(),
        athlete_email: a.email,
        last_message:  '',
        last_message_at: null,
        unread: 0,
        total:  0,
      }
    })

    // Incluir threads de atletas ya no en las asignaciones activas
    existingThreads.forEach(t => {
      if (!assigned.find(a => a.id === t.athlete_id)) merged.push(t)
    })

    return merged.sort((a, b) => {
      if (b.unread !== a.unread) return b.unread - a.unread
      if (a.last_message_at && b.last_message_at)
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      if (a.last_message_at) return -1
      if (b.last_message_at) return 1
      return a.athlete_name.localeCompare(b.athlete_name)
    })
  })()

  const threads = contacts.filter(t =>
    !search || t.athlete_name.toLowerCase().includes(search.toLowerCase())
  )

  const isLoading = threadsQuery.isLoading || assignedAthletesQuery.isLoading
  const isError = threadsQuery.isError || assignedAthletesQuery.isError

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedThread) return
    sendMutation.mutate(newMessage.trim())
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comunicación con tus atletas</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <div className="flex h-full">
          {/* Thread list */}
          <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar atleta..."
                  className="pl-8 h-8 text-xs rounded-xl border-slate-200"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
                  <MessageSquare className="w-8 h-8 text-rose-200" />
                  <p className="text-xs text-rose-400">Error al cargar</p>
                  <p className="text-[10px] text-slate-400">Intenta recargar la página</p>
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-200" />
                  <p className="text-xs text-slate-400">Sin atletas asignados</p>
                  <p className="text-[10px] text-slate-300">Asigna atletas en el panel de equipo</p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {threads.map(t => (
                    <button
                      key={t.athlete_id}
                      onClick={() => setSelectedThread(t)}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl transition-colors text-left ${
                        selectedThread?.athlete_id === t.athlete_id
                          ? 'bg-emerald-50 border border-emerald-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {getInitials(t.athlete_name)}
                        </div>
                        {t.unread > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {t.unread}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${t.unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                            {t.athlete_name}
                          </p>
                          {t.last_message_at && (
                            <span className="text-[9px] text-slate-400 flex-shrink-0">{formatRelative(t.last_message_at)}</span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${t.unread > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                          {t.last_message || 'Sin mensajes'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedThread ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">Selecciona una conversación</p>
                <p className="text-xs text-slate-400">Elige un atleta de la lista</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {getInitials(selectedThread.athlete_name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedThread.athlete_name}</p>
                    <p className="text-[10px] text-slate-400">{selectedThread.total} mensajes en total</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messagesQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                          <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : (messagesQuery.data || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                      <MessageSquare className="w-8 h-8 text-slate-200" />
                      <p className="text-xs text-slate-400">Inicia la conversación</p>
                    </div>
                  ) : (
                    (messagesQuery.data || []).map(m => {
                      const isMe = m.sender_is_coach
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                            isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                          }`}>
                            <p className="text-sm leading-relaxed">{m.body}</p>
                            <p className={`text-[9px] mt-1 ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {new Date(m.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-center gap-2">
                  <Input
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 h-9 rounded-xl text-sm border-slate-200"
                    disabled={sendMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || !selectedThread || sendMutation.isPending}
                    className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Vista atleta ──────────────────────────────────────────────────────────────
function AthleteCoachMessagesView({ gymId, user }: { gymId: string; user: User }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [newMessage, setNewMessage] = useState('')

  const assignmentQuery = useQuery({
    queryKey: ['athlete-coach-assignment', gymId],
    queryFn: () => api.get<{ count: number; results: Array<{ is_active: boolean }> }>('/api/gyms/coach-assignments/'),
    staleTime: 60_000,
  })

  const messagesQuery = useQuery({
    queryKey: ['athlete-coach-messages', gymId],
    queryFn: () => api.get<CoachMessage[]>('/api/gyms/coach-messages/my_conversation/'),
    refetchInterval: 10000,
    enabled: assignmentQuery.isSuccess && (assignmentQuery.data?.results ?? []).some(a => a.is_active),
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post('/api/gyms/coach-messages/', { athlete: user.id, body }),
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['athlete-coach-messages', gymId] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const hasCoach = (assignmentQuery.data?.results ?? []).some(a => a.is_active)
  const isCheckingAssignment = assignmentQuery.isLoading
  const messages = messagesQuery.data || []
  const coachName = messages.find(m => m.sender_is_coach)?.sender_name ?? 'Tu coach'

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendMutation.mutate(newMessage.trim())
  }

  if (isCheckingAssignment) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes con mi Coach</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comunicación directa con tu coach asignado</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 flex items-center justify-center" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!hasCoach) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes con mi Coach</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comunicación directa con tu coach asignado</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-5 text-center px-8"
          style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <p className="text-base font-semibold text-slate-800">Aún no tienes coach asignado</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Elige un coach del directorio para poder comunicarte con él y recibir tu plan de entrenamiento.
            </p>
          </div>
          <button
            onClick={() => router.push(`/${gymId}/panel/mi-equipo`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
            style={{ transition: 'background-color 150ms, transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            <UserPlus className="w-4 h-4" />
            Elegir mi coach
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes con mi Coach</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comunicación directa con tu coach asignado</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{coachName}</p>
            <p className="text-[10px] text-slate-400">Coach asignado</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messagesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200" />
              <p className="text-xs text-slate-400">Sin mensajes aún. ¡Inicia la conversación!</p>
            </div>
          ) : (
            messages.map(m => {
              const isMe = !m.sender_is_coach
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                    isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{m.body}</p>
                    <p className={`text-[9px] mt-1 ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-100">
          {sendMutation.isError && (
            <p className="px-3 pt-2 text-xs text-rose-500">{(sendMutation.error as any)?.data?.detail ?? 'No tienes coach asignado. Ve al Directorio para elegir uno.'}</p>
          )}
          <form onSubmit={handleSend} className="p-3 flex items-center gap-2">
            <Input
              placeholder="Escribe un mensaje a tu coach..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="flex-1 h-9 rounded-xl text-sm border-slate-200"
              disabled={sendMutation.isPending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function MensajesCoachPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const user = getStoredUser<User>()

  if (!user) return null
  if (user.role === 'coach') return <CoachMessagesView gymId={gymId} user={user} />
  if (user.role === 'athlete') return <AthleteCoachMessagesView gymId={gymId} user={user} />
  return null
}
