'use client'

import { useState, use, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, Search, Stethoscope, UserCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { User, NutritionistMessageThread, NutritionistMessage } from '@/lib/types'

function formatRelative(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

interface AthleteContact {
  athlete_id: string
  athlete_name: string
  athlete_email: string
  last_message?: string
  last_message_at?: string | null
  unread: number
  total: number
}

export default function MensajesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const user = getStoredUser<User>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [selectedContact, setSelectedContact] = useState<AthleteContact | null>(null)
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')

  // ── Nutritionist: fetch threads + assigned athletes ───────────────────────
  const threadsQuery = useQuery({
    queryKey: ['message-threads', gymId],
    queryFn: () => api.get<NutritionistMessageThread[]>('/api/gyms/messages/threads/'),
    enabled: user?.role === 'nutritionist',
    refetchInterval: 15000,
  })

  const assignedAthletesQuery = useQuery({
    queryKey: ['nutritionist-athletes', gymId],
    queryFn: () => api.get<{ results: Array<{ id: string; first_name: string; last_name: string; email: string }> }>(
      '/api/gyms/nutritionist-assignments/my_athletes/'
    ),
    enabled: user?.role === 'nutritionist',
  })

  // Merge: all assigned athletes, enriched with thread data when available
  const contacts: AthleteContact[] = (() => {
    const threads = threadsQuery.data ?? []
    const assigned = assignedAthletesQuery.data?.results ?? []
    const threadMap = new Map(threads.map(t => [t.athlete_id, t]))

    const fromAssigned: AthleteContact[] = assigned.map(a => {
      const t = threadMap.get(a.id)
      return t
        ? { athlete_id: t.athlete_id, athlete_name: t.athlete_name, athlete_email: t.athlete_email, last_message: t.last_message, last_message_at: t.last_message_at, unread: t.unread, total: t.total }
        : { athlete_id: a.id, athlete_name: `${a.first_name} ${a.last_name}`.trim(), athlete_email: a.email, unread: 0, total: 0 }
    })

    // Include threads for athletes no longer in assignments (edge case)
    threads.forEach(t => {
      if (!assigned.find(a => a.id === t.athlete_id)) {
        fromAssigned.push({ athlete_id: t.athlete_id, athlete_name: t.athlete_name, athlete_email: t.athlete_email, last_message: t.last_message, last_message_at: t.last_message_at, unread: t.unread, total: t.total })
      }
    })

    // Sort: unread first, then by last message date
    return fromAssigned.sort((a, b) => {
      if (b.unread !== a.unread) return b.unread - a.unread
      if (a.last_message_at && b.last_message_at) return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      if (a.last_message_at) return -1
      if (b.last_message_at) return 1
      return a.athlete_name.localeCompare(b.athlete_name)
    })
  })()

  useEffect(() => {
    const athleteId = searchParams.get('athlete')
    if (athleteId && contacts.length > 0) {
      const contact = contacts.find(c => c.athlete_id === athleteId)
      if (contact) setSelectedContact(contact)
    }
  }, [searchParams, contacts.length])

  const messagesQuery = useQuery({
    queryKey: ['messages-with', gymId, selectedContact?.athlete_id],
    queryFn: () => api.get<NutritionistMessage[]>('/api/gyms/messages/with_athlete/', {
      params: { athlete_id: selectedContact!.athlete_id },
    }),
    enabled: !!selectedContact,
    refetchInterval: 10000,
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post('/api/gyms/messages/', {
      athlete: selectedContact!.athlete_id,
      body,
    }),
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['messages-with', gymId, selectedContact?.athlete_id] })
      queryClient.invalidateQueries({ queryKey: ['message-threads', gymId] })
      queryClient.invalidateQueries({ queryKey: ['recent-messages', gymId] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const filtered = contacts.filter(c =>
    !search || c.athlete_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact) return
    sendMutation.mutate(newMessage.trim())
  }

  if (!user) return null

  // ── Vista atleta ─────────────────────────────────────────────────────────
  if (user.role === 'athlete') {
    return <AthleteMessagesView gymId={gymId} user={user} />
  }

  if (user.role !== 'nutritionist') return null

  const isLoading = threadsQuery.isLoading || assignedAthletesQuery.isLoading

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comunicación con tus clientes</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <div className="flex h-full">
          {/* Contact list */}
          <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-8 h-8 text-xs rounded-xl border-slate-200"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
                  <UserCircle2 className="w-8 h-8 text-slate-200" />
                  <p className="text-xs text-slate-400">Sin clientes asignados</p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {filtered.map(c => (
                    <button
                      key={c.athlete_id}
                      onClick={() => setSelectedContact(c)}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl transition-colors text-left ${
                        selectedContact?.athlete_id === c.athlete_id
                          ? 'bg-emerald-50 border border-emerald-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {getInitials(c.athlete_name)}
                        </div>
                        {c.unread > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                            {c.unread}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${c.unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                            {c.athlete_name}
                          </p>
                          {c.last_message_at && (
                            <span className="text-[9px] text-slate-400 flex-shrink-0">{formatRelative(c.last_message_at)}</span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${c.unread > 0 ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                          {c.last_message || 'Iniciar conversación'}
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
            {!selectedContact ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Selecciona una conversación</p>
                  <p className="text-xs text-slate-400 mt-1">Elige un cliente de la lista para ver los mensajes</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {getInitials(selectedContact.athlete_name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedContact.athlete_name}</p>
                    <p className="text-[10px] text-slate-400">{selectedContact.total > 0 ? `${selectedContact.total} mensajes` : 'Nueva conversación'}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messagesQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
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
                      const isMe = m.sender_is_nutritionist
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-sm'
                              : 'bg-slate-100 text-slate-800 rounded-bl-sm'
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

                {/* Input */}
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
                    disabled={!newMessage.trim() || !selectedContact || sendMutation.isPending}
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

// ── Vista de mensajes para el atleta ────────────────────────────────────────
function AthleteMessagesView({ gymId, user }: { gymId: string; user: User }) {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [newMessage, setNewMessage] = useState('')

  const messagesQuery = useQuery({
    queryKey: ['athlete-messages', gymId],
    queryFn: () => api.get<NutritionistMessage[]>('/api/gyms/messages/'),
    refetchInterval: 10000,
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post('/api/gyms/messages/', { athlete: user.id, body }),
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['athlete-messages', gymId] })
    },
    onError: () => {},
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  // Auto-focus input when messages load (arrives from CTA or direct nav)
  useEffect(() => {
    if (!messagesQuery.isLoading) {
      inputRef.current?.focus()
    }
  }, [messagesQuery.isLoading])

  const rawMessages = Array.isArray(messagesQuery.data)
    ? messagesQuery.data
    : (messagesQuery.data as any)?.results ?? []
  const messages = [...rawMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const nutritionistName = messages.find(m => m.sender_is_nutritionist)?.sender_name ?? 'Tu nutricionista'

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendMutation.mutate(newMessage.trim())
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comunicación con tu nutricionista</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{nutritionistName}</p>
            <p className="text-[10px] text-slate-400">Nutricionista asignado</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messagesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messagesQuery.isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200" />
              <p className="text-sm text-slate-500">No tienes nutricionista asignado aún.</p>
              <p className="text-xs text-slate-400">Contacta a tu gimnasio para que te asignen uno.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200" />
              <p className="text-xs text-slate-400">Sin mensajes aún. ¡Inicia la conversación!</p>
            </div>
          ) : (
            messages.map(m => {
              const isMe = !m.sender_is_nutritionist
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
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

        {/* Input */}
        <div className="border-t border-slate-100">
          {sendMutation.isError && (
            <p className="px-3 pt-2 text-xs text-rose-500">
              {(sendMutation.error as any)?.data?.detail ?? 'No tienes nutricionista asignado. Contacta a tu gimnasio.'}
            </p>
          )}
          <form onSubmit={handleSend} className="p-3 flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder="Escribe un mensaje..."
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
