'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, ConsortiumType } from '@/types'

interface LeadFormProps {
  lead?: Lead | null
  onClose: () => void
  onSaved: () => void
}

export function LeadForm({ lead, onClose, onSaved }: LeadFormProps) {
  const [name, setName] = useState(lead?.name || '')
  const [phone, setPhone] = useState(lead?.phone || '')
  const [email, setEmail] = useState(lead?.email || '')
  const [consortiumInterest, setConsortiumInterest] = useState<ConsortiumType | ''>(
    lead?.consortium_interest || ''
  )
  const [notes, setNotes] = useState(lead?.notes || '')
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const data = {
      user_id: user.id,
      name: name || null,
      phone,
      email: email || null,
      consortium_interest: consortiumInterest || null,
      notes: notes || null,
    }

    try {
      if (lead) {
        await supabase.from('leads').update(data).eq('id', lead.id)
      } else {
        await supabase.from('leads').insert(data)
      }

      setLoading(false)
      onSaved()
      onClose()
    } catch (error) {
      console.error('LeadForm error:', error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-text-secondary mb-1">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
          placeholder="Nome do lead"
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Telefone *</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
          placeholder="(00) 00000-0000"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
          placeholder="email@exemplo.com"
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Interesse</label>
        <select
          value={consortiumInterest}
          onChange={(e) => setConsortiumInterest(e.target.value as ConsortiumType)}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
        >
          <option value="">Selecionar...</option>
          <option value="automovel">Automóvel</option>
          <option value="imoveis">Imóveis</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-text-secondary mb-1">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400 h-20 resize-none"
          placeholder="Observações..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm border border-border rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !phone}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50"
        >
          {loading ? 'Salvando...' : lead ? 'Atualizar' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}

