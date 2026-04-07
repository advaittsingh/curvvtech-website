/** Mirrors `mobile/src/business/questionnaireShared.ts` + app storage types. */

export type BusinessQuestionnaire = {
  businessType: string | null
  primaryOffer: string
  customerSources: string[]
  customersAskFirst: string
  conversationLength: string | null
  afterConversation: string | null
  leadTracking: string[]
  biggestChallenge: string | null
  followUpFrequency: string | null
  priorities: string[]
  dailyCustomerVolume: string | null
  successVision: string
}

export type BusinessProfile = {
  whatYouDo: string
  customerAsks: string
  customerSource: string
  description: string
  questionnaire?: BusinessQuestionnaire
}

export type QuestionnaireOption = { id: string; label: string }

export const PAGE1_TYPE: QuestionnaireOption[] = [
  { id: 'product', label: 'Product-based (selling items)' },
  { id: 'service', label: 'Service-based (consulting, repair, etc.)' },
  { id: 'agency', label: 'Agency / Freelance' },
  { id: 'dealer', label: 'Dealer / Reseller' },
  { id: 'other', label: 'Other' },
]

export const PAGE1_SOURCES: QuestionnaireOption[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'calls', label: 'Calls' },
  { id: 'website', label: 'Website' },
]

export const PAGE2_CONV_LENGTH: QuestionnaireOption[] = [
  { id: 'quick', label: 'Quick (few messages)' },
  { id: 'medium', label: 'Medium (back & forth)' },
  { id: 'long', label: 'Long discussions' },
]

export const PAGE2_AFTER: QuestionnaireOption[] = [
  { id: 'buy_quick', label: 'They buy quickly' },
  { id: 'followups', label: 'They need follow-ups' },
  { id: 'no_response', label: "Many don't respond again" },
  { id: 'varies', label: 'It varies' },
]

export const PAGE3_TRACK: QuestionnaireOption[] = [
  { id: 'memory', label: 'Memory' },
  { id: 'whatsapp_chats', label: 'WhatsApp chats' },
  { id: 'notes', label: 'Notes app' },
  { id: 'sheets', label: 'Excel / Sheets' },
  { id: 'crm', label: 'CRM tool' },
  { id: 'dont_track', label: "I don't track" },
]

export const PAGE3_CHALLENGE: QuestionnaireOption[] = [
  { id: 'forgetting', label: 'Forgetting follow-ups' },
  { id: 'losing_chats', label: 'Losing chats' },
  { id: 'too_many', label: 'Too many conversations' },
  { id: 'no_tracking', label: 'No clear tracking' },
  { id: 'low_conversion', label: 'Low conversions' },
]

export const PAGE3_FOLLOWUP: QuestionnaireOption[] = [
  { id: 'same_day', label: 'Same day' },
  { id: 'next_day', label: 'Next day' },
  { id: 'occasionally', label: 'Occasionally' },
  { id: 'rarely', label: 'Rarely' },
]

export const PAGE4_PRIORITIES: QuestionnaireOption[] = [
  { id: 'close_deals', label: 'Close more deals' },
  { id: 'faster', label: 'Respond faster' },
  { id: 'organized', label: 'Stay organized' },
  { id: 'save_time', label: 'Save time' },
  { id: 'never_miss', label: 'Never miss follow-ups' },
]

export const PAGE4_VOLUME: QuestionnaireOption[] = [
  { id: '1_5', label: '1–5' },
  { id: '5_10', label: '5–10' },
  { id: '10_20', label: '10–20' },
  { id: '20_plus', label: '20+' },
]

export function labelFrom(options: QuestionnaireOption[], id: string | null): string {
  if (!id) return ''
  return options.find((o) => o.id === id)?.label ?? id
}

export function labelsFrom(options: QuestionnaireOption[], ids: string[]): string {
  return ids.map((id) => options.find((o) => o.id === id)?.label ?? id).join(', ')
}

export function questionnaireToProfile(q: BusinessQuestionnaire): BusinessProfile {
  const typeLine = labelFrom(PAGE1_TYPE, q.businessType)
  const whatYouDo =
    typeLine && q.primaryOffer.trim()
      ? `${typeLine} — ${q.primaryOffer.trim()}`
      : q.primaryOffer.trim() || typeLine

  const lines: string[] = []
  if (q.successVision.trim()) lines.push(q.successVision.trim())
  const detail: string[] = []
  if (q.customerSources.length)
    detail.push(`Where customers come from: ${labelsFrom(PAGE1_SOURCES, q.customerSources)}`)
  if (q.conversationLength)
    detail.push(`Conversations: ${labelFrom(PAGE2_CONV_LENGTH, q.conversationLength)}`)
  if (q.afterConversation)
    detail.push(`After a chat: ${labelFrom(PAGE2_AFTER, q.afterConversation)}`)
  if (q.leadTracking.length)
    detail.push(`Tracking leads: ${labelsFrom(PAGE3_TRACK, q.leadTracking)}`)
  if (q.biggestChallenge)
    detail.push(`Biggest challenge: ${labelFrom(PAGE3_CHALLENGE, q.biggestChallenge)}`)
  if (q.followUpFrequency)
    detail.push(`Follow-up cadence: ${labelFrom(PAGE3_FOLLOWUP, q.followUpFrequency)}`)
  if (q.priorities.length)
    detail.push(`Priorities: ${labelsFrom(PAGE4_PRIORITIES, q.priorities)}`)
  if (q.dailyCustomerVolume)
    detail.push(`Customers per day: ${labelFrom(PAGE4_VOLUME, q.dailyCustomerVolume)}`)
  if (detail.length) lines.push('', detail.join('\n'))

  return {
    whatYouDo,
    customerAsks: q.customersAskFirst.trim(),
    customerSource: labelsFrom(PAGE1_SOURCES, q.customerSources),
    description: lines.join('\n').trim(),
    questionnaire: q,
  }
}

export function initialQuestionnaire(): BusinessQuestionnaire {
  return {
    businessType: null,
    primaryOffer: '',
    customerSources: [],
    customersAskFirst: '',
    conversationLength: null,
    afterConversation: null,
    leadTracking: [],
    biggestChallenge: null,
    followUpFrequency: null,
    priorities: [],
    dailyCustomerVolume: null,
    successVision: '',
  }
}

/** Merge server-stored questionnaire with defaults (same as mobile `questionnaireFromProfile`). */
export function questionnaireFromProfile(profile: BusinessProfile | null): BusinessQuestionnaire {
  if (profile?.questionnaire) {
    return { ...initialQuestionnaire(), ...profile.questionnaire }
  }
  return initialQuestionnaire()
}

/** Build state from GET `/v1/me/business` JSON. */
export function questionnaireFromServer(row: {
  questionnaire?: BusinessQuestionnaire | null
} | null): BusinessQuestionnaire {
  if (row?.questionnaire && typeof row.questionnaire === 'object') {
    return { ...initialQuestionnaire(), ...row.questionnaire }
  }
  return initialQuestionnaire()
}

/** PATCH body for `/v1/me/business` so denormalized columns stay in sync with the app (mobile uses the same). */
export function serverBusinessPatchFromQuestionnaire(q: BusinessQuestionnaire) {
  const bp = questionnaireToProfile(q)
  return {
    what_you_do: bp.whatYouDo,
    customer_asks: bp.customerAsks,
    customer_source: bp.customerSource,
    description: bp.description,
    questionnaire: q,
  }
}

export function pageValid(page: number, q: BusinessQuestionnaire): boolean {
  switch (page) {
    case 0:
      return (
        q.businessType != null &&
        q.primaryOffer.trim().length > 0 &&
        q.customerSources.length > 0
      )
    case 1:
      return (
        q.customersAskFirst.trim().length > 0 &&
        q.conversationLength != null &&
        q.afterConversation != null
      )
    case 2:
      return (
        q.leadTracking.length > 0 &&
        q.biggestChallenge != null &&
        q.followUpFrequency != null
      )
    case 3:
      return (
        q.priorities.length > 0 &&
        q.dailyCustomerVolume != null &&
        q.successVision.trim().length > 0
      )
    default:
      return false
  }
}

export const QUESTIONNAIRE_HEADINGS: [string, string, string, string] = [
  'Tell us about your business',
  'How do your customers reach you?',
  'How do you manage customers today?',
  'What do you want to improve?',
]
