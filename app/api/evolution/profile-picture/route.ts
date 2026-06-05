import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await anonSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leadId } = await req.json()
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Busca o lead e verifica ownership
    const { data: lead } = await supabase
      .from('leads')
      .select('id, phone, avatar_url, user_id')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Retorna da cache — 'none' significa já tentou e não tem foto
    if (lead.avatar_url === 'none') return NextResponse.json({ url: null })
    if (lead.avatar_url) return NextResponse.json({ url: lead.avatar_url })

    const evolutionUrl = process.env.EVOLUTION_API_URL
    const evolutionKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'markello'

    if (!evolutionUrl || !evolutionKey) return NextResponse.json({ url: null })

    const phone = lead.phone.replace(/\D/g, '')
    const withCode = phone.startsWith('55') ? phone : `55${phone}`

    // Gera variantes: com e sem o 9º dígito
    const numbers: string[] = [withCode]
    const noCode = withCode.startsWith('55') ? withCode.slice(2) : withCode
    if (noCode.length === 11 && noCode[2] === '9') {
      numbers.push(`55${noCode.slice(0, 2)}${noCode.slice(3)}`) // sem 9
    } else if (noCode.length === 10) {
      numbers.push(`55${noCode.slice(0, 2)}9${noCode.slice(2)}`) // com 9
    }

    let url: string | null = null
    for (const number of numbers) {
      const res = await fetch(`${evolutionUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
        body: JSON.stringify({ number }),
      })
      if (!res.ok) continue
      const data = await res.json()
      if (data.profilePictureUrl) { url = data.profilePictureUrl; break }
    }

    // Salva em cache (url real ou 'none' para não chamar de novo)
    await supabase.from('leads').update({ avatar_url: url ?? 'none' }).eq('id', leadId)

    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ url: null })
  }
}
