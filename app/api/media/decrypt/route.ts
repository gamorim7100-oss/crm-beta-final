import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function toBuffer(obj: any): Buffer {
  if (!obj) return Buffer.alloc(0)
  if (Buffer.isBuffer(obj)) return obj
  if (typeof obj === 'string') return Buffer.from(obj, 'base64')
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).map(Number).filter(k => !isNaN(k)).sort((a, b) => a - b)
    return Buffer.from(keys.map(k => obj[k]))
  }
  return Buffer.alloc(0)
}

function fixMessageContent(content: any): any {
  if (!content || typeof content !== 'object') return content
  const fixed: any = Array.isArray(content) ? [] : {}
  for (const [key, val] of Object.entries(content)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && !Buffer.isBuffer(val)) {
      const keys = Object.keys(val).map(Number).filter(k => !isNaN(k))
      if (keys.length > 0) {
        fixed[key] = toBuffer(val)
        continue
      }
    }
    fixed[key] = val
  }
  return fixed
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 })
    }

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    )

    const { data: msg } = await supabase
      .from('messages')
      .select('message_data, media_type')
      .eq('id', messageId)
      .single()

    if (!msg?.message_data || !msg.media_type) {
      return NextResponse.json({ error: 'No media data' }, { status: 404 })
    }

    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')

    const rawContent = msg.message_data.message?.[`${msg.media_type}Message`]
    if (!rawContent?.mediaKey && !rawContent?.url && !rawContent?.directPath) {
      return NextResponse.json({ error: 'Incomplete media data' }, { status: 400 })
    }

    const mediaContent = fixMessageContent(rawContent)

    const stream = await downloadContentFromMessage(mediaContent, msg.media_type, {
      startByte: 0,
      endByte: undefined,
    })

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const buffer = Buffer.concat(chunks)

    const mimeMap: Record<string, string> = {
      image: 'image/jpeg',
      audio: 'audio/ogg; codecs=opus',
      video: 'video/mp4',
      document: 'application/pdf',
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeMap[msg.media_type] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Media decrypt error:', error)
    return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
  }
}

