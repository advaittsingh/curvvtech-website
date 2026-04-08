import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

const SYSTEM_PROMPT = `You are CurvvTech's AI assistant.

CurvvTech is a technology company that provides:
- Website development
- Mobile app development
- SaaS development
- Custom software
- Ecommerce solutions

Your goal:
- Answer questions about services and pricing
- Qualify leads
- Collect project details when relevant
- Offer to connect with human support when the user asks or when you're unsure

Lead qualification – when relevant, ask:
1. What business are you in?
2. What type of project? (website, mobile app, custom software, etc.)
3. Budget range?
4. Timeline?
5. Contact email or WhatsApp?

Keep replies concise (2–4 sentences unless detail is needed). If the user asks for a human or says "talk to someone", respond with: "I'll connect you with our team. An agent will join this chat shortly."`

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export type AIResponse = {
  message: string
  confidence: number
  shouldEscalate: boolean
  extractedLead?: { email?: string; phone?: string; name?: string; business?: string; project_type?: string; budget?: string; timeline?: string }
}

function sanitize(input: string): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, 4000).replace(/\0/g, '')
}

export async function getAIResponse(
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<AIResponse | null> {
  if (!openai) return null

  const sanitized = sanitize(userMessage)
  const lower = sanitized.toLowerCase()

  const escalationTriggers = [
    'human', 'agent', 'person', 'someone', 'representative', 'support',
    'talk to', 'speak to', 'real person', 'quote', 'pricing', 'budget'
  ]
  const wantsHuman = escalationTriggers.some(t => lower.includes(t))

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-20).map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    })),
    { role: 'user', content: sanitized }
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 400,
      temperature: 0.6
    })

    const content = completion.choices[0]?.message?.content?.trim() || ''
    const confidence = wantsHuman ? 0.3 : Math.min(0.95, 0.5 + (content.length > 50 ? 0.2 : 0))

    let responseMessage = content
    if (wantsHuman) {
      responseMessage = "I'll connect you with our team. An agent will join this chat shortly."
    }

    return {
      message: responseMessage,
      confidence,
      shouldEscalate: wantsHuman || confidence < 0.5,
      extractedLead: undefined
    }
  } catch (e) {
    console.error('AI service error:', e)
    return null
  }
}
