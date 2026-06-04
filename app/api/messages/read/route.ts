import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

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

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .is('read_at', null)

    await supabase
      .from('leads')
      .update({ unread_count: 0 })
      .eq('id', leadId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Read messages error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

