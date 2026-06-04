'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, calcMonthlyPayment } from '@/lib/business-rules'
import { Calendar, CheckCircle, XCircle, ChevronLeft } from 'lucide-react'
import type { PaymentSchedule, Client } from '@/types'
import Link from 'next/link'

export default function CronogramaPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single()

      if (clientData) {
        setClient(clientData as Client)
      }

      const { data: scheduleData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('client_id', params.id)
        .order('competencia', { ascending: true })

      if (scheduleData) {
        setSchedule(scheduleData as PaymentSchedule[])
      }

      setLoading(false)
    }

    if (params.id) load()
  }, [params.id, supabase])

  const filteredSchedule = schedule.filter((s) => {
    const itemYear = new Date(s.competencia).getFullYear()
    if (itemYear !== year) return false
    if (selectedPhase !== null && s.fase !== selectedPhase) return false
    return true
  })

  const yearTotal = schedule
    .filter((s) => new Date(s.competencia).getFullYear() === year)
    .reduce((sum, s) => sum + Number(s.valor), 0)

  const receivedTotal = schedule
    .filter((s) => new Date(s.competencia).getFullYear() === year && s.pago)
    .reduce((sum, s) => sum + Number(s.valor), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-bg-card rounded-xl h-24 animate-pulse" />
        <div className="bg-bg-card rounded-xl h-96 animate-pulse" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Cliente não encontrado</p>
        <Link href="/clientes" className="text-emerald-400 text-sm mt-2 inline-block">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/clientes"
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Voltar para Clientes
      </Link>

      <div className="bg-bg-card border border-white/[0.06] rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{client.name}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Grupo {client.grupo} · Cota {client.cota} · {formatCurrency(Number(client.contract_value))}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Parcela atual:{' '}
              <span className="text-gray-300">
                {formatCurrency(calcMonthlyPayment(Number(client.contract_value), 1))}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Previsto no ano</p>
            <p className="text-lg font-bold text-text-primary">{formatCurrency(yearTotal)}</p>
            <p className="text-xs text-gray-500">
              Recebido: {formatCurrency(receivedTotal)} ({yearTotal > 0 ? ((receivedTotal / yearTotal) * 100).toFixed(0) : 0}%)
            </p>
          </div>
        </div>

        <div className="h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
            style={{
              width: `${yearTotal > 0 ? (receivedTotal / yearTotal) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="bg-bg-card border border-white/[0.06] rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 mb-4">
          <Calendar size={18} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-text-primary">Cronograma de Pagamentos</h3>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-bg-input text-gray-300 text-xs border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 ml-auto"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() + i
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            })}
          </select>

          <div className="flex gap-1">
            {[null, 1, 2, 3].map((f) => (
              <button
                key={f || 'all'}
                onClick={() => setSelectedPhase(f)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  selectedPhase === f
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-white bg-white/5'
                }`}
              >
                {f ? `Fase ${f}` : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        {filteredSchedule.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma parcela encontrada para este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Competência</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Fase</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-medium">Valor</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-400 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-400 font-medium">Data Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/[0.03] hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-text-primary">
                      {new Date(item.competencia).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          item.fase === 1
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.fase === 2
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        Fase {item.fase}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-primary font-medium">
                      {formatCurrency(Number(item.valor))}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.pago ? (
                        <CheckCircle size={16} className="text-emerald-400 inline" />
                      ) : (
                        <XCircle size={16} className="text-gray-500 inline" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">
                      {item.data_pagamento
                        ? new Date(item.data_pagamento).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

