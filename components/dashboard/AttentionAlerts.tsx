'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getClientsNeedingAttention, formatCurrency } from '@/lib/business-rules'
import { cn } from '@/lib/utils'
import type { AttentionAlert } from '@/types'

export function AttentionAlerts() {
  const [alerts, setAlerts] = useState<AttentionAlert[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const loadAlerts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const result = await getClientsNeedingAttention(supabase, user.id)
      setAlerts(result)
    }
    loadAlerts()
    const interval = setInterval(loadAlerts, 300000)
    return () => clearInterval(interval)
  }, [supabase])

  if (alerts.length === 0) return null

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-yellow-400" />
        <h3 className="text-sm font-semibold text-text-primary">Atenção</h3>
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full ml-auto">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.reason} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === alert.reason ? null : alert.reason)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-card-hover transition-colors"
            >
              <span                className="text-text-secondary">{alert.reason}</span>
              <span className="text-xs text-text-secondary flex items-center gap-1">
                {alert.clients.length} cliente(s)
                {expanded === alert.reason ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {expanded === alert.reason && (
              <div className="px-3 pb-2 space-y-1">
                {alert.clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-2 text-xs text-text-secondary py-1 px-2 rounded bg-card-hover">
                    <span className="font-medium text-text-primary">{client.name}</span>
                    <span className="ml-auto">{formatCurrency(Number(client.contract_value))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

