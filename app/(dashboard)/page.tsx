'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, UserCheck, Target, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { SalaryCard } from '@/components/dashboard/SalaryCard'
import { TodayMeetings } from '@/components/dashboard/TodayMeetings'
import { AttentionAlerts } from '@/components/dashboard/AttentionAlerts'
import { formatCurrency, getCurrentFiscalMonth, getFiscalMonthRange, localDateStr, calcConversionRate } from '@/lib/business-rules'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    monthSales: 0,
    totalSales: 0,
    activeClients: 0,
    conversionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const fiscal = getCurrentFiscalMonth()
      const { start: startOfMonth, end: endOfMonth } = getFiscalMonthRange(fiscal.year, fiscal.month)

      const [monthSalesRes, totalSalesRes, activeClientsRes, leadsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('value')
          .eq('user_id', user.id)
          .gte('sale_date', localDateStr(startOfMonth))
          .lte('sale_date', localDateStr(endOfMonth)),
        supabase
          .from('sales')
          .select('value')
          .eq('user_id', user.id),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'ativo'),
        supabase
          .from('leads')
          .select('status')
          .eq('user_id', user.id),
      ])

      const monthTotal = monthSalesRes.data?.reduce((sum, s) => sum + Number(s.value), 0) ?? 0
      const totalSold = totalSalesRes.data?.reduce((sum, s) => sum + Number(s.value), 0) ?? 0

      const totalLeads = leadsRes.data?.length ?? 0
      const convertedLeads = leadsRes.data?.filter(
        (l) => l.status === 'venda_concluida'
      ).length ?? 0

      setStats({
        monthSales: monthTotal,
        totalSales: totalSold,
        activeClients: activeClientsRes.count ?? 0,
        conversionRate: calcConversionRate(totalLeads, convertedLeads),
      })
      setLoading(false)
    }

    loadStats()
    const interval = setInterval(loadStats, 300000)
    return () => clearInterval(interval)
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl h-32 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-bg-card rounded-xl h-80 animate-pulse" />
          <div className="bg-bg-card rounded-xl h-80 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Vendido no Mês"
          value={formatCurrency(stats.monthSales)}
          animateValue={stats.monthSales}
          formatValue={formatCurrency}
          icon={BarChart3}
          color="bg-emerald-500/20"
          subtitle="Vendas deste período"
        />

        <KpiCard
          title="Total Vendido"
          value={formatCurrency(stats.totalSales)}
          animateValue={stats.totalSales}
          formatValue={formatCurrency}
          icon={TrendingUp}
          color="bg-emerald-500/20"
          subtitle="Histórico completo"
        />

        <KpiCard
          title="Taxa de Conversão"
          value={`${stats.conversionRate.toFixed(1)}%`}
          animateValue={stats.conversionRate}
          formatValue={(v) => `${v.toFixed(1)}%`}
          icon={Target}
          color="bg-purple-500/20"
          progress={stats.conversionRate}
        />

        <KpiCard
          title="Clientes Ativos"
          value={stats.activeClients}
          animateValue={stats.activeClients}
          icon={UserCheck}
          color="bg-blue-500/20"
        />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div className="space-y-6">
          <SalaryCard />
          <TodayMeetings />
          <AttentionAlerts />
        </div>
      </div>
    </div>
  )
}

