/**
 * WhatsApp integration via Twilio.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886).
 */

import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (client) return client
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null
  client = twilio(sid, token)
  return client
}

const FROM = process.env.TWILIO_WHATSAPP_FROM || ''

export function isWhatsAppConfigured(): boolean {
  return Boolean(getClient() && FROM)
}

/**
 * Open WhatsApp with pre-filled message (for "Continue on WhatsApp" link).
 * Use wa.me link; no API call needed.
 */
export function getWhatsAppContinueUrl(phone: string, contextMessage: string): string {
  const text = encodeURIComponent(
    `Hello CurvvTech, I was chatting on your website about ${contextMessage}`
  )
  const num = phone.replace(/\D/g, '')
  const suffix = num.startsWith('91') ? num : `91${num}`
  return `https://wa.me/${suffix}?text=${text}`
}

/**
 * Send a message via WhatsApp Business API (Twilio).
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const c = getClient()
  if (!c || !FROM) return { success: false, error: 'WhatsApp not configured' }

  const toNum = to.replace(/\D/g, '')
  const toWhatsApp = toNum.startsWith('91') ? `whatsapp:+${toNum}` : `whatsapp:+91${toNum}`

  try {
    await c.messages.create({
      from: FROM,
      to: toWhatsApp,
      body: body.slice(0, 1600)
    })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Send failed' }
  }
}

/**
 * Send chat transcript to visitor's WhatsApp.
 */
export async function sendTranscriptToWhatsApp(
  to: string,
  transcript: string
): Promise<{ success: boolean; error?: string }> {
  const intro = 'Here is your chat transcript from CurvvTech:\n\n'
  return sendWhatsAppMessage(to, intro + transcript.slice(0, 1500))
}
