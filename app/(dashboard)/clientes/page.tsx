'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ChevronDown, ChevronUp, Plus, Search, CreditCard, Hash } from 'lucide-react'
import { formatCurrency, formatPhone } from '@/lib/business-rules'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import type { Client } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  contemplado: 'Contemplado',
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-emerald-500/20 text-emerald-400',
  contemplado: 'bg-blue-500/20 text-blue-400',
  inativo: 'bg-gray-500/20 text-gray-400',
}

const REGRA_LABELS: Record<string, string> = {
  lance_embutido_sempre: 'Lance embutido',
  pagar_perguntando: 'Pagar perguntando',
  ofertar_em_mes_especifico: 'Mês específico',
  ofertar_agosto: 'Ofertar agosto',
  sem_lance: 'Sem lance',
}

const CONSORTIUM_LABELS: Record<string, string> = {
  automovel: 'Automóvel',
  imoveis: 'Imóveis',
  outros: 'Outros',
}

interface PersonGroup {
  cpf: string
  name: string
  contracts: Client[]
  total_credito: number
  status: string
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'contemplado', label: 'Contemplados' },
  { value: 'inativo', label: 'Inativos' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ClientesPage() {
  const [persons, setPersons] = useState<PersonGroup[]>([])
  const [expandedCpf, setExpandedCpf] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [supabase] = useState(() => createClient())

  const loadClients = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })
      .order('data_fechamento', { ascending: true })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: clients } = await query
    if (!clients) { setLoading(false); return }

    // Agrupa por CPF — clientes sem CPF ficam individuais por ID
    const map = new Map<string, PersonGroup>()
    for (const client of clients as Client[]) {
      const key = client.cpf || `__no_cpf_${client.id}`
      if (!map.has(key)) {
        map.set(key, {
          cpf: client.cpf || '',
          name: client.name,
          contracts: [],
          total_credito: 0,
          status: client.status,
        })
      }
      const p = map.get(key)!
      p.contracts.push(client)
      p.total_credito += Number(client.contract_value)
    }

    setPersons(
      Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
    )
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
  }, [supabase, statusFilter])

  const filtered = persons.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(s) ||
      p.cpf.includes(s) ||
      p.contracts.some(c => c.phone?.includes(s) || String(c.grupo).includes(s) || String(c.cota).includes(s))
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Clientes</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} {filtered.length === 1 ? 'pessoa' : 'pessoas'} · {filtered.reduce((s, p) => s + p.contracts.length, 0)} cotas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      {/* Busca + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, grupo ou cota..."
            className="w-full bg-bg-card border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === opt.value
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-bg-card border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-white/[0.06] rounded-xl p-10 text-center">
          <User size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((person) => {
            const key = person.cpf || person.name
            const isExpanded = expandedCpf === key
            const hasMultiple = person.contracts.length > 1

            return (
              <div
                key={key}
                className="bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.25)] hover:border-white/10 transition-colors"
              >
                {/* Cabeçalho da pessoa */}
                <button
                  onClick={() => setExpandedCpf(isExpanded ? null : key)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {getInitials(person.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">{person.name}</p>
                      {hasMultiple && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
                          {person.contracts.length} cotas
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[person.status] || STATUS_COLORS.inativo}`}>
                        {STATUS_LABELS[person.status] || person.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {person.cpf && <span>{person.cpf}</span>}
                      <span className="font-medium text-gray-300">{formatCurrency(person.total_credito)}</span>
                      {person.contracts[0]?.phone && <span>{formatPhone(person.contracts[0].phone)}</span>}
                    </div>
                  </div>

                  {hasMultiple ? (
                    isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                  ) : (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">G{person.contracts[0]?.grupo} · C{person.contracts[0]?.cota}</p>
                      {person.contracts[0]?.regra_da_venda && (
                        <p className="text-[10px] text-gray-600 mt-0.5">{REGRA_LABELS[person.contracts[0].regra_da_venda] || person.contracts[0].regra_da_venda}</p>
                      )}
                    </div>
                  )}
                </button>

                {/* Contratos expandidos (só quando tem mais de 1 ou ao clicar) */}
                {(isExpanded || !hasMultiple) && hasMultiple && (
                  <div className="border-t border-white/[0.06]">
                    {person.contracts.map((contract, idx) => (
                      <div
                        key={contract.id}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.04] last:border-0"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="flex items-center gap-1">
                              <Hash size={10} className="text-gray-500" />
                              G{contract.grupo}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard size={10} className="text-gray-500" />
                              Cota {contract.cota}
                            </span>
                            <span className="text-gray-500">{CONSORTIUM_LABELS[contract.consortium_type] || contract.consortium_type}</span>
                          </div>
                          {contract.criterio_de_lance && (
                            <p className="text-[10px] text-gray-500 mt-0.5">{contract.criterio_de_lance}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-text-primary">{formatCurrency(Number(contract.contract_value))}</p>
                          {contract.regra_da_venda && (
                            <p className="text-[10px] text-gray-500">{REGRA_LABELS[contract.regra_da_venda] || contract.regra_da_venda}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ClientFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadClients() }}
        />
      )}
    </div>
  )
}
