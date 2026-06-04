'use client'

import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { MessageCircle, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLeadsStore } from '@/stores/leads.store'

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 523.25
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

export function MessageNotification() {
  const [supabase] = useState(() => createClient())
  const notifiedIds = useRef(new Set<string>())
  const setUnreadCount = useLeadsStore((s) => s.setUnreadCount)
  const setPosVendaUnreadCount = useLeadsStore((s) => s.setPosVendaUnreadCount)

  useEffect(() => {
    let userId: string | null = null

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? null
    })

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as any
          if (msg.direction !== 'incoming') return
          if (!msg.lead_id) return
          const key = msg.id || `${msg.lead_id}-${Date.now()}`
          if (notifiedIds.current.has(key)) return
          notifiedIds.current.add(key)

          const { data: lead } = await supabase
            .from('leads')
            .select('name, status')
            .eq('id', msg.lead_id)
            .single()

          if (!lead) return

          const isPosVenda = lead.status === 'venda_concluida'
          const content = msg.content || (msg.media_type ? `[${msg.media_type}]` : '')

          playNotificationSound()

          toast.custom(
            (t) => (
              <div
                onClick={() => {
                  const path = isPosVenda ? '/pos-venda' : '/leads'
                  window.location.href = path
                  toast.dismiss(t)
                }}
                className="flex items-start gap-3 w-80 cursor-pointer rounded-xl border border-white/10 bg-[#1a1a2e] p-4 shadow-2xl transition-colors hover:bg-[#1e1e35]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/20 shrink-0">
                  {isPosVenda ? (
                    <UserCheck size={18} className="text-teal-400" />
                  ) : (
                    <MessageCircle size={18} className="text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white truncate">{lead.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      isPosVenda
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {isPosVenda ? 'Pós-Venda' : 'Lead'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{content}</p>
                </div>
              </div>
            ),
            { duration: 5000, position: 'bottom-right' }
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        async () => {
          if (!userId) {
            const { data } = await supabase.auth.getUser()
            userId = data.user?.id ?? null
            if (!userId) return
          }

          const { data: leads } = await supabase
            .from('leads')
            .select('status, unread_count')
            .eq('user_id', userId)

          if (!leads) return

          const unreadCount = leads.filter(
            (l) => l.unread_count != null && l.unread_count > 0 && l.status !== 'venda_concluida'
          ).length
          const posVendaUnreadCount = leads.filter(
            (l) => l.unread_count != null && l.unread_count > 0 && l.status === 'venda_concluida'
          ).length

          setUnreadCount(unreadCount)
          setPosVendaUnreadCount(posVendaUnreadCount)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, setUnreadCount, setPosVendaUnreadCount])

  return <Toaster
    position="bottom-right"
    toastOptions={{
      style: { background: 'transparent', border: 'none', padding: 0 },
      duration: 5000,
    }}
  />
}

