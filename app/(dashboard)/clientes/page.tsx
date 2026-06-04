'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, ChevronDown, ChevronUp, Plus, Search } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/business-rules'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import type { Client, ClientGroup } from '@/types'

const LOTE_COLORS: Record<string, string> = {
  abril_2026: 'bg-blue-500/20 text-blue-400',
  maio_2026: 'bg-orange-500/20 text-orange-400',
}

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  contemplado: 'Contemplado',
}

export default function ClientesPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [supabase] = useState(() => createClient())

  const loadClients = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .order('grupo', { ascending: true })

    if (!clients) return

    const groupedMap = new Map<number, ClientGroup>()
    for (const client of clients as Client[]) {
      const grupo = client.grupo || 0
      if (!groupedMap.has(grupo)) {
        groupedMap.set(grupo, {
          grupo,
          total_cotas: 0,
          total_credito: 0,
          members: [],
          lote: client.lote,
        })
      }
      const g = groupedMap.get(grupo)!
      g.total_cotas++
      g.total_credito += Number(client.contract_value)
      g.members.push(client)
    }

    setGroups(
      Array.from(groupedMap.values())
        .filter((g) => g.grupo > 0)
        .sort((a, b) => a.grupo - b.grupo)
    )
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
  }, [supabase])

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      members: g.members.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.phone?.includes(search) ||
          m.cpf?.includes(search)
      ),
    }))
    .filter((g) => g.members.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Clientes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou CPF..."
          className="w-full bg-bg-card border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-bg-card border border-white/[0.06] rounded-xl p-8 text-center">
          <Briefcase size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum cliente ativo encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.grupo}
              className="bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <button
                onClick={() =>
                  setExpandedGroup(expandedGroup === group.grupo ? null : group.grupo)
                }
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Briefcase size={20} className="text-emerald-400" />
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-text-primary">
                      Grupo {group.grupo}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {group.total_cotas} {group.total_cotas === 1 ? 'cota' : 'cotas'} ·{' '}
                      {formatCurrency(group.total_credito)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {group.lote && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        LOTE_COLORS[group.lote] || 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {group.lote.replace('_', ' ')}
                    </span>
                  )}
                  {expandedGroup === group.grupo ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </div>
              </button>

              {expandedGroup === group.grupo && (
                <div className="border-t border-white/[0.06]">
                  {group.members.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">{client.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>Cota {client.cota}</span>
                          {client.phone && <span>{formatPhone(client.phone)}</span>}
                          {client.regra_da_venda && (
                            <span className="text-gray-500">
                              {client.regra_da_venda.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {formatCurrency(Number(client.contract_value))}
                        </p>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            client.status === 'ativo'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : client.status === 'contemplado'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {STATUS_LABELS[client.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ClientFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            loadClients()
          }}
        />
      )}
    </div>
  )
}



