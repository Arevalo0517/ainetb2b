/**
 * Internal helper to call the OpenAI proxy from channel endpoints.
 * Reuses all credit validation and deduction logic from /api/proxy/openai.
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ProxyCallOptions {
  model?: string
  max_tokens?: number
  messages: OpenAIMessage[]
}

interface ProxyResult {
  content: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export async function callProxy(projectId: string, options: ProxyCallOptions): Promise<ProxyResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const res = await fetch(`${base}/api/proxy/openai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-project-key': projectId,
    },
    body: JSON.stringify({
      model:      options.model ?? 'gpt-4o-mini',
      max_tokens: options.max_tokens,
      messages:   options.messages,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? 'Proxy error'), { status: res.status, data })
  }

  return {
    content: data.choices?.[0]?.message?.content ?? '',
    usage:   data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}
