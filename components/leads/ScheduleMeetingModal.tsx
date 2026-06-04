'use client'

import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  lead: { id: string; name?: string; phone: string }
  onClose: () => void
  onSaved: () => void
}

export function ScheduleMeetingModal({ lead, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [startTime, setStartTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [endTime, setEndTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 2, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [title, setTitle] = useState(`Reunião com ${lead.name || lead.phone}`)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    await supabase.from('meetings').insert({
      user_id: user.id,
      lead_id: lead.id,
      title,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      color: '#F59E0B',
    })

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-text-primary">Agendar Reunião</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Lead</label>
            <p className="text-sm text-text-primary bg-bg-primary rounded-lg px-3 py-2 border border-border">
              {lead.name || lead.phone}
            </p>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Início</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-400 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Fim</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-400 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

