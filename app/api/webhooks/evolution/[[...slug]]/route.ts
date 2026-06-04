import { phoneVariants } from '@/lib/business-rules'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getEventFromUrl(url: string): string | null {
  const match = url.match(/\/api\/webhooks\/evolution(?:\/(.+))?$/)
  if (!match) return null
  const slug = match[1]
  if (!slug) return null
  return slug.split('/').pop()?.replace(/-/g, '_').toUpperCase() || null
}

function extractPhone(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '').replace(/@lid$/, '')
}

async function processMessage(supabase: any, message: any) {
  const rawJid = message.key?.remoteJid || ''
  if (rawJid.includes('@g.us')) return

  const altJid = message.key?.remoteJidAlt || ''
  const rawPhone = extractPhone(rawJid)
  const altPhone = extractPhone(altJid)
  const phone = (rawJid.includes('@lid') && altPhone) ? altPhone : rawPhone

  if (!phone) {
    if (rawJid) console.log('Webhook: LID phone no alt for', rawJid)
    return
  }
  if (message.key?.fromMe) return

  const phoneClean = phone.replace(/\D/g, '')
  const phones = phoneVariants(phoneClean)

  const pushName = message.pushName || message.notifyName || null

  const msg = message.message || {}
  const mediaType =
    msg.imageMessage ? 'image' :
    msg.audioMessage ? 'audio' :
    msg.videoMessage ? 'video' :
    msg.documentMessage ? 'document' :
    null
  const mediaContent = msg.imageMessage || msg.audioMessage || msg.videoMessage || msg.documentMessage
  const mediaUrl = mediaContent?.url || mediaContent?.directPath || null

  const content =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    (mediaType ? `[${mediaType}]` : null)

  if (!content) return

  const { data: clientRows } = await supabase
    .from('clients')
    .select('id, phone')

  const existingClient = (clientRows || []).find((c: any) => {
    const dbPhone = (c.phone || '').replace(/\D/g, '')
    return phones.includes(dbPhone)
  })

  async function findLeadByPhones(): Promise<any> {
    const { data } = await supabase
      .from('leads')
      .select('id, user_id, name')
      .in('phone', phones)
    if (data && data.length === 1) return data[0]
    if (data && data.length > 1) {
      const exact = data.find((l: any) => phones.includes(l.phone))
      return exact || data[0]
    }
    return null
  }

  if (existingClient) {
    let clientLead = await findLeadByPhones()

    if (!clientLead) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single()

      if (profile) {
        const storedPhone = phoneClean.startsWith('55') ? phoneClean.slice(2) : phoneClean
        console.log('Webhook: creating pos-venda lead for client', existingClient.id, 'phone', storedPhone)
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            phone: storedPhone,
            name: pushName || existingClient.name,
            user_id: profile.id,
            status: 'venda_concluida',
            kanban_position: 3,
          })
          .select()
          .single()

        if (newLead) {
          console.log('Webhook: created pos-venda lead', newLead.id, 'for client', storedPhone)
          clientLead = { id: newLead.id, user_id: newLead.user_id, name: newLead.name }
        }
      }
    }

    if (clientLead) {
      await insertMessageAndUpdateLead(supabase, clientLead, content, mediaType, mediaUrl, message)
    }
    return
  }

  let lead = await findLeadByPhones()

  if (!lead) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (profile) {
      const storedPhone = phoneClean.startsWith('55') ? phoneClean.slice(2) : phoneClean
      console.log('Webhook: creating lead for phone', storedPhone, 'pushName', pushName)
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          phone: storedPhone,
          name: pushName,
          user_id: profile.id,
          status: 'negociacao',
        })
        .select()
        .single()

      if (newLead) {
        console.log('Webhook: created lead', newLead.id)
        lead = { id: newLead.id, user_id: newLead.user_id, name: newLead.name }
      }
    }
  } else if (pushName && lead.name !== pushName) {
    await supabase.from('leads').update({ name: pushName }).eq('id', lead.id)
  }

  if (lead) {
    await insertMessageAndUpdateLead(supabase, lead, content, mediaType, mediaUrl, message)
  }
}

async function insertMessageAndUpdateLead(supabase: any, lead: any, content: string, mediaType: string | null, mediaUrl: string | null, message: any) {
  const messageData = mediaType ? { key: message.key, message: message.message } : null
  const { error: msgError } = await supabase.from('messages').insert({
    lead_id: lead.id,
    content,
    direction: 'incoming',
    status: 'RECEIVED',
    whatsapp_message_id: message.key?.id,
    media_url: mediaUrl,
    media_type: mediaType,
    message_data: messageData,
    timestamp: new Date(
      (message.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString(),
  })
  if (msgError) {
    console.error('Webhook: insert message error', msgError)
    return
  }

  const { data: currentLead } = await supabase
    .from('leads')
    .select('unread_count')
    .eq('id', lead.id)
    .single()

  const { error: updateError } = await supabase
    .from('leads')
    .update({
      last_message_text: content,
      last_message_at: new Date().toISOString(),
      unread_count: (currentLead?.unread_count ?? 0) + 1,
    })
    .eq('id', lead.id)

  if (updateError) {
    console.error('Webhook: update lead error', updateError)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const event = body.event || getEventFromUrl(request.url)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (event === 'MESSAGES_UPDATE' || body.event === 'messages.update') {
      const msgKey = body.key || body.data?.key
      const statusCode = body.update?.status || body.data?.update?.status

      if (msgKey?.id !== undefined && statusCode !== undefined) {
        const statusMap: Record<number, string> = { 0: 'ERROR', 1: 'PENDING', 2: 'SENT', 3: 'RECEIVED', 4: 'READ' }
        const newStatus = statusMap[statusCode]

        if (newStatus && msgKey.id) {
          await supabase
            .from('messages')
            .update({ status: newStatus, read_at: newStatus === 'READ' ? new Date().toISOString() : undefined })
            .eq('whatsapp_message_id', msgKey.id)
        }
      }
      return NextResponse.json({ ok: true })
    }

    if (event !== 'MESSAGES_UPSERT' && body.event !== 'messages.upsert') {
      return NextResponse.json({ ok: true })
    }

    const messages = body.data
    if (Array.isArray(messages)) {
      await Promise.all(messages.map((m: any) => processMessage(supabase, m)))
    } else if (messages?.key) {
      await processMessage(supabase, messages)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

