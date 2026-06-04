import type { SupabaseClient } from '@supabase/supabase-js'
import type { Client, AttentionAlert } from '@/types'

export const TAXA_MENSAL = {
  fase1: 0.001288,
  fase2: 0.002374,
  fase3: 0.003000,
} as const

export function getAssembleiaAlertDate(year: number, month: number): Date {
  const day15 = new Date(year, month, 15)
  const dayOfWeek = day15.getDay()
  const offset = dayOfWeek === 0 ? 3 : 2
  return new Date(year, month, 15 + offset)
}

export function isTodayAssembleiaAlertDay(): boolean {
  const today = new Date()
  const alertDate = getAssembleiaAlertDate(today.getFullYear(), today.getMonth())
  return today.toDateString() === alertDate.toDateString()
}

export function calcMonthlyPayment(creditValue: number, fase: 1 | 2 | 3): number {
  return Math.round(creditValue * TAXA_MENSAL[`fase${fase}`] * 100) / 100
}

export function generatePaymentSchedule(
  clientId: string,
  creditValue: number,
  dataFechamento: Date,
  totalMonths: number = 36
): Array<{ client_id: string; competencia: string; valor: number; fase: number }> {
  const schedule = []
  const startDate = new Date(dataFechamento)
  startDate.setDate(1)

  for (let i = 0; i < totalMonths; i++) {
    const competencia = new Date(startDate)
    competencia.setMonth(competencia.getMonth() + i)

    let fase: 1 | 2 | 3
    if (i < 11) fase = 1
    else if (i < 26) fase = 2
    else fase = 3

    schedule.push({
      client_id: clientId,
      competencia: competencia.toISOString().split('T')[0],
      valor: calcMonthlyPayment(creditValue, fase),
      fase,
    })
  }

  return schedule
}

export function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getCurrentFiscalMonth(): { year: number; month: number } {
  const now = new Date()
  const day = now.getDate()
  if (day >= 16) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const prev = new Date(now.getFullYear(), now.getMonth(), 0)
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 }
}

export function getFiscalMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 2, 16, 0, 0, 0)
  const end = new Date(year, month - 1, 15, 23, 59, 59)
  return { start, end }
}

export function fiscalMonthLabel(year: number, month: number): string {
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const prevMonth = month === 1 ? 12 : month - 1
  return `${names[month - 1]} (16/${String(prevMonth).padStart(2, '0')} — 15/${String(month).padStart(2, '0')})`
}

export async function calcPortfolioTotals(supabase: SupabaseClient, userId: string) {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, contract_value, status')
    .eq('user_id', userId)
    .eq('status', 'ativo')

  const totalCarteira = clients?.reduce((sum, c) => sum + Number(c.contract_value), 0) ?? 0

  const fiscal = getCurrentFiscalMonth()
  const { start } = getFiscalMonthRange(fiscal.year, fiscal.month)
  const competenciaMes = localDateStr(start)

  const { data: schedule } = await supabase
    .from('payment_schedule')
    .select('valor, pago')
    .in('client_id', clients?.map((c) => c.id) ?? [])
    .eq('competencia', competenciaMes)

  const totalPrevisto = schedule?.reduce((sum, s) => sum + Number(s.valor), 0) ?? 0
  const totalRecebido =
    schedule?.filter((s) => s.pago).reduce((sum, s) => sum + Number(s.valor), 0) ?? 0

  return { totalCarteira, totalPrevisto, totalRecebido }
}

const COMMISSION_RATES: Record<string, number> = {
  imoveis: 0.02,
  automovel: 0.02,
}

export function calcPredictedSalary(
  sales: Array<{ value: number; consortium_type?: string | null }>
): { grossCommission: number; monthlyInstallment: number } {
  const grossCommission = sales.reduce((sum, s) => {
    const rate = COMMISSION_RATES[s.consortium_type ?? ''] ?? 0.02
    return sum + Number(s.value) * rate
  }, 0)
  const monthlyInstallment = grossCommission / 13
  return { grossCommission, monthlyInstallment }
}

export function calcConversionRate(totalLeads: number, convertedLeads: number): number {
  if (totalLeads === 0) return 0
  return (convertedLeads / totalLeads) * 100
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  return phone
}

export async function getClientsNeedingAttention(
  supabase: SupabaseClient,
  userId: string
): Promise<AttentionAlert[]> {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const alerts: AttentionAlert[] = []

  const { data: boletoClients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .eq('payment_day', dayOfMonth)

  if (boletoClients?.length) {
    alerts.push({ reason: 'Boleto vence hoje', clients: boletoClients as Client[] })
  }

  const { data: tomorrowClients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .eq('payment_day', dayOfMonth + 1)

  if (tomorrowClients?.length) {
    alerts.push({ reason: 'Boleto vence amanhã', clients: tomorrowClients as Client[] })
  }

  if (isTodayAssembleiaAlertDay()) {
    const { data: assembleiaClients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ativo')

    if (assembleiaClients?.length) {
      alerts.push({
        reason: 'Dia da Assembleia — avisar todos os clientes',
        clients: assembleiaClients as Client[],
      })
    }

    const { data: lanceClients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .eq('regra_da_venda', 'lance_embutido_sempre')

    if (lanceClients?.length) {
      alerts.push({
        reason: 'Verificar lances embutidos na assembleia',
        clients: lanceClients as Client[],
      })
    }
  }

  const monthName = today.toLocaleString('pt-BR', { month: 'long' }).toLowerCase()
  const { data: mesEspecificoClients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .ilike('mes_oferta', monthName)

  if (mesEspecificoClients?.length) {
    alerts.push({
      reason: `Mês de oferta de lance — ${monthName}`,
      clients: mesEspecificoClients as Client[],
    })
  }

  return alerts
}

export function phoneVariants(raw: string): string[] {
  const variants = [raw]
  const with55 = raw.startsWith('55')
  const no55 = with55 ? raw.slice(2) : raw
  if (with55) variants.push(no55)
  else variants.push(`55${raw}`)

  if (no55.length >= 10) {
    const ddd = no55.slice(0, 2)
    const sub = no55.slice(2)
    if (sub.startsWith('9')) {
      const without9 = ddd + sub.slice(1)
      variants.push(without9)
      variants.push(`55${without9}`)
    }
    if (sub.length === 8 && no55.length === 10) {
      const with9 = ddd + '9' + sub
      variants.push(with9)
      variants.push(`55${with9}`)
    }
  }

  return [...new Set(variants)]
}

