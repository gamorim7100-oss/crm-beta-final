'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getFiscalMonthRange, fiscalMonthLabel, localDateStr } from '@/lib/business-rules'
import { CONSORTIUM_COLORS, CONSORTIUM_LABELS } from '@/lib/constants'
import { TrendingUp } from 'lucide-react'

export function SalesChart() {
  const [data, setData] = useState<{ name: string; qty: number; total: number; consortium_type: string }[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const loadMonths = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clients } = await supabase
        .from('clients')
        .select('data_fechamento')
        .eq('user_id', user.id)
        .order('data_fechamento', { ascending: true })

      if (!clients || clients.length === 0) return

      function getFiscalYearMonth(dateStr: string): string {
        const d = new Date(dateStr)
        const day = d.getDate()
        if (day >= 16) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        }
        const prev = new Date(d.getFullYear(), d.getMonth(), 0)
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
      }

      const seen = new Set<string>()
      const monthList: string[] = []
      for (const c of clients) {
        const m = c.data_fechamento ? getFiscalYearMonth(c.data_fechamento) : null
        if (m && !seen.has(m)) {
          seen.add(m)
          monthList.push(m)
        }
      }
      setMonths(monthList)
      setSelectedMonth(monthList[monthList.length - 1])
    }
    loadMonths()
  }, [supabase])

  useEffect(() => {
    if (!selectedMonth) return
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [yearStr, monthStr] = selectedMonth.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)
      const { start, end } = getFiscalMonthRange(year, month)

      const { data: clients } = await supabase
        .from('clients')
        .select('consortium_type, contract_value')
        .eq('user_id', user.id)
        .gte('data_fechamento', localDateStr(start))
        .lte('data_fechamento', localDateStr(end))

      if (!clients) return

      const grouped = clients.reduce(
        (acc, client) => {
          const key = client.consortium_type
          if (!acc[key]) acc[key] = { name: CONSORTIUM_LABELS[key] || key, qty: 0, total: 0, consortium_type: key }
          acc[key].qty++
          acc[key].total += Number(client.contract_value)
          return acc
        },
        {} as Record<string, { name: string; qty: number; total: number; consortium_type: string }>
      )

      setData(Object.values(grouped))
    }

    loadData()
  }, [selectedMonth, supabase])

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-text-primary">Vendas por Tipo</h3>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-bg-input text-text-primary text-xs border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400"
        >
          {months.length === 0 && <option value="">Sem vendas</option>}
          {months.map((m) => {
            const [y, mo] = m.split('-')
            return (
              <option key={m} value={m}>
                {fiscalMonthLabel(Number(y), Number(mo))}
              </option>
            )
          })}
        </select>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
          Nenhuma venda neste período
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="qty"
                  nameKey="name"
                  stroke="transparent"
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={CONSORTIUM_COLORS[entry.consortium_type] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                  itemStyle={{ color: '#F9FAFB' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#D1D5DB', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" tick={{ fill: '#D1D5DB', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#D1D5DB', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                  formatter={(value: number) => formatCurrency(value)}
                  itemStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} background={{ fill: 'rgba(255,255,255,0.03)' }}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={CONSORTIUM_COLORS[entry.consortium_type] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-2 grid grid-cols-3 gap-2 mt-2">
            {data.map((item) => (
              <div key={item.name} className="bg-card-hover rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary">{item.name}</p>
                <p className="text-lg font-bold text-text-primary">{item.qty}</p>
                <p className="text-xs text-text-secondary">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
