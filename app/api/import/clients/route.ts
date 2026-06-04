import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generatePaymentSchedule, calcMonthlyPayment } from '@/lib/business-rules'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n')
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = { imported: 0, skipped: 0, errors: 0, errors_detail: [] as string[] }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map((v) => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })

      try {
        const consortiumType = (row.tipo || 'automovel').toLowerCase()
        if (!['automovel', 'imoveis', 'outros'].includes(consortiumType)) continue

        const contractValue = parseFloat(row.credito || row.valor || '0')
        if (contractValue <= 0) {
          results.skipped++
          continue
        }

        const dataFechamento = row.data_fechamento || row.data || new Date().toISOString().split('T')[0]

        const loteDate = new Date(dataFechamento)
        const lote = `${loteDate.toLocaleString('pt-BR', { month: 'long' }).toLowerCase()}_${loteDate.getFullYear()}`

        const monthlyPayment = calcMonthlyPayment(contractValue, 1)

        const { data: client, error } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: row.nome || row.name || 'Cliente',
            phone: row.telefone || row.phone || null,
            email: row.email || null,
            cpf: row.cpf || null,
            grupo: parseInt(row.grupo) || null,
            cota: parseInt(row.cota) || null,
            consortium_type: consortiumType,
            contract_value: contractValue,
            monthly_payment_base: monthlyPayment,
            payment_day: parseInt(row.dia_vencimento || row.payment_day) || 5,
            status: 'ativo',
            data_fechamento: dataFechamento,
            lote,
            lance_embutido: row.lance_embutido?.toLowerCase() === 'true' || row.lance_embutido === '1',
            percentual_lance: parseFloat(row.percentual_lance) || null,
            titulo_lance: parseFloat(row.titulo_lance) || null,
            regra_da_venda: row.regra_da_venda || 'sem_lance',
            mes_oferta: row.mes_oferta || null,
            notes: row.observacoes || null,
          })
          .select()
          .single()

        if (error) throw error

        if (client) {
          const schedule = generatePaymentSchedule(
            client.id,
            contractValue,
            new Date(dataFechamento)
          )

          if (schedule.length > 0) {
            await supabase.from('payment_schedule').insert(schedule)
          }
        }

        results.imported++
      } catch (err: any) {
        results.errors++
        results.errors_detail.push(`Line ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

