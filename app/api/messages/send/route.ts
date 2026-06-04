import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { leadId, content } = await request.json()

    if (!leadId || !content) {
      return NextResponse.json({ error: 'leadId and content required' }, { status: 400 })
    }

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: lead } = await supabase
      .from('leads')
      .select('phone')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    let evolutionResult: any = { key: { id: null } }

    if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
      let number = lead.phone
      if (!number.startsWith('55')) number = `55${number}`

      const response = await fetch(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number,
            text: content,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.statusText}`)
      }

      evolutionResult = await response.json()
    }

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
    console.error('Send message error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

