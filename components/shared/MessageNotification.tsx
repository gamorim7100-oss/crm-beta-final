'use client'

import { useEffect, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { MessageCircle, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLeadsStore } from '@/stores/leads.store'

// AudioContext compartilhado — criado após interação do usuário
let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx) {
      sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume()
    }
    return sharedCtx
  } catch {
    return null
  }
}

function playLeadSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const notes = [880, 1100]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * 0.15
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
    osc.start(start)
    osc.stop(start + 0.2)
  })
}

function playPosVendaSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(440, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.1)
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.55)
}

function sendBrowserNotification(title: string, body: string, tag: string, onClick: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  // Só envia notificação do sistema quando a aba está em background
  if (document.visibilityState === 'visible') return
  try {
    const n = new Notification(title, { body, tag, icon: '/sidebar-logo.svg', silent: true })
    n.onclick = () => { window.focus(); onClick(); n.close() }
  } catch {}
}

function showToast(senderName: string, content: string, isPosVenda: boolean, path: string) {
  const origem = isPosVenda ? 'Pós-Venda' : 'Lead'
  toast.custom(
    (t) => (
      <div
        onClick={() => { window.location.href = path; toast.dismiss(t) }}
        className={`flex items-start gap-3 w-80 cursor-pointer rounded-xl border p-4 shadow-2xl transition-colors ${
          isPosVenda
            ? 'bg-bg-card border-teal-500/30 hover:border-teal-500/50'
            : 'bg-bg-card border-blue-500/30 hover:border-blue-500/50'
        }`}
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
          isPosVenda ? 'bg-teal-500/15' : 'bg-blue-500/15'
        }`}>
          {isPosVenda
            ? <UserCheck size={18} className="text-teal-400" />
            : <MessageCircle size={18} className="text-blue-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-text-primary truncate">{senderName}</span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isPosVenda ? 'bg-teal-500/15 text-teal-400' : 'bg-blue-500/15 text-blue-400'
            }`}>
              {origem}
            </span>
          </div>
          <p className="text-xs text-text-secondary truncate">{content || 'Nova mensagem'}</p>
        </div>
      </div>
    ),
    { duration: 6000, position: 'bottom-right' }
  )
}

export function MessageNotification() {
  const [supabase] = useState(() => createClient())
  const notifiedIds = useRef(new Set<string>())
  const lastChecked = useRef<string>(new Date().toISOString())
  const setUnreadCount = useLeadsStore((s) => s.setUnreadCount)
  const setPosVendaUnreadCount = useLeadsStore((s) => s.setPosVendaUnreadCount)

  // Inicializar AudioContext e pedir permissão na primeira interação
  useEffect(() => {
    const initOnInteraction = () => {
      getAudioContext()
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      document.removeEventListener('click', initOnInteraction)
      document.removeEventListener('keydown', initOnInteraction)
    }
    document.addEventListener('click', initOnInteraction)
    document.addEventListener('keydown', initOnInteraction)
    return () => {
      document.removeEventListener('click', initOnInteraction)
      document.removeEventListener('keydown', initOnInteraction)
    }
  }, [])

  const processNewMessage = async (msgId: string, leadId: string, content: string, mediaType: string | null) => {
    if (notifiedIds.current.has(msgId)) return
    notifiedIds.current.add(msgId)

    const { data: lead } = await supabase
      .from('leads')
      .select('name, status')
      .eq('id', leadId)
      .single()

    if (!lead) return

    const isPosVenda = lead.status === 'venda_concluida'
    const senderName = lead.name || 'Novo contato'
    const displayContent = content?.startsWith('[') && mediaType
      ? `Mídia: ${mediaType}`
      : content || 'Nova mensagem'
    const path = isPosVenda ? '/pos-venda' : '/leads'

    isPosVenda ? playPosVendaSound() : playLeadSound()
    sendBrowserNotification(`${senderName} • ${isPosVenda ? 'Pós-Venda' : 'Lead'}`, displayContent, leadId, () => { window.location.href = path })
    showToast(senderName, displayContent, isPosVenda, path)
  }

  const updateUnreadCounts = async (userId: string) => {
    const { data: leads } = await supabase
      .from('leads')
      .select('status, unread_count')
      .eq('user_id', userId)
    if (!leads) return
    setUnreadCount(leads.filter((l) => (l.unread_count ?? 0) > 0 && l.status !== 'venda_concluida').length)
    setPosVendaUnreadCount(leads.filter((l) => (l.unread_count ?? 0) > 0 && l.status === 'venda_concluida').length)
  }

  useEffect(() => {
    let userId: string | null = null

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? null
    })

    // Polling de fallback: verifica mensagens novas a cada 5s
    const pollMessages = async () => {
      const since = lastChecked.current
      lastChecked.current = new Date().toISOString()

      const { data: newMsgs } = await supabase
        .from('messages')
        .select('id, lead_id, content, media_type, direction, timestamp')
        .eq('direction', 'incoming')
        .gt('timestamp', since)
        .order('timestamp', { ascending: true })

      for (const msg of newMsgs || []) {
        await processNewMessage(msg.id, msg.lead_id, msg.content, msg.media_type)
      }

      if (userId) await updateUnreadCounts(userId)
    }

    // Real-time via Supabase (funciona se a publication estiver habilitada)
    const channel = supabase
      .channel('global-messages-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as any
        if (msg.direction !== 'incoming') return
        lastChecked.current = new Date().toISOString()
        await processNewMessage(msg.id, msg.lead_id, msg.content, msg.media_type)
        if (userId) await updateUnreadCounts(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, async () => {
        if (!userId) {
          const { data } = await supabase.auth.getUser()
          userId = data.user?.id ?? null
        }
        if (userId) await updateUnreadCounts(userId)
      })
      .subscribe()

    // Polling a cada 5s como garantia
    pollMessages()
    const pollInterval = setInterval(pollMessages, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, setUnreadCount, setPosVendaUnreadCount])

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' },
        duration: 6000,
      }}
    />
  )
}
