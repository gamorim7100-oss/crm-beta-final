import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const EVOLUTION_API = process.env.EVOLUTION_API_URL!
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'markello'

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(_name: string, _value: string, _options: CookieOptions) {},
          remove(_name: string, _options: CookieOptions) {},
        },
      }
    )
    const { data: { user } } = await anonSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, leadId } = await req.json()
    if (!phone || !leadId) {
      return NextResponse.json({ error: 'phone and leadId required' }, { status: 400 })
    }

    const jidPhone = phone.startsWith('55') ? phone : `55${phone}`
    const targetJid = `${jidPhone}@s.whatsapp.net`

    const targetJids = [targetJid]
    const no55 = jidPhone.startsWith('55') ? jidPhone.slice(2) : jidPhone
    if (no55.length >= 10) {
      const ddd = no55.slice(0, 2), sub = no55.slice(2)
      if (sub.startsWith('9')) {
        const alt = `${ddd}${sub.slice(1)}@s.whatsapp.net`
        targetJids.push(alt)
      }
      if (sub.length === 8 && no55.length === 10) {
        const alt = `${ddd}9${sub}@s.whatsapp.net`
        targetJids.push(alt)
      }
    }

    const evoRes = await fetch(
      `${EVOLUTION_API}/chat/findMessages/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          take: 200,
          orderBy: { timestamp: 'asc' },
        }),
      }
    )

    if (!evoRes.ok) {
      const errText = await evoRes.text().catch(() => '')
      return NextResponse.json(
        { error: `Evolution API error: ${evoRes.status} ${errText}` },
        { status: 502 }
      )
    }

    const evoData = await evoRes.json()
    const records = evoData?.messages?.records || []

    const matchingMessages = records.filter((msg: any) => {
      const remoteJid = msg.key?.remoteJid || ''
      const remoteJidAlt = msg.key?.remoteJidAlt || ''
      return targetJids.includes(remoteJid) || targetJids.includes(remoteJidAlt)
    })

    if (matchingMessages.length === 0) {
      return NextResponse.json({ synced: 0 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: lead } = await supabase
      .from('leads')
      .select('user_id')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: existingMsgs } = await supabase
      .from('messages')
      .select('whatsapp_message_id')
      .eq('lead_id', leadId)
      .not('whatsapp_message_id', 'is', null)

    const existingIds = new Set(existingMsgs?.map((m) => m.whatsapp_message_id) || [])

    const toInsert: any[] = []
    for (const msg of matchingMessages) {
      const whatsappId = msg.key?.id
      if (!whatsappId || existingIds.has(whatsappId)) continue

      const direction = msg.key?.fromMe ? 'outgoing' : 'incoming'
      let content = ''
      let mediaType: string | undefined
      let messageData: any = msg.message || null

      if (msg.message?.conversation) {
        content = msg.message.conversation
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text
      } else if (msg.message?.imageMessage) {
        content = '[image]'
        mediaType = 'image'
      } else if (msg.message?.audioMessage) {
        content = '[audio]'
        mediaType = 'audio'
      } else if (msg.message?.videoMessage) {
        content = '[video]'
        mediaType = 'video'
      } else if (msg.message?.documentMessage) {
        content = '[document]'
        mediaType = 'document'
      } else if (msg.message?.stickerMessage) {
        content = '[sticker]'
      } else {
        content = '[message]'
      }

      toInsert.push({
        lead_id: leadId,
        content,
        direction,
        whatsapp_message_id: whatsappId,
        media_type: mediaType,
        message_data: messageData,
        timestamp: msg.messageTimestamp
          ? new Date((msg.messageTimestamp as number) * 1000).toISOString()
          : new Date().toISOString(),
        status: direction === 'outgoing' ? 'SENT' : 'RECEIVED',
      })
    }

    let synced = 0
    if (toInsert.length > 0) {
      const { data: inserted } = await supabase.from('messages').insert(toInsert).select()
      synced = inserted?.length || toInsert.length
    }

    return NextResponse.json({ synced })
  } catch (error: any) {
    console.error('Evolution history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

