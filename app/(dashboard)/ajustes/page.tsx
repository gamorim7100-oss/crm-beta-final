'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, calcMonthlyPayment } from '@/lib/business-rules'
import {
  Search,
  Save,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import type { Client } from '@/types'

interface EditableClient {
  original: Client
  edited: Partial<Client>
  saving: boolean
  expanded: boolean
}

type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox'

interface FieldDef {
  key: keyof Client
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  colSpan?: number
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Nome', type: 'text' },
  { key: 'phone', label: 'Telefone', type: 'text' },
  { key: 'cpf', label: 'CPF', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'grupo', label: 'Grupo', type: 'number' },
  { key: 'cota', label: 'Cota', type: 'number' },
  {
    key: 'consortium_type', label: 'Tipo Consórcio', type: 'select',
    options: [
      { value: 'automovel', label: 'Automóvel' },
      { value: 'imoveis', label: 'Imóveis' },
      { value: 'outros', label: 'Outros' },
    ],
  },
  { key: 'contract_value', label: 'Valor Crédito', type: 'number' },
  {
    key: 'status', label: 'Status', type: 'select',
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'inativo', label: 'Inativo' },
      { value: 'contemplado', label: 'Contemplado' },
    ],
  },
  { key: 'data_fechamento', label: 'Data Fechamento', type: 'date' },
  { key: 'criterio_de_lance', label: 'Critério de Lance', type: 'text', colSpan: 2 },
]

const STATUS_COLORS: Record<string, string> = {
  ativo: 'text-emerald-400',
  inativo: 'text-gray-400',
  contemplado: 'text-blue-400',
}

export default function AjustesPage() {
  const [clients, setClients] = useState<EditableClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [supabase] = useState(() => createClient())

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    setClients(
      (data || []).map((c) => ({
        original: c as Client,
        edited: {},
        saving: false,
        expanded: false,
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [supabase])

  const updateField = (idx: number, key: keyof Client, value: any) => {
    setClients((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], edited: { ...updated[idx].edited, [key]: value } }
      return updated
    })
  }

  const getValue = (c: EditableClient, key: keyof Client) => {
    if (key in c.edited) return (c.edited as any)[key]
    return (c.original as any)[key]
  }

  const hasChanges = (c: EditableClient) => Object.keys(c.edited).length > 0

  const save = async (idx: number) => {
    const c = clients[idx]
    if (!hasChanges(c)) return

    setClients((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], saving: true }
      return updated
    })

    const { error } = await supabase
      .from('clients')
      .update(c.edited)
      .eq('id', c.original.id)

    setClients((prev) => {
      const updated = [...prev]
      if (error) {
        setMessage({ type: 'error', text: `Erro: ${error.message}` })
        updated[idx] = { ...updated[idx], saving: false }
      } else {
        setMessage({ type: 'success', text: `${c.original.name} atualizado.` })
        updated[idx] = {
          original: { ...updated[idx].original, ...updated[idx].edited },
          edited: {},
          saving: false,
          expanded: updated[idx].expanded,
        }
      }
      return updated
    })

    setTimeout(() => setMessage(null), 3000)
  }

  const discard = (idx: number) => {
    setClients((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], edited: {} }
      return updated
    })
  }

  const filtered = clients.filter((c) =>
    !search ||
    c.original.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.original.phone?.includes(search) ||
    c.original.cpf?.includes(search)
  )

  const renderField = (c: EditableClient, field: FieldDef) => {
    const value = getValue(c, field.key)
    const edited = field.key in c.edited

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => updateField(clients.indexOf(c), field.key, e.target.checked)}
            className="rounded border-white/20 bg-bg-input"
          />
          <span className={`text-xs ${edited ? 'text-emerald-400' : 'text-gray-400'}`}>
            {value ? 'Sim' : 'Não'}
          </span>
        </label>
      )
    }

    if (field.type === 'select') {
      return (
        <select
          value={value ?? ''}
          onChange={(e) => updateField(clients.indexOf(c), field.key, e.target.value)}
          className={`w-full bg-bg-input border text-xs rounded px-2 py-1.5 focus:outline-none focus:border-emerald-400 ${
            edited ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-gray-200'
          }`}
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={field.type}
        value={value ?? ''}
        onChange={(e) => updateField(
          clients.indexOf(c),
          field.key,
          field.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value
        )}
        className={`w-full bg-bg-input border text-xs rounded px-2 py-1.5 focus:outline-none focus:border-emerald-400 ${
          edited ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-gray-200'
        }`}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Ajustes</h1>
        <div className="bg-bg-card rounded-xl h-96 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Ajustes</h1>
          <p className="text-xs text-gray-500">{clients.length} clientes</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="bg-bg-card border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400 w-56"
          />
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((c, idx) => {
          const actualIdx = clients.indexOf(c)
          const changed = hasChanges(c)
          return (
            <div
              key={c.original.id}
              className={`bg-bg-card border rounded-xl overflow-hidden ${
                changed ? 'border-emerald-500/30' : 'border-white/[0.06]'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {c.original.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">{c.original.name}</span>
                      <span className={`text-[10px] font-medium ${STATUS_COLORS[c.original.status] || 'text-gray-400'}`}>
                        {c.original.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      {c.original.grupo && <span>G{c.original.grupo}</span>}
                      {c.original.cota && <span>Cota {c.original.cota}</span>}
                      <span>{formatCurrency(Number(c.original.contract_value))}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {changed && (
                    <>
                      <button
                        onClick={() => save(actualIdx)}
                        disabled={c.saving}
                        className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save size={13} />
                        {c.saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => discard(actualIdx)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <X size={13} />
                        Descartar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      const updated = [...clients]
                      updated[actualIdx] = { ...updated[actualIdx], expanded: !updated[actualIdx].expanded }
                      setClients(updated)
                    }}
                    className="text-gray-500 hover:text-white p-1"
                  >
                    {c.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded fields */}
              {c.expanded && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    {FIELDS.map((field) => (
                      <div
                        key={field.key}
                        className={field.colSpan === 2 ? 'md:col-span-2 lg:col-span-3' : undefined}
                      >
                        <label className="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wider">
                          {field.label}
                        </label>
                        {renderField(c, field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xs">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

