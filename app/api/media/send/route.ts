import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { leadId, media, mediaType, fileName, caption } = await request.json()

    if (!leadId || !media || !mediaType) {
      return NextResponse.json({ error: 'leadId, media and mediaType required' }, { status: 400 })
    }

    const validTypes = ['image', 'audio', 'video', 'document']
    if (!validTypes.includes(mediaType)) {
      return NextResponse.json({ error: 'Invalid mediaType' }, { status: 400 })
    }

    const rawMedia = media.startsWith('data:') ? media.split(',')[1] : media

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

    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      return NextResponse.json({ error: 'Evolution API not configured' }, { status: 500 })
    }

    let evolutionResult: any = { key: { id: null } }

    if (mediaType === 'audio') {
      let number = lead.phone
      if (!number.startsWith('55')) number = `55${number}`
      const response = await fetch(
        `${evolutionUrl}/message/sendWhatsAppAudio/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evolutionKey,
          },
          body: JSON.stringify({
            number,
            audio: rawMedia,
            encoding: 'PTT',
            ...(caption && { caption }),
          }),
        }
      )
      if (!response.ok) throw new Error(`Evolution API error: ${response.statusText}`)
      evolutionResult = await response.json()
    } else {
      let number2 = lead.phone
      if (!number2.startsWith('55')) number2 = `55${number2}`
      const body: any = {
        number: number2,
        media: rawMedia,
        mediaType,
      }
      if (caption) body.caption = caption
      if (fileName) body.fileName = fileName

      const response = await fetch(
        `${evolutionUrl}/message/sendMedia/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evolutionKey,
          },
          body: JSON.stringify(body),
        }
      )
      if (!response.ok) throw new Error(`Evolution API error: ${response.statusText}`)
      evolutionResult = await response.json()
    }

    await supabase.from('messages').insert({
      lead_id: leadId,
      content: caption || `[${mediaType}]`,
      direction: 'outgoing',
      status: 'PENDING',
      media_url: rawMedia,
      media_type: mediaType,
      whatsapp_message_id: evolutionResult.key?.id,
      timestamp: new Date().toISOString(),
    })

    await supabase
      .from('leads')
      .update({
        last_message_text: caption || `[${mediaType}]`,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq('id', leadId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Media send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

