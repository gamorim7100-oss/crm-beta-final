export async function sendWhatsAppMessage(phone: string, text: string) {
  const response = await fetch(
    `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY!,
      },
      body: JSON.stringify({
        number: phone,
        text,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.statusText}`)
  }

  return response.json()
}

export async function sendWhatsAppMessageWithRetry(
  phone: string,
  text: string,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendWhatsAppMessage(phone, text)
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      )
    }
  }
}

