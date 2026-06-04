import { create } from 'zustand'
import type { Lead, Message } from '@/types'

interface LeadsState {
  leads: Lead[]
  selectedLead: Lead | null
  messages: Record<string, Message[]>
  unreadCount: number
  posVendaUnreadCount: number
  isLoading: boolean
  setLeads: (leads: Lead[]) => void
  setSelectedLead: (lead: Lead | null) => void
  updateLeadStatus: (leadId: string, status: Lead['status'], kanbanPosition: number) => void
  addMessage: (leadId: string, message: Message) => void
  setMessages: (leadId: string, messages: Message[]) => void
  setUnreadCount: (count: number) => void
  setPosVendaUnreadCount: (count: number) => void
  setLoading: (loading: boolean) => void
  addLead: (lead: Lead) => void
}

export const useLeadsStore = create<LeadsState>((set) => ({
  leads: [],
  selectedLead: null,
  messages: {},
  unreadCount: 0,
  posVendaUnreadCount: 0,
  isLoading: false,

  setLeads: (leads) => set({ leads }),

  setSelectedLead: (lead) => set({ selectedLead: lead }),

  updateLeadStatus: (leadId, status, kanbanPosition) =>
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === leadId ? { ...l, status, kanban_position: kanbanPosition } : l
      ),
    })),

  addMessage: (leadId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [leadId]: [...(state.messages[leadId] || []), message],
      },
    })),

  setMessages: (leadId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [leadId]: messages },
    })),

  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setPosVendaUnreadCount: (posVendaUnreadCount) => set({ posVendaUnreadCount }),

  setLoading: (isLoading) => set({ isLoading }),

  addLead: (lead) =>
    set((state) => ({
      leads: [...state.leads, lead],
    })),
}))

