'use client'

import { useEffect, useState } from 'react'
import { Wallet, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getSalaryFiscalMonth, getFiscalMonthRange, localDateStr, fiscalMonthLabel } from '@/lib/business-rules'
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'

// Retorna o 1º dia do mês cujas parcelas devem ser exibidas
// Antes do 5º dia útil: mês atual. Após: próximo mês (projeção)
function getCompetenciaMonth(isNextMonth: boolean): string {
  const now = new Date()
  const offset = isNextMonth ? 1 : 0
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function SalaryCard() {
  const [total, setTotal] = useState(0)
  const [label, setLabel] = useState('')
  const [isNext, setIsNext] = useState(false)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fiscal = getSalaryFiscalMonth()
      setIsNext(fiscal.isNextMonth)
      setLabel(fiscalMonthLabel(fiscal.year, fiscal.month))

      // Busca todas as parcelas do mês de competência correspondente
      const competencia = getCompetenciaMonth(fiscal.isNextMonth)

      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)

      if (!clients?.length) return

      const clientIds = clients.map((c) => c.id)

      const { data: schedule } = await supabase
        .from('payment_schedule')
        .select('valor')
        .in('client_id', clientIds)
        .eq('competencia', competencia)

      const bruto = schedule?.reduce((sum, s) => sum + Number(s.valor), 0) ?? 0
      setTotal(Math.round(bruto * 0.83 * 100) / 100)
    }

    load()
    const interval = setInterval(load, 300000)
    return () => clearInterval(interval)
  }, [supabase])

  return (
    <div className="relative bg-bg-card border border-border rounded-2xl p-5 overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-300" style={{ background: '#14B8A6' }} />

      <div className="relative flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
          <Wallet size={22} className="text-white" />
        </div>
        <div className="flex items-start gap-1.5">
          {isNext && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-500 mt-0.5">
              próx. mês
            </span>
          )}
          <div className="group/info relative">
            <Info size={14} className="text-text-secondary cursor-help mt-1" />
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-bg-card border border-border rounded-xl p-3 text-xs text-text-secondary hidden group-hover/info:block z-10 shadow-xl">
              Soma das parcelas mensais de todos os clientes ativos no período.
              {isNext && ' A partir do 5º dia útil do mês, exibe a projeção do próximo período.'}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-1">Salário Previsto</p>
      <p className="text-3xl font-extrabold text-text-primary tabular-nums leading-tight">
        <AnimatedCounter to={total} formatFn={formatCurrency} />
      </p>
      {label && (
        <p className="text-xs text-text-secondary mt-1 truncate">{label}</p>
      )}
    </div>
  )
}
