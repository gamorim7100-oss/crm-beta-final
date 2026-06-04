'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MessageCircle, Clock, User, Trash2 } from 'lucide-react'
import type { Lead } from '@/types'
import { formatPhone } from '@/lib/business-rules'
import { cn } from '@/lib/utils'

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  onConvert?: () => void
  onDelete?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  automovel: 'Automóvel',
  imoveis: 'Imóveis',
  outros: 'Outros',
}

const TYPE_COLORS: Record<string, string> = {
  automovel: 'bg-blue-500/20 text-blue-400',
  imoveis: 'bg-emerald-500/20 text-emerald-400',
  outros: 'bg-yellow-500/20 text-yellow-400',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name?: string): string {
  if (!name) return 'bg-gray-600'
  const colors = [
    'bg-emerald-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-yellow-600',
    'bg-pink-600',
    'bg-teal-600',
    'bg-orange-600',
    'bg-cyan-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-BR')
}

export function LeadCard({ lead, onClick, onConvert, onDelete }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-white/[0.15] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.2)] relative group"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
            getAvatarColor(lead.name)
          )}
        >
          {getInitials(lead.name)}
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Excluir este lead?')) onDelete()
            }}
            className="absolute top-2 right-2 text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 size={14} />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">
            {lead.name || 'Sem nome'}
          </p>
          <p className="text-xs text-text-secondary">{formatPhone(lead.phone)}</p>

          {lead.consortium_interest && (
            <span
              className={cn(
                'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-1',
                TYPE_COLORS[lead.consortium_interest]
              )}
            >
              {TYPE_LABELS[lead.consortium_interest]}
            </span>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {getTimeAgo(lead.created_at)}
            </span>

            {lead.unread_count !== undefined && lead.unread_count > 0 && (
              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                <MessageCircle size={10} />
                {lead.unread_count}
              </span>
            )}
          </div>

          {lead.last_message_text && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {lead.last_message_text}
            </p>
          )}
        </div>
      </div>

      {lead.status === 'venda_concluida' && onConvert && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onConvert()
          }}
          className="mt-2 w-full text-xs bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
        >
          Converter em Cliente
        </button>
      )}
    </div>
  )
}

