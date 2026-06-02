'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { X, AlertTriangle, Info, CheckCircle, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  target_audience: string
  is_active: boolean
}

const BANNER_STYLES = {
  info: { bg: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
  warning: { bg: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  success: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: CheckCircle },
  error: { bg: 'bg-rose-50 border-rose-200 text-rose-800', icon: Megaphone },
}

export default function GlobalBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get<any>('/api/system/announcements/active/')
        setAnnouncements(Array.isArray(res) ? res : res?.results || [])
      } catch {
        // silent fail
      }
    }
    fetchAnnouncements()
  }, [])

  const visible = announcements.filter(a => !dismissed.has(a.id))

  if (visible.length === 0) return null

  return (
    <div className="space-y-1 px-4 pt-2">
      {visible.map(a => {
        const style = BANNER_STYLES[a.type] || BANNER_STYLES.info
        const Icon = style.icon
        return (
          <div key={a.id} className={`${style.bg} border px-4 py-2.5 rounded-lg flex items-start gap-3 text-sm`}>
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{a.title}</p>
              {a.message && <p className="opacity-80 mt-0.5">{a.message}</p>}
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(a.id))}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}