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
      .select('name, phone')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('content, direction, timestamp')
      .eq('lead_id', leadId)
      .order('timestamp', { ascending: true })
      .limit(30)

    if (!messages || messages.length === 0) {
      return NextResponse.json({ suggestion: 'Nenhuma conversa para analisar ainda.' })
    }

    const conversation = messages
      .map((m) => `${m.direction === 'incoming' ? 'Lead' : 'Você'} (${new Date(m.timestamp).toLocaleString('pt-BR')}): ${m.content}`)
      .join('\n')

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const systemPrompt = `Você é Alex, um assistente de IA especialista em vendas de consórcios. Você ajuda consultores de CRM a responder leads de forma eficiente.

Contexto:
- O consultor trabalha com consórcios (imóveis, automóveis, serviços)
- O lead está em processo de negociação
- O objetivo é converter o lead em cliente

Regras:
- Responda APENAS com a mensagem sugerida, sem explicações, meta-comentários, prefixos, aspas ou caracteres extras
- Sugira respostas curtas e diretas (máximo 3 frases)
- NÃO inclua horários, datas, "Lead:", "Você:" ou qualquer outro prefixo
- Apenas o texto da mensagem que o consultor deve enviar
- Seja persuasivo mas não agressivo
- Adapte o tom ao contexto da conversa
- Em português brasileiro`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise esta conversa e sugira uma resposta para o lead ${lead.name || 'cliente'}:\n\n${conversation}\n\n---\nQual a PRÓXIMA mensagem que o consultor deve enviar? Responda apenas com o texto da mensagem:` },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ error: 'AI API error' }, { status: 502 })
    }

    const data = await response.json()
    let suggestion = data.choices?.[0]?.message?.content?.trim() || ''

    suggestion = suggestion
      .replace(/^["']|["']$/g, '')
      .replace(/^(Lead|Você|Consultor|Alex):\s*/gi, '')
      .replace(/^\d{1,2}:\d{2}\s*-\s*/, '')
      .trim()

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('AI suggest error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

