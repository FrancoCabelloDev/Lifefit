'use client'

import { useState, use, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, Search } from 'lucide-react'
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

export default function MensajesPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const user = getStoredUser<User>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [selectedThread, setSelectedThread] = useState<NutritionistMessageThread | null>(null)
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    const athleteId = searchParams.get('athlete')
    if (athleteId && threadsQuery.data) {
      const thread = threadsQuery.data.find(t => t.athlete_id === athleteId)
      if (thread) setSelectedThread(thread)
    }
  }, [searchParams])

  const threadsQuery = useQuery({
    queryKey: ['message-threads', gymId],
    queryFn: () => api.get<NutritionistMessageThread[]>('/api/gyms/messages/threads/'),
    refetchInterval: 15000,
  })

  const messagesQuery = useQuery({
    queryKey: ['messages-with', gymId, selectedThread?.athlete_id],
    queryFn: () => api.get<NutritionistMessage[]>('/api/gyms/messages/with_athlete/', {
      params: { athlete_id: selectedThread!.athlete_id },
    }),
    enabled: !!selectedThread,
    refetchInterval: 10000,
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post('/api/gyms/messages/', {
      athlete: selectedThread!.athlete_id,
      body,
    }),
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['messages-with', gymId, selectedThread?.athlete_id] })
      queryClient.invalidateQueries({ queryKey: ['message-threads', gymId] })
      queryClient.invalidateQueries({ queryKey: ['recent-messages', gymId] })
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const threads = (threadsQuery.data || []).filter(t =>
    !search || t.athlete_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedThread) return
    sendMutation.mutate(newMessage.trim())
  }

  if (!user || user.role !== 'nutritionist') return null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mensajes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comunicación con tus clientes</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <div className="flex h-full">
          {/* Thread list */}
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
              {threadsQuery.isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-200" />
                  <p className="text-xs text-slate-400">Sin conversaciones</p>
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
                    {getInitials(selectedThread.athlete_name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedThread.athlete_name}</p>
                    <p className="text-[10px] text-slate-400">{selectedThread.total} mensajes en total</p>
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
                    disabled={!newMessage.trim() || sendMutation.isPending}
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
