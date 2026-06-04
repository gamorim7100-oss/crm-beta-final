'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Meeting } from '@/types'

export function TodayMeetings() {
  const [meetings, setMeetings] = useState<(Meeting & { lead_name?: string })[]>([])
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data } = await supabase
        .from('meetings')
        .select('*, leads!meetings_lead_id_fkey(name)')
        .eq('user_id', user.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true })

      if (data) {
        setMeetings(
          data.map((m: any) => ({
            ...m,
            lead_name: m.leads?.name,
          }))
        )
      }
    }

    load()
    const interval = setInterval(load, 300000)
    return () => clearInterval(interval)
  }, [supabase])

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-text-primary">Reuniões do Dia</h3>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-auto">
          {meetings.length}
        </span>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">Nenhuma reunião hoje</p>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-card-hover border border-border"
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: meeting.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{meeting.title}</p>
                {meeting.lead_name && (
                  <p className="text-xs text-text-secondary">{meeting.lead_name}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Clock size={10} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary">
                    {new Date(meeting.start_time).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' - '}
                    {new Date(meeting.end_time).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

