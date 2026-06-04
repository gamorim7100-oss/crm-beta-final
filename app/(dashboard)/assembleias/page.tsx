'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, phoneVariants } from '@/lib/business-rules'
import { Search, Landmark, MessageCircle, Building2, Car, Hash, Tag, type LucideIcon } from 'lucide-react'

interface Client {
  id: string
  name: string
  phone: string
  grupo: number
  cota: number
  lote: string
  consortium_type: string
  contract_value: number
  data_fechamento: string
}

export default function AssembleiasPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, grupo, cota, lote, consortium_type, contract_value, data_fechamento')
        .eq('user_id', user.id)
        .in('status', ['ativo', 'contemplado'])
        .order('name')

      if (data) setClients(data)
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = clients.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleContact = async (client: Client) => {
    setSending(client.id)
    try {
      const msg = `Olá ${client.name.split(' ')[0]}! Tudo bem? Gostaria de lembrar sobre a próxima assembleia do seu grupo ${client.grupo}. Fique atento à data e horário. Qualquer dúvida estou à disposição!`
      const { data: leads } = await supabase
        .from('leads')
        .select('id, phone')
        .in('phone', phoneVariants(client.phone.replace(/\D/g, '')))
        .limit(1)

      if (leads && leads.length > 0) {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: leads[0].id, content: msg }),
        })
      } else {
        const phoneClean = client.phone.replace(/\D/g, '')
        window.open(`https://wa.me/55${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSending(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Assembleias</h1>
        <div className="grid gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const iconMap: Record<string, LucideIcon> = { automovel: Car, imoveis: Building2 }
  const labelMap: Record<string, string> = { automovel: 'Automóvel', imoveis: 'Imóveis', outros: 'Outros' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Assembleias</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="bg-bg-card border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-emerald-400 w-64"
          />
        </div>
      </div>

      <p className="text-sm text-gray-400">
        {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} ativo{filtered.length !== 1 ? 's' : ''}
      </p>

      <div className="grid gap-3">
        {filtered.map((client) => {
          const Icon = iconMap[client.consortium_type] || Landmark
          return (
            <div
              key={client.id}
              className="bg-bg-card border border-white/[0.06] rounded-xl p-4 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{client.name}</p>
                    <p className="text-xs text-gray-500">{formatPhone(client.phone)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mx-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Hash size={12} className="text-emerald-400" />
                    Grupo {client.grupo}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag size={12} className="text-emerald-400" />
                    {labelMap[client.consortium_type] || client.consortium_type}
                  </span>
                  {client.lote && (
                    <span className="text-gray-500">Lote {client.lote}</span>
                  )}
                </div>

                <button
                  onClick={() => handleContact(client)}
                  disabled={sending === client.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg transition-all disabled:opacity-50 shrink-0"
                >
                  <MessageCircle size={14} />
                  {sending === client.id ? 'Enviando...' : 'Contatar'}
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  )
}

