'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, X, User, Check, CheckCheck, Trash2, Image, Mic, Video, FileText } from 'lucide-react'
import { AudioPlayer } from './AudioPlayer'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Message } from '@/types'
import { formatPhone } from '@/lib/business-rules'

interface ChatPanelProps {
  lead: Lead
  onClose: () => void
  onDelete?: (lead: Lead) => void
  fullWidth?: boolean
}

export function ChatPanel({ lead, onClose, onDelete, fullWidth }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [sendingMedia, setSendingMedia] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    lead.avatar_url && lead.avatar_url !== 'none' ? lead.avatar_url : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaPreview, setMediaPreview] = useState<{ data: string; type: string; name: string } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [supabase] = useState(() => createClient())

  // Busca foto de perfil do WhatsApp
  useEffect(() => {
    if (avatarUrl || lead.avatar_url === 'none') return
    fetch('/api/evolution/profile-picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.url) setAvatarUrl(d.url) })
      .catch(() => {})
  }, [lead.id, avatarUrl])

  useEffect(() => {
    let lastTimestamp = ''

    const fetchMessages = async (initial = false) => {
      if (initial) setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('timestamp', { ascending: true })
        .limit(50)

      if (data) {
        setMessages(data)
        if (data.length > 0) lastTimestamp = data[data.length - 1].timestamp
      }
      if (initial) setLoading(false)
    }

    // Polling: verifica novas mensagens a cada 4 segundos como fallback
    const pollNewMessages = async () => {
      if (!lastTimestamp) return
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', lead.id)
        .gt('timestamp', lastTimestamp)
        .order('timestamp', { ascending: true })

      if (data?.length) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const newMsgs = data.filter((m) => !existingIds.has(m.id))
          if (!newMsgs.length) return prev
          lastTimestamp = data[data.length - 1].timestamp
          return [...prev, ...newMsgs]
        })
      }
    }

    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    }).catch(() => {})

    fetchMessages(true)

    // Real-time via Supabase (funciona se a tabela estiver na publication)
    const channel = supabase
      .channel(`messages:${lead.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `lead_id=eq.${lead.id}`,
      }, (payload: any) => {
        const msg = payload.new as Message
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev
          if (msg.timestamp > lastTimestamp) lastTimestamp = msg.timestamp
          return [...prev, msg]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `lead_id=eq.${lead.id}`,
      }, (payload: any) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
        )
      })
      .subscribe()

    // Fallback: polling a cada 4s
    const pollInterval = setInterval(pollNewMessages, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [lead.id, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFilePick = useCallback((accept: string, type: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0]
      if (!file) return
      if (file.size > 16 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 16MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setMediaPreview({ data: base64, type, name: file.name })
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      setRecordingDuration(0)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64 = event.target?.result as string
          setMediaPreview({ data: base64, type: 'audio', name: 'Gravacao.webm' })
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((t) => t.stop())
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        setRecordingDuration(0)
      }

      recorder.start(100)
      setIsRecording(true)
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1)
      }, 1000)
    } catch {
      alert('Permissão do microfone negada.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleSendMedia = async () => {
    if (!mediaPreview || sendingMedia) return
    setSendingMedia(true)
    try {
      const response = await fetch('/api/media/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          media: mediaPreview.data,
          mediaType: mediaPreview.type,
          fileName: mediaPreview.name,
          caption: newMessage.trim() || undefined,
        }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Erro ao enviar mídia')
      }
      setMediaPreview(null)
      setNewMessage('')
    } catch (error: any) {
      console.error('Media send error:', error)
      alert(error.message)
    } finally {
      setSendingMedia(false)
    }
  }

  const handleSuggest = async () => {
    if (suggesting) return
    setSuggesting(true)
    setSuggestion('')
    setNewMessage('')

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })

      if (!response.ok) throw new Error('Erro ao consultar Alex')
      const data = await response.json()
      setSuggestion(data.suggestion || '')
    } catch (error) {
      console.error('Alex error:', error)
      setSuggestion('Erro ao gerar sugestão.')
    } finally {
      setSuggesting(false)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, content: newMessage.trim() }),
      })

      if (!response.ok) throw new Error('Erro ao enviar')
      setNewMessage('')
    } catch (error) {
      console.error('Send error:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleScroll = () => {
    const container = chatContainerRef.current
    if (!container || container.scrollTop > 0) return

    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current)
    scrollDebounceRef.current = setTimeout(async () => {
      const scrollHeightBefore = container.scrollHeight

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('timestamp', { ascending: false })
        .lt('timestamp', messages[0]?.timestamp || '')
        .limit(50)

      if (data?.length) {
        setMessages((prev) => [...data.reverse(), ...prev])
        requestAnimationFrame(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight - scrollHeightBefore
          }
        })
      }
    }, 300)
  }

  return (
    <div className={`${fullWidth ? 'w-full border-l border-border' : 'w-full lg:w-[400px] border border-border rounded-xl shadow-lg overflow-hidden'} flex flex-col h-full bg-bg-card`}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-card border-b border-border shrink-0">
        <div className="w-9 h-9 rounded-full shrink-0 shadow-sm overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
          {avatarUrl
            ? <img src={avatarUrl} alt={lead.name || ''} className="w-full h-full object-cover" onError={() => setAvatarUrl(null)} />
            : <User size={16} className="text-white" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary truncate leading-tight">{lead.name || 'Sem nome'}</p>
          <p className="text-xs text-text-secondary">{formatPhone(lead.phone)}</p>
        </div>
        {onDelete && (
          <button
            onClick={() => { if (confirm('Excluir este lead?')) onDelete(lead) }}
            className="text-text-secondary hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        )}
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-border transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 kanban-scroll chat-bg">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="h-9 bg-white/40 rounded-2xl animate-pulse" style={{ width: `${45 + (i * 13) % 30}%` }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="bg-white/70 rounded-xl px-4 py-2 shadow-sm">
              <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  msg.direction === 'outgoing'
                    ? 'bg-[#dcf8c6] text-gray-800 rounded-br-sm dark:bg-emerald-600 dark:text-white'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm dark:bg-[#1f2c34] dark:text-gray-100'
                }`}
              >
                {msg.media_url && msg.media_type === 'image' && (
                  <img
                    src={`/api/media/decrypt?messageId=${msg.id}`}
                    alt="Imagem"
                    className="max-w-full rounded-xl mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(`/api/media/decrypt?messageId=${msg.id}`, '_blank')}
                    onError={(e) => { (e.target as HTMLImageElement).src = msg.media_url || '' }}
                  />
                )}
                {msg.media_url && msg.media_type === 'audio' && (
                  <AudioPlayer src={msg.direction === 'outgoing' ? `data:audio/webm;codecs=opus;base64,${msg.media_url}` : `/api/media/decrypt?messageId=${msg.id}`} />
                )}
                {msg.media_url && msg.media_type === 'video' && (
                  <div className="mb-1.5 rounded-xl overflow-hidden">
                    <video controls preload="metadata" className="max-w-full rounded-xl" style={{ maxHeight: '260px' }}>
                      <source src={`/api/media/decrypt?messageId=${msg.id}`} />
                    </video>
                  </div>
                )}
                {msg.media_url && msg.media_type === 'document' && (
                  <a
                    href={`/api/media/decrypt?messageId=${msg.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 mb-1.5 p-2.5 rounded-xl transition-colors ${msg.direction === 'outgoing' ? 'bg-white/10 hover:bg-white/20' : 'bg-border hover:bg-border/70'}`}
                  >
                    <FileText size={16} className={msg.direction === 'outgoing' ? 'text-white/80' : 'text-emerald-500'} />
                    <span className="text-xs truncate">{msg.content === '[document]' ? 'Documento' : msg.content}</span>
                  </a>
                )}
                {msg.media_type && msg.content.startsWith('[') ? null : (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className={`text-[10px] ${msg.direction === 'outgoing' ? 'text-gray-500 dark:text-white/60' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.direction === 'outgoing' && (
                    msg.status === 'READ' ? <CheckCheck size={11} className="text-blue-200" /> :
                    msg.status === 'RECEIVED' || msg.status === 'SENT' ? <CheckCheck size={11} className="text-white/70" /> :
                    msg.status === 'PENDING' ? <Check size={11} className="text-white/40" /> :
                    msg.status === 'ERROR' ? <span className="text-[10px] text-red-300">Erro</span> : null
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-bg-card border-t border-border px-3 py-3 shrink-0">

        {/* Alex suggestion — loading */}
        {suggesting && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 animate-bounce-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="8" cy="14" r="0.5" fill="currentColor" /><circle cx="12" cy="14" r="0.5" fill="currentColor" /><circle cx="16" cy="14" r="0.5" fill="currentColor" /><path d="M7 21v1" /><path d="M17 21v1" /><path d="M12 21v1" /><path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
              </svg>
            </div>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <span className="text-xs text-emerald-500">Alex analisando...</span>
          </div>
        )}

        {/* Alex suggestion — result */}
        {suggestion && !suggesting && (
          <div className="mb-3 bg-bg-input border border-emerald-500/25 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="8" cy="14" r="0.5" fill="currentColor" /><circle cx="12" cy="14" r="0.5" fill="currentColor" /><circle cx="16" cy="14" r="0.5" fill="currentColor" /><path d="M7 21v1" /><path d="M17 21v1" /><path d="M12 21v1" /><path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-emerald-500">Sugestão do Alex</span>
              </div>
              <button onClick={() => setSuggestion('')} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={13} />
              </button>
            </div>
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed mb-2.5">{suggestion}</p>
            <button
              onClick={() => { setNewMessage(suggestion); setSuggestion('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
            >
              <Send size={11} /> Usar resposta
            </button>
          </div>
        )}

        {/* Media preview */}
        {mediaPreview && (
          <div className="mb-3 bg-bg-input border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              {mediaPreview.type === 'image' && <Image size={14} className="text-emerald-500 shrink-0" />}
              {mediaPreview.type === 'audio' && <Mic size={14} className="text-emerald-500 shrink-0" />}
              {mediaPreview.type === 'video' && <Video size={14} className="text-emerald-500 shrink-0" />}
              {mediaPreview.type === 'document' && <FileText size={14} className="text-emerald-500 shrink-0" />}
              <span className="text-xs text-text-secondary truncate flex-1">{mediaPreview.name}</span>
              <button onClick={() => setMediaPreview(null)} className="text-text-secondary hover:text-text-primary transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
            {mediaPreview.type === 'image' && (
              <img src={mediaPreview.data} alt="Preview" className="max-h-28 rounded-lg object-contain mb-2" />
            )}
            <div className="flex gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Legenda (opcional)..."
                className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:border-emerald-400"
              />
              <button
                onClick={handleSendMedia}
                disabled={sendingMedia}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all active:scale-95 shrink-0"
              >
                {sendingMedia ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg flex-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-xs text-red-500 font-mono tabular-nums">
                {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
              </span>
              <span className="text-xs text-text-secondary ml-1">Gravando...</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-medium rounded-lg transition-all active:scale-95 shrink-0"
            >
              <span className="w-3 h-3 rounded-sm bg-white shrink-0" /> Parar
            </button>
          </div>
        )}

        {/* Text input row */}
        {!mediaPreview && (
          <div className="flex items-end gap-2">
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              className="text-text-secondary hover:text-emerald-500 disabled:opacity-40 p-2 rounded-xl hover:bg-emerald-500/10 transition-colors shrink-0"
              title="Sugestão do Alex"
            >
              <svg viewBox="0 0 24 24" className={`w-5 h-5 ${suggesting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="8" cy="14" r="0.5" fill="currentColor" /><circle cx="12" cy="14" r="0.5" fill="currentColor" /><circle cx="16" cy="14" r="0.5" fill="currentColor" /><path d="M7 21v1" /><path d="M17 21v1" /><path d="M12 21v1" /><path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
              </svg>
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              rows={1}
              className="flex-1 bg-bg-input border border-border rounded-2xl px-4 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:border-emerald-400 resize-none max-h-32 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all active:scale-95 shrink-0"
            >
              <Send size={16} className={sending ? 'animate-pulse' : ''} />
            </button>
          </div>
        )}

        {/* Media buttons */}
        {!mediaPreview && !isRecording && (
          <div className="flex items-center gap-1 mt-2 pl-1">
            <button onClick={() => handleFilePick('image/*', 'image')} className="text-text-secondary hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors" title="Imagem">
              <Image size={15} />
            </button>
            <button onClick={startRecording} className="text-text-secondary hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Gravar áudio">
              <Mic size={15} />
            </button>
            <button onClick={() => handleFilePick('video/*', 'video')} className="text-text-secondary hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors" title="Vídeo">
              <Video size={15} />
            </button>
            <button onClick={() => handleFilePick('.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar', 'document')} className="text-text-secondary hover:text-emerald-500 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors" title="Documento">
              <FileText size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

