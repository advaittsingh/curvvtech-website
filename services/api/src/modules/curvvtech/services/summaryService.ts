import OpenAI from 'openai'

export type MessageForSummary = { sender: string; message: string }

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export type SummaryResult = {
  gist: string
  lead_type?: string
  business?: string
  budget?: string
  timeline?: string
  interest_level?: string
  extracted_contact?: { email?: string; phone?: string; name?: string }
}

export async function generateConversationSummary(
  messages: MessageForSummary[]
): Promise<SummaryResult | null> {
  if (!openai || messages.length === 0) return null

  const transcript = messages
    .map(m => `${m.sender}: ${m.message}`)
    .join('\n')
    .slice(0, 6000)

  const prompt = `Summarize this customer support chat in the following JSON format. Use null for missing fields.
{
  "gist": "1-2 sentence summary of the conversation",
  "lead_type": "e.g. Website Development, Mobile App, Custom Software, or null",
  "business": "business type/industry if mentioned",
  "budget": "budget range if mentioned (e.g. ₹1.5L)",
  "timeline": "timeline if mentioned (e.g. 1 month)",
  "interest_level": "High | Medium | Low",
  "extracted_contact": { "email": null, "phone": null, "name": null }
}

Chat transcript:
${transcript}`

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3
    })

    const raw = completion.choices[0]?.message?.content?.trim()
    if (!raw) return null

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    return {
      gist: parsed.gist || 'No summary',
      lead_type: parsed.lead_type,
      business: parsed.business,
      budget: parsed.budget,
      timeline: parsed.timeline,
      interest_level: parsed.interest_level,
      extracted_contact: parsed.extracted_contact
    }
  } catch (e) {
    console.error('Summary service error:', e)
    return null
  }
}
