'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, X, Paperclip, User, Check, CheckCheck, Trash2, Sparkles, Image, Mic, Video, FileText } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaPreview, setMediaPreview] = useState<{ data: string; type: string; name: string } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('timestamp', { ascending: true })
        .limit(50)

      if (data) setMessages(data)
      setLoading(false)
    }

    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    }).catch(() => {})

    loadMessages()

    const channel = supabase
      .channel(`messages:${lead.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `lead_id=eq.${lead.id}`,
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `lead_id=eq.${lead.id}`,
        },
        (payload: any) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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

  const handleScroll = async () => {
    const container = chatContainerRef.current
    if (!container || container.scrollTop > 0) return

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
  }

  return (
    <div className={`bg-bg-secondary ${fullWidth ? 'border-0 w-full' : 'w-full lg:w-[400px] border-l border-white/[0.06]'} flex flex-col h-full`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0">
          <User size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {lead.name || 'Sem nome'}
          </p>
          <p className="text-xs text-gray-400">{formatPhone(lead.phone)}</p>
        </div>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm('Excluir este lead?')) {
                onDelete(lead)
              }
            }}
            className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 kanban-scroll"
      >
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="h-8 bg-white/5 rounded-lg animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.direction === 'outgoing'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-[#252E3E] text-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.media_url && msg.media_type === 'image' && (
                  <img
                    src={`/api/media/decrypt?messageId=${msg.id}`}
                    alt="Imagem"
                    className="max-w-full rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(`/api/media/decrypt?messageId=${msg.id}`, '_blank')}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = msg.media_url || ''
                    }}
                  />
                )}
                {msg.media_url && msg.media_type === 'audio' && (
                  <AudioPlayer src={msg.direction === 'outgoing' ? `data:audio/webm;codecs=opus;base64,${msg.media_url}` : `/api/media/decrypt?messageId=${msg.id}`} />
                )}
                {msg.media_url && msg.media_type === 'video' && (
                  <div className="mb-1 rounded-lg overflow-hidden">
                    <video
                      controls
                      preload="metadata"
                      className="max-w-full rounded-lg"
                      style={{ maxHeight: '300px' }}
                    >
                      <source src={`/api/media/decrypt?messageId=${msg.id}`} />
                    </video>
                  </div>
                )}
                {msg.media_url && msg.media_type === 'document' && (
                  <a
                    href={`/api/media/decrypt?messageId=${msg.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mb-1 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors group"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span className="text-xs truncate text-gray-300 group-hover:text-white transition-colors">
                      {msg.content === '[document]' ? 'Documento' : msg.content}
                    </span>
                  </a>
                )}
                {msg.media_type && msg.content.startsWith('[') ? null : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-[10px] ${
                      msg.direction === 'outgoing' ? 'text-emerald-200' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.direction === 'outgoing' && (
                    msg.status === 'READ' ? (
                      <CheckCheck size={12} className="text-blue-400" />
                    ) : msg.status === 'RECEIVED' || msg.status === 'SENT' ? (
                      <CheckCheck size={12} className="text-emerald-300" />
                    ) : msg.status === 'PENDING' ? (
                      <Check size={12} className="text-emerald-300/60" />
                    ) : msg.status === 'ERROR' ? (
                      <span className="text-[10px] text-red-400">Erro</span>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/[0.06] relative">
        {suggesting && (
          <div className="absolute bottom-full left-0 right-0 mx-4 mb-2 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="8" cy="14" r="0.5" fill="currentColor" />
                  <circle cx="12" cy="14" r="0.5" fill="currentColor" />
                  <circle cx="16" cy="14" r="0.5" fill="currentColor" />
                  <path d="M7 21v1" />
                  <path d="M17 21v1" />
                  <path d="M12 21v1" />
                  <path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
                </svg>
              </div>
              <span className="text-[9px] font-medium text-emerald-400/70 tracking-wider">ALEX</span>
            </div>
            <div className="flex-1 bg-[#1A2332] border border-emerald-500/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                <span className="text-[10px] text-emerald-400/60">Analisando conversa...</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 bg-white/5 rounded-full w-3/4 animate-pulse" />
                <div className="h-2.5 bg-white/5 rounded-full w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        {suggestion && !suggesting && (
          <div className="absolute bottom-full left-0 right-0 mx-4 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="8" cy="14" r="0.5" fill="currentColor" />
                    <circle cx="12" cy="14" r="0.5" fill="currentColor" />
                    <circle cx="16" cy="14" r="0.5" fill="currentColor" />
                    <path d="M7 21v1" />
                    <path d="M17 21v1" />
                    <path d="M12 21v1" />
                    <path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
                  </svg>
                </div>
                <span className="text-[9px] font-medium text-emerald-400/70 tracking-wider">ALEX</span>
              </div>
              <div className="flex-1 bg-[#1A2332] border border-emerald-500/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-emerald-400">Sugestão</span>
                  <button
                    onClick={() => setSuggestion('')}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{suggestion}</p>
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
                  <button
                    onClick={() => { setNewMessage(suggestion); setSuggestion('') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
                  >
                    <Send size={11} />
                    Usar resposta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="text-gray-400 hover:text-emerald-400 disabled:opacity-40 p-2 rounded-lg hover:bg-emerald-400/10 transition-colors shrink-0 relative group"
            title="Pedir sugestão ao Alex"
          >
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <svg viewBox="0 0 24 24" className={`w-[18px] h-[18px] ${suggesting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="8" cy="14" r="0.5" fill="currentColor" />
              <circle cx="12" cy="14" r="0.5" fill="currentColor" />
              <circle cx="16" cy="14" r="0.5" fill="currentColor" />
              <path d="M7 21v1" />
              <path d="M17 21v1" />
              <path d="M12 21v1" />
              <path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
            </svg>
          </button>
          {mediaPreview ? (
            <div className="flex-1 bg-[#1A2332] border border-emerald-500/20 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-2">
                {mediaPreview.type === 'image' && <Image size={14} className="text-emerald-400" />}
                {mediaPreview.type === 'audio' && <Mic size={14} className="text-emerald-400" />}
                {mediaPreview.type === 'video' && <Video size={14} className="text-emerald-400" />}
                {mediaPreview.type === 'document' && <FileText size={14} className="text-emerald-400" />}
                <span className="text-xs text-gray-400 truncate flex-1">{mediaPreview.name}</span>
                <button onClick={() => setMediaPreview(null)} className="text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              {mediaPreview.type === 'image' && (
                <img src={mediaPreview.data} alt="Preview" className="max-h-24 rounded object-contain mb-2" />
              )}
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Legenda (opcional)..."
                rows={1}
                className="w-full bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400 resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleSendMedia}
                  disabled={sendingMedia}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
                >
                  {sendingMedia ? 'Enviando...' : 'Enviar mídia'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400 resize-none max-h-32"
              />
            </div>
          )}
          {!mediaPreview && (
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white p-2 rounded-lg transition-colors shrink-0"
            >
              <Send size={18} className={sending ? 'animate-pulse' : ''} />
            </button>
          )}
          </div>
          {isRecording ? (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400 font-mono tabular-nums">
                  {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:
                  {String(recordingDuration % 60).padStart(2, '0')}
                </span>
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
              >
                <span className="w-3.5 h-3.5 rounded-sm bg-white" />
                Parar
              </button>
            </div>
          ) : !mediaPreview && (
            <div className="flex items-center gap-1 mt-1.5 justify-end">
              <button
                onClick={() => handleFilePick('image/*', 'image')}
                className="text-gray-500 hover:text-emerald-400 p-1 rounded hover:bg-emerald-400/10 transition-colors"
                title="Enviar imagem"
              >
                <Image size={14} />
              </button>
              <button
                onClick={startRecording}
                className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors"
                title="Gravar áudio"
              >
                <Mic size={14} />
              </button>
              <button
                onClick={() => handleFilePick('video/*', 'video')}
                className="text-gray-500 hover:text-emerald-400 p-1 rounded hover:bg-emerald-400/10 transition-colors"
                title="Enviar vídeo"
              >
                <Video size={14} />
              </button>
              <button
                onClick={() => handleFilePick('.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar', 'document')}
                className="text-gray-500 hover:text-emerald-400 p-1 rounded hover:bg-emerald-400/10 transition-colors"
                title="Enviar documento"
              >
                <FileText size={14} />
              </button>
            </div>
          )}
      </div>
    </div>
  )
}

