'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Lead, LeadStatus } from '@/types'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'
import { MessageCircle, Calendar, Target, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react'

export const COLUMN_CONFIG: Record<LeadStatus, { label: string; color: string; icon: any }> = {
  negociacao:     { label: 'Negociação',      color: '#3B82F6', icon: MessageCircle },
  followup:       { label: 'Follow Up',        color: '#F59E0B', icon: RefreshCw },
  reuniao:        { label: 'Reunião',          color: '#8B5CF6', icon: Calendar },
  followup2:      { label: 'Follow Up 2',      color: '#EC4899', icon: RefreshCw },
  fechamento:     { label: 'Fechamento',       color: '#EF4444', icon: Target },
  venda_concluida:{ label: 'Venda Concluída',  color: '#10B981', icon: CheckCircle2 },
}

interface KanbanColumnProps {
  status: LeadStatus
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onConvert?: (lead: Lead) => void
  onDelete?: (lead: Lead) => void
}

export function KanbanColumn({ status, leads, onLeadClick, onConvert, onDelete }: KanbanColumnProps) {
  const config = COLUMN_CONFIG[status]
  const Icon = config.icon
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-xl transition-all',
        isOver && 'ring-2 ring-emerald-500/30'
      )}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon size={16} style={{ color: config.color }} />
        <h3 className="text-sm font-semibold text-text-primary">{config.label}</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-auto font-medium"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {leads.length}
        </span>
      </div>

      <div
        className={cn(
          'flex-1 space-y-2 overflow-y-auto rounded-lg p-2 min-h-[400px] kanban-scroll',
          leads.length === 0 && 'border-2 border-dashed border-border'
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
              onConvert={onConvert ? () => onConvert(lead) : undefined}
              onDelete={onDelete ? () => onDelete(lead) : undefined}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-gray-600">
            Arraste leads para cá
          </div>
        )}
      </div>
    </div>
  )
}

// Coluna especial de exclusão (drop zone)
interface DeleteColumnProps {
  onDrop: () => void
}

export function DeleteColumn({ onDrop }: DeleteColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: '__delete__' })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[160px] max-w-[180px] rounded-xl transition-all',
        isOver && 'ring-2 ring-red-500/60 scale-[1.02]'
      )}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Trash2 size={16} className="text-red-400" />
        <h3 className="text-sm font-semibold text-red-400">Excluir</h3>
      </div>

      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-center rounded-lg p-4 min-h-[400px] border-2 border-dashed transition-all',
          isOver
            ? 'border-red-500 bg-red-500/10'
            : 'border-red-500/30 bg-red-500/5'
        )}
      >
        <Trash2 size={28} className={cn('mb-2 transition-colors', isOver ? 'text-red-400' : 'text-red-500/40')} />
        <p className={cn('text-xs text-center transition-colors', isOver ? 'text-red-400' : 'text-red-500/40')}>
          {isOver ? 'Solte para excluir' : 'Arraste aqui para excluir o lead'}
        </p>
      </div>
    </div>
  )
}
