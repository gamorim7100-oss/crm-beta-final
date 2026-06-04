'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generatePaymentSchedule } from '@/lib/business-rules'

interface ClientFormModalProps {
  onClose: () => void
  onSaved: () => void
}

export function ClientFormModal({ onClose, onSaved }: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    consortium_type: 'automovel',
    contract_value: '',
    grupo: '',
    cota: '',
    data_fechamento: '',
    criterio_de_lance: '',
  })
  const [saving, setSaving] = useState(false)
  const [supabase] = useState(() => createClient())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: formData.name,
        cpf: formData.cpf || null,
        phone: formData.phone || null,
        email: formData.email || null,
        consortium_type: formData.consortium_type,
        contract_value: Number(formData.contract_value),
        grupo: Number(formData.grupo) || null,
        cota: Number(formData.cota) || null,
        data_fechamento: formData.data_fechamento,
        criterio_de_lance: formData.criterio_de_lance || null,
        status: 'ativo',
      })
      .select()
      .single()

    if (client && !error) {
      const schedule = generatePaymentSchedule(
        client.id,
        Number(formData.contract_value),
        new Date(formData.data_fechamento)
      )

      if (schedule.length > 0) {
        await supabase.from('payment_schedule').insert(schedule)
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-text-primary mb-4">Novo Cliente</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Identificação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">CPF</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Dados do Consórcio</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Tipo *</label>
                <select
                  value={formData.consortium_type}
                  onChange={(e) => setFormData({ ...formData, consortium_type: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                >
                  <option value="automovel">Automóvel</option>
                  <option value="imoveis">Imóveis</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Valor do crédito *</label>
                <input
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Grupo</label>
                <input
                  type="number"
                  value={formData.grupo}
                  onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                  placeholder="ex: 12180"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Cota</label>
                <input
                  type="number"
                  value={formData.cota}
                  onChange={(e) => setFormData({ ...formData, cota: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Data de fechamento *</label>
                <input
                  type="date"
                  value={formData.data_fechamento}
                  onChange={(e) => setFormData({ ...formData, data_fechamento: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400 [color-scheme:dark]"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Critério de Lance</label>
                <textarea
                  value={formData.criterio_de_lance}
                  onChange={(e) => setFormData({ ...formData, criterio_de_lance: e.target.value })}
                  className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-400 h-20 resize-none"
                  placeholder="Observações sobre o lance do cliente..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm border border-border rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name || !formData.contract_value || !formData.data_fechamento}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

