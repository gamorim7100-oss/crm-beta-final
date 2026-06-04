'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { useLeadsStore } from '@/stores/leads.store'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'
import { ChatPanel } from './ChatPanel'
import { LeadForm } from './LeadForm'
import { ScheduleMeetingModal } from './ScheduleMeetingModal'
import type { Lead, LeadStatus } from '@/types'
import { Plus } from 'lucide-react'

const COLUMNS: LeadStatus[] = ['negociacao', 'reuniao', 'fechamento', 'venda_concluida']

export function KanbanBoard() {
  const { leads, setLeads, selectedLead, setSelectedLead, updateLeadStatus, setUnreadCount, setPosVendaUnreadCount } =
    useLeadsStore()
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null)
  const [supabase] = useState(() => createClient())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const loadLeads = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('kanban_position', { ascending: true })
      .order('created_at', { ascending: false })

    if (data) {
      const leadsWithMeta: Lead[] = data
      setLeads(leadsWithMeta)

      const unreadCount = leadsWithMeta.filter((l: Lead) => (l as any).unread_count > 0 && (l as any).status !== 'venda_concluida').length
      const posVendaUnreadCount = leadsWithMeta.filter((l: Lead) => (l as any).unread_count > 0 && (l as any).status === 'venda_concluida').length
      setUnreadCount(unreadCount)
      setPosVendaUnreadCount(posVendaUnreadCount)
    }
  }, [supabase, setLeads, setUnreadCount, setPosVendaUnreadCount])

  useEffect(() => {
    loadLeads()

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        () => loadLeads()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadLeads, supabase])

  const getColumnLeads = (status: LeadStatus) =>
    leads.filter((l) => l.status === status)

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id)
    if (lead) setActiveLead(lead)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeLeadData = leads.find((l) => l.id === active.id)
    if (!activeLeadData) return

    const overId = over.id as string
    let newStatus: LeadStatus

    if (COLUMNS.includes(overId as LeadStatus)) {
      newStatus = overId as LeadStatus
    } else {
      const overLead = leads.find((l) => l.id === overId)
      if (overLead) {
        newStatus = overLead.status
      } else return
    }

    if (activeLeadData.status !== newStatus) {
      setLeads(
        leads.map((l) =>
          l.id === activeLeadData.id ? { ...l, status: newStatus } : l
        )
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const prevStatus = activeLead?.status
    setActiveLead(null)

    if (!over) return

    const leadId = active.id as string
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    let newStatus: LeadStatus
    let newPosition = lead.kanban_position

    if (COLUMNS.includes(over.id as LeadStatus)) {
      newStatus = over.id as LeadStatus
    } else {
      const overLead = leads.find((l) => l.id === over.id)
      if (overLead) {
        newStatus = overLead.status
      } else return
    }

    if (lead.status !== newStatus) {
      updateLeadStatus(leadId, newStatus, newPosition)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        await supabase
          .from('leads')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', leadId)
      }, 500)
    }

    if (newStatus === 'reuniao' && prevStatus !== 'reuniao') {
      setSchedulingLead(lead)
    }
  }

  const handleDelete = async (lead: Lead) => {
    await supabase.from('leads').delete().eq('id', lead.id)
    if (selectedLead?.id === lead.id) setSelectedLead(null)
    loadLeads()
  }

  const handleConvert = async (lead: Lead) => {
    setConvertLead(lead)
    setShowConvertModal(true)
  }

  const confirmConvert = async () => {
    if (!convertLead) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: client } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: convertLead.name || 'Cliente',
          phone: convertLead.phone,
          email: convertLead.email,
          consortium_type: convertLead.consortium_interest || 'outros',
          contract_value: 0,
          status: 'ativo',
          data_fechamento: new Date().toISOString(),
        })
        .select()
        .single()

      if (client) {
        await supabase
          .from('leads')
          .update({
            converted_client_id: client.id,
            status: 'venda_concluida',
          })
          .eq('id', convertLead.id)

        await supabase.from('sales').insert({
          user_id: user.id,
          client_id: client.id,
          lead_id: convertLead.id,
          consortium_type: convertLead.consortium_interest || 'outros',
          value: 0,
          sale_date: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Convert error:', error)
    }

    setShowConvertModal(false)
    setConvertLead(null)
    loadLeads()
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h1 className="text-xl font-bold text-text-primary">Leads</h1>
          <button
            onClick={() => {
              setEditingLead(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 flex-1 overflow-x-auto pb-4 kanban-scroll">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={getColumnLeads(status)}
                onLeadClick={(lead) => {
                  setSelectedLead(lead)
                }}
                onConvert={handleConvert}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="rotate-3 opacity-90">
                <LeadCard
                  lead={activeLead}
                  onClick={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedLead && (
        <ChatPanel lead={selectedLead} onClose={() => setSelectedLead(null)} onDelete={handleDelete} />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              {editingLead ? 'Editar Lead' : 'Novo Lead'}
            </h2>
            <LeadForm
              lead={editingLead}
              onClose={() => setShowForm(false)}
              onSaved={loadLeads}
            />
          </div>
        </div>
      )}

      {schedulingLead && (
        <ScheduleMeetingModal
          lead={schedulingLead}
          onClose={() => setSchedulingLead(null)}
          onSaved={() => setSchedulingLead(null)}
        />
      )}

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-text-primary mb-2">Converter em Cliente</h2>
            <p className="text-sm text-text-secondary mb-4">
              Deseja converter <strong className="text-text-primary">{convertLead?.name || 'este lead'}</strong> em cliente?
              Uma venda será registrada automaticamente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmConvert}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

