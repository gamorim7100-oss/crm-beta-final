export type ConsortiumType = 'automovel' | 'imoveis' | 'outros'
export type LeadStatus = 'negociacao' | 'followup' | 'reuniao' | 'followup2' | 'fechamento' | 'venda_concluida'
export type ClientStatus = 'ativo' | 'inativo' | 'contemplado'
export type MessageDirection = 'incoming' | 'outgoing'
export type MessageStatus = 'PENDING' | 'SENT' | 'RECEIVED' | 'READ' | 'ERROR'
export type RegraVenda = 'lance_embutido_sempre' | 'pagar_perguntando' | 'ofertar_em_mes_especifico' | 'ofertar_agosto' | 'sem_lance'

export interface Profile {
  id: string
  name: string
  email: string
  avatar_url?: string
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  phone?: string
  email?: string
  cpf?: string
  grupo?: number
  cota?: number
  consortium_type: ConsortiumType
  contract_value: number
  titulo_lance?: number
  lance_embutido?: boolean
  percentual_lance?: number
  regra_da_venda?: RegraVenda
  mes_oferta?: string
  payment_day?: number
  monthly_payment_base?: number
  status: ClientStatus
  data_fechamento: string
  lote?: string
  notes?: string
  criterio_de_lance?: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  user_id: string
  name?: string
  phone: string
  email?: string
  consortium_interest?: ConsortiumType
  status: LeadStatus
  kanban_position: number
  notes?: string
  converted_client_id?: string
  avatar_url?: string | null
  created_at: string
  updated_at: string
  last_message_text?: string
  last_message_at?: string
  unread_count?: number
}

export interface Message {
  id: string
  lead_id: string
  content: string
  direction: MessageDirection
  whatsapp_message_id?: string
  media_url?: string
  media_type?: string
  message_data?: Record<string, unknown> | null
  status?: MessageStatus
  read_at?: string
  timestamp: string
  created_at: string
}

export interface Meeting {
  id: string
  user_id: string
  lead_id?: string
  client_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  color: string
  lead?: Lead
  client?: Client
  created_at: string
}

export interface Sale {
  id: string
  user_id: string
  client_id?: string
  lead_id?: string
  consortium_type: ConsortiumType
  value: number
  sale_date: string
  notes?: string
  created_at: string
}

export interface PaymentSchedule {
  id: string
  client_id: string
  competencia: string
  valor: number
  fase: 1 | 2 | 3
  pago: boolean
  data_pagamento?: string
  observacao?: string
  created_at: string
}

export interface ClientGroup {
  grupo: number
  total_cotas: number
  total_credito: number
  members: Client[]
  lote?: string
}

export interface AttentionAlert {
  reason: string
  clients: Client[]
}

