import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { leadId, content } = await request.json()

    if (!leadId || !content) {
      return NextResponse.json({ error: 'leadId and content required' }, { status: 400 })
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'markello'

    if (!evolutionUrl || !evolutionKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    )

    const { data: lead } = await supabase
      .from('leads')
      .select('phone')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    let number = lead.phone
    if (!number.startsWith('55')) number = `55${number}`

    const evoResponse = await fetch(
      `${evolutionUrl}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({ number, text: content }),
      }
    )

    if (!evoResponse.ok) {
      const errText = await evoResponse.text().catch(() => '')
      return NextResponse.json(
        { error: `Falha ao enviar: ${evoResponse.status} ${errText}` },
        { status: 502 }
      )
    }

    const evolutionResult = await evoResponse.json()

    await supabase.from('messages').insert({
      lead_id: leadId,
      content,
      direction: 'outgoing',
      status: 'PENDING',
      whatsapp_message_id: evolutionResult.key?.id,
      timestamp: new Date().toISOString(),
    })

    await supabase
      .from('leads')
      .update({
        last_message_text: content,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq('id', leadId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno ao enviar mensagem' }, { status: 500 })
  }
}
