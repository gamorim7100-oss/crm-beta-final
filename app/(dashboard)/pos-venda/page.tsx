'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, formatCurrency, phoneVariants } from '@/lib/business-rules'
import {
  Search,
  BadgeCheck,
  MessageCircle,
  Phone,
  Mail,
  User,
  Hash,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { ChatPanel } from '@/components/leads/ChatPanel'
import type { Lead } from '@/types'

interface ContractInfo {
  grupo?: number
  cota?: number
  consortium_type?: string
  contract_value?: number
  status?: string
  data_fechamento?: string
  criterio_de_lance?: string
}

interface PosVendaItem {
  id: string
  name: string
  phone: string
  tipo: 'lead' | 'cliente'
  contractCount: number
  contracts: ContractInfo[]
  status?: string
  email?: string
  cpf?: string
  notes?: string
  unread_count?: number
  last_message_text?: string
  avatar_url?: string | null
}

export default function PosVendaPage() {
  const [items, setItems] = useState<PosVendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<PosVendaItem | null>(null)
  const [chatLead, setChatLead] = useState<Lead | null>(null)
  const [showContracts, setShowContracts] = useState(false)
  const leadsByPhone = useRef(new Map<string, Lead>())
  const userRef = useRef<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      userRef.current = user.id

      const [leadsRes, clientsRes, allLeadsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, phone, status, notes, unread_count, last_message_text, avatar_url')
          .eq('user_id', user.id)
          .eq('status', 'venda_concluida'),
        supabase
          .from('clients')
          .select('id, name, phone, email, cpf, status, grupo, cota, consortium_type, contract_value, data_fechamento, criterio_de_lance')
          .eq('user_id', user.id),
        supabase
          .from('leads')
          .select('id, name, phone, unread_count, last_message_text, avatar_url')
          .eq('user_id', user.id),
      ])

      for (const l of allLeadsRes.data || []) {
        const phone = l.phone?.replace(/\D/g, '')
        if (phone && !leadsByPhone.current.has(phone)) {
          leadsByPhone.current.set(phone, l as Lead)
        }
      }

      // Agrupa clientes por CPF (boa prática — mesma pessoa pode ter múltiplas cotas)
      const clientGroups = new Map<string, PosVendaItem>()
      for (const c of clientsRes.data || []) {
        const key = c.cpf || `__no_cpf_${c.id}`
        const phone = c.phone?.replace(/\D/g, '') || ''
        const existing = clientGroups.get(key)
        if (existing) {
          existing.contractCount++
          existing.contracts.push({
            grupo: c.grupo,
            cota: c.cota,
            consortium_type: c.consortium_type,
            contract_value: Number(c.contract_value),
            status: c.status,
            data_fechamento: c.data_fechamento,
            criterio_de_lance: c.criterio_de_lance || undefined,
          })
          // Mantém o telefone se ainda não tinha
          if (!existing.phone && phone) existing.phone = phone
        } else {
          clientGroups.set(key, {
            id: `client_${key}`,
            name: c.name,
            phone,
            tipo: 'cliente',
            contractCount: 1,
            contracts: [{
              grupo: c.grupo,
              cota: c.cota,
              consortium_type: c.consortium_type,
              contract_value: Number(c.contract_value),
              status: c.status,
              data_fechamento: c.data_fechamento,
              criterio_de_lance: c.criterio_de_lance || undefined,
            }],
            status: c.status,
            email: c.email || undefined,
            cpf: c.cpf || undefined,
          })
        }
      }

      const seenPhones = new Set<string>()
      const merged: PosVendaItem[] = []

      clientGroups.forEach((client) => {
        if (client.phone) seenPhones.add(client.phone)
        const match = client.phone ? leadsByPhone.current.get(client.phone) : undefined
        merged.push({
          ...client,
          unread_count: (match as any)?.unread_count || undefined,
          last_message_text: (match as any)?.last_message_text || undefined,
          avatar_url: (match as any)?.avatar_url || null,
        })
      })

      for (const l of leadsRes.data || []) {
        const phone = l.phone?.replace(/\D/g, '')
        if (!phone) continue
        if (seenPhones.has(phone)) continue
        seenPhones.add(phone)
        merged.push({
          id: `lead_${l.id}`,
          name: l.name || 'Sem nome',
          phone,
          tipo: 'lead',
          contractCount: 1,
          contracts: [],
          notes: l.notes || undefined,
          unread_count: (l as any).unread_count,
          last_message_text: (l as any).last_message_text || undefined,
          avatar_url: (l as any).avatar_url || null,
        })
      }

      merged.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setItems(merged)
      setLoading(false)
    }
    load()
  }, [supabase])

  const openChat = (item: PosVendaItem) => {
    setSelectedItem(item)
    setShowContracts(false)
    const phone = item.phone?.replace(/\D/g, '')
    if (!phone) { setChatLead(null); return }

    const existing = phoneVariants(phone).reduce<Lead | null>((found, p) => found || leadsByPhone.current.get(p) || null, null)
    if (existing) {
      setChatLead(existing)
      syncHistory(phone, existing.id)
      return
    }

    if (item.tipo === 'cliente') {
      setChatLead(null)
      createAndSync(item, phone)
    } else {
      setChatLead(null)
    }
  }

  const createAndSync = async (item: PosVendaItem, phone: string) => {
    const userId = userRef.current
    if (!userId) return

    const { data: newLead } = await supabase
      .from('leads')
      .insert({
        user_id: userId,
        name: item.name,
        phone,
        status: 'venda_concluida',
        kanban_position: 3,
      })
      .select()
      .single()

    if (newLead) {
      leadsByPhone.current.set(phone, newLead as Lead)
      setChatLead(newLead as Lead)
      syncHistory(phone, newLead.id)
    }
  }

  const syncHistory = (phone: string, leadId: string) => {
    fetch('/api/evolution/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, leadId }),
    }).catch(() => {})
  }

  const closeChat = () => {
    setSelectedItem(null)
    setChatLead(null)
  }

  const filtered = items.filter((item) =>
    !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.phone?.includes(search)
  )

  const statusColor = (status?: string) => {
    switch (status) {
      case 'ativo': return 'bg-emerald-500/10 text-emerald-400'
      case 'contemplado': return 'bg-blue-500/10 text-blue-400'
      case 'inativo': return 'bg-gray-500/10 text-gray-400'
      default: return 'bg-gray-500/10 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-bold text-text-primary">Pós-Venda</h1>
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0">
      {/* Left sidebar - client list */}
      <div className={`flex flex-col ${selectedItem ? 'hidden lg:flex w-full lg:w-[380px]' : 'w-full'} border-r border-white/[0.06] shrink-0`}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Pós-Venda</h1>
            <p className="text-xs text-gray-500">{filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
               className="bg-bg-card border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400 w-36"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 px-3 pb-3">
          {filtered.map((item) => (
            <div key={item.id}>
            <button
              onClick={() => openChat(item)}
              className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${
                selectedItem?.id === item.id
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-bg-card border border-white/[0.06] hover:border-emerald-500/30'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                {item.avatar_url && item.avatar_url !== 'none'
                  ? <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  : <BadgeCheck size={16} className="text-emerald-400" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                  {item.contractCount > 1 && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      {item.contractCount} cotas
                    </span>
                  )}
                  {item.status && (
                    <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium shrink-0 ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-gray-500">{item.phone ? formatPhone(item.phone) : 'Sem telefone'}</p>
                  {item.contracts.length > 0 && (
                    <span className="text-[10px] text-gray-600">
                      {item.contracts.length === 1
                        ? `G${item.contracts[0].grupo}`
                        : `G${item.contracts.map(c => c.grupo).join(', G')}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <MessageCircle size={14} className="text-gray-600" />
                {item.unread_count !== undefined && item.unread_count > 0 && (
                  <span className="flex items-center gap-1 bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                    <MessageCircle size={10} />
                    {item.unread_count > 99 ? '99+' : item.unread_count}
                  </span>
                )}
              </div>
            </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BadgeCheck size={32} className="mx-auto mb-2 text-gray-600" />
              <p className="text-xs">Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedItem ? 'hidden lg:flex' : ''}`}>
        {selectedItem ? (
          <>
            {/* Client Detail Header */}
            <div className="border-b border-white/[0.06] bg-bg-card">
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-base font-bold text-text-primary truncate">{selectedItem.name}</h2>
                    {selectedItem.status && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusColor(selectedItem.status)}`}>
                        {selectedItem.status}
                      </span>
                    )}
                  </div>
                  <button onClick={closeChat} className="text-gray-500 hover:text-white p-1 shrink-0">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                  {selectedItem.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {formatPhone(selectedItem.phone)}
                    </span>
                  )}
                  {selectedItem.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} /> {selectedItem.email}
                    </span>
                  )}
                  {selectedItem.cpf && (
                    <span className="flex items-center gap-1">
                      <User size={11} /> {selectedItem.cpf}
                    </span>
                  )}
                </div>
              </div>

              {/* Contracts section */}
              <div className="px-4 pb-3">
                <button
                  onClick={() => setShowContracts(!showContracts)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <CreditCard size={12} />
                  {selectedItem.contractCount} {selectedItem.contractCount === 1 ? 'contrato' : 'contratos'}
                  {showContracts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showContracts && (
                  <div className="mt-2 space-y-2">
                    {selectedItem.contracts.map((c, idx) => (
                      <div key={idx} className="bg-white/[0.03] rounded-lg p-3 text-xs space-y-1.5 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 font-medium">Contrato {idx + 1}</span>
                          {c.status && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                              {c.status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Hash size={11} className="text-gray-500" />
                            <span>Grupo <span className="text-gray-200">{c.grupo}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Hash size={11} className="text-gray-500" />
                            <span>Cota <span className="text-gray-200">{c.cota}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BadgeCheck size={11} className="text-gray-500" />
                            <span>
                              {c.consortium_type === 'automovel' ? 'Automóvel' :
                               c.consortium_type === 'imoveis' ? 'Imóveis' :
                               c.consortium_type === 'outros' ? 'Outros' : c.consortium_type || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-200">{c.contract_value ? formatCurrency(c.contract_value) : '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-gray-500" />
                            <span>
                              {c.data_fechamento
                                ? new Date(c.data_fechamento).toLocaleDateString('pt-BR')
                                : '-'}
                            </span>
                          </div>
                        </div>

                        {c.criterio_de_lance && (
                          <div className="border-t border-white/[0.06] pt-1.5 mt-1.5">
                            <span className="text-gray-400 leading-relaxed">{c.criterio_de_lance}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedItem.notes && (
                <div className="px-4 pb-3">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-400 leading-relaxed">{selectedItem.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="flex-1 min-h-0">
              {chatLead ? (
                <ChatPanel lead={chatLead} onClose={() => {}} fullWidth />
              ) : selectedItem.phone ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  Criando conversa...
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  Cliente sem telefone.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Selecione um cliente para iniciar o chat
          </div>
        )}
      </div>
    </div>
  )
}

