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
          .from('clients')
          .select('contract_value')
          .eq('user_id', user.id)
          .gte('data_fechamento', localDateStr(startOfMonth))
          .lte('data_fechamento', localDateStr(endOfMonth)),
        supabase
          .from('clients')
          .select('contract_value')
          .eq('user_id', user.id),
        supabase
          .from('clients')
          .select('id, cpf')
          .eq('user_id', user.id)
          .eq('status', 'ativo'),
        supabase
          .from('leads')
          .select('status')
          .eq('user_id', user.id),
      ])

      const monthTotal = monthSalesRes.data?.reduce((sum, s) => sum + Number(s.contract_value), 0) ?? 0
      const totalSold = totalSalesRes.data?.reduce((sum, s) => sum + Number(s.contract_value), 0) ?? 0

      const totalLeads = leadsRes.data?.length ?? 0
      const convertedLeads = leadsRes.data?.filter(
        (l) => l.status === 'venda_concluida'
      ).length ?? 0

      setStats({
        monthSales: monthTotal,
        totalSales: totalSold,
        activeClients: new Set((activeClientsRes.data ?? []).map((c) => c.cpf ? c.cpf.replace(/\D/g, '') : `__${c.id}`)).size,
        conversionRate: calcConversionRate(totalLeads, convertedLeads),
      })
      setLoading(false)
    }

    loadStats()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadStats)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
          gradient="linear-gradient(135deg, #10B981, #059669)"
          iconColor="text-white"
          progressColor="#10B981"
          subtitle="Vendas deste período"
        />

        <KpiCard
          title="Total Vendido"
          value={formatCurrency(stats.totalSales)}
          animateValue={stats.totalSales}
          formatValue={formatCurrency}
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #14B8A6, #0D9488)"
          iconColor="text-white"
          progressColor="#14B8A6"
          subtitle="Histórico completo"
        />

        <KpiCard
          title="Taxa de Conversão"
          value={`${stats.conversionRate.toFixed(1)}%`}
          animateValue={stats.conversionRate}
          formatValue={(v) => `${v.toFixed(1)}%`}
          icon={Target}
          gradient="linear-gradient(135deg, #8B5CF6, #7C3AED)"
          iconColor="text-white"
          progress={stats.conversionRate}
          progressColor="#8B5CF6"
        />

        <KpiCard
          title="Clientes Ativos"
          value={stats.activeClients}
          animateValue={stats.activeClients}
          icon={UserCheck}
          gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
          iconColor="text-white"
          progressColor="#3B82F6"
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

