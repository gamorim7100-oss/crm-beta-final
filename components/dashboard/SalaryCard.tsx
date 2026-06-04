'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcPredictedSalary, formatCurrency, getCurrentFiscalMonth, getFiscalMonthRange, localDateStr } from '@/lib/business-rules'
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'

export function SalaryCard() {
  const [salary, setSalary] = useState<{ grossCommission: number; monthlyInstallment: number } | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fiscal = getCurrentFiscalMonth()
      const { start, end } = getFiscalMonthRange(fiscal.year, fiscal.month)

      const { data: sales } = await supabase
        .from('sales')
        .select('value, consortium_type')
        .eq('user_id', user.id)
        .gte('sale_date', localDateStr(start))
        .lte('sale_date', localDateStr(end))

      setSalary(calcPredictedSalary(sales ?? []))
    }

    load()
    const interval = setInterval(load, 300000)
    return () => clearInterval(interval)
  }, [supabase])

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Salário Previsto</p>
            <div className="group relative">
              <Info size={12} className="text-text-secondary cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-bg-secondary border border-white/10 rounded-lg p-2 text-xs text-text-secondary hidden group-hover:block z-10">
                 2% de comissão sobre vendas do período (fechamento dia 15), dividido em 13 meses
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
            {salary ? (
              <AnimatedCounter to={salary.monthlyInstallment} formatFn={formatCurrency} />
            ) : 'R$ 0,00'}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">(previsto)</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
          <DollarSign size={20} className="text-teal-400" />
        </div>
      </div>
      {salary && salary.grossCommission > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-secondary">
            Comissão bruta: <span className="text-text-primary">{formatCurrency(salary.grossCommission)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

