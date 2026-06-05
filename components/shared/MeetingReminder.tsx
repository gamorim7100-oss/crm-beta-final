'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function playAlarmSound() {
  try {
    const ctx: AudioContext = (window as any).__markelloCtx || (() => {
      const c = new (window.AudioContext || (window as any).webkitAudioContext)();
      (window as any).__markelloCtx = c;
      return c;
    })()
    if (ctx.state === 'suspended') ctx.resume()

    const pattern = [0, 0.22, 0.44]
    pattern.forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.value = 740
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01)
      gain.gain.setValueAtTime(0.25, t + 0.12)
      gain.gain.linearRampToValueAtTime(0, t + 0.18)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  } catch {}
}

export function MeetingReminder() {
  const [supabase] = useState(() => createClient())
  const notifiedIds = useRef(new Set<string>())

  useEffect(() => {
    const checkMeetings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const in10 = new Date(now.getTime() + 10 * 60 * 1000)
      const in11 = new Date(now.getTime() + 11 * 60 * 1000)

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, start_time, description')
        .eq('user_id', user.id)
        .gte('start_time', now.toISOString())
        .lte('start_time', in11.toISOString())

      if (!meetings?.length) return

      for (const meeting of meetings) {
        if (notifiedIds.current.has(meeting.id)) continue

        const start = new Date(meeting.start_time)
        const diffMin = Math.round((start.getTime() - now.getTime()) / 60000)

        // Só avisa entre 9 e 11 minutos antes
        if (diffMin < 9 || diffMin > 11) continue

        notifiedIds.current.add(meeting.id)

        const startStr = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const title = meeting.title || 'Reunião'

        playAlarmSound()

        // Notificação do browser
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(`⏰ Reunião em ${diffMin} minutos!`, {
              body: `${title} às ${startStr} — Prepare-se!`,
              icon: '/sidebar-logo.svg',
              tag: `meeting-${meeting.id}`,
              silent: true,
              requireInteraction: true,
            })
            n.onclick = () => {
              window.focus()
              window.location.href = '/agenda'
              n.close()
            }
          } catch {}
        }

        // Toast de alarme
        toast.custom(
          (t) => (
            <div className="w-80 rounded-xl border border-orange-500/40 bg-bg-card p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 shrink-0 animate-bounce-sm">
                  <Calendar size={20} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold text-orange-400">⏰ Reunião em {diffMin} min</span>
                    <button
                      onClick={() => toast.dismiss(t)}
                      className="text-text-secondary hover:text-text-primary transition-colors shrink-0 ml-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Começa às {startStr} — Se ajuste para a reunião!
                  </p>
                  <button
                    onClick={() => {
                      window.location.href = '/agenda'
                      toast.dismiss(t)
                    }}
                    className="mt-2.5 w-full px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
                  >
                    Ver na Agenda
                  </button>
                </div>
              </div>
            </div>
          ),
          { duration: Infinity, position: 'top-right' }
        )
      }
    }

    // Verifica imediatamente e depois a cada minuto
    checkMeetings()
    const interval = setInterval(checkMeetings, 60 * 1000)
    return () => clearInterval(interval)
  }, [supabase])

  return null
}
