import type { InboxConversation } from "./inboxApi";
import type { ContactIndex } from "./contactIdentityService";
import { lookupContact } from "./contactIdentityService";
import { isWhatsAppLead, type Lead } from "./api";
import { digitsOnly, samePhoneDigits } from "../utils/phoneNormalize";

export type EnrichedConversation = {
  conversation: InboxConversation;
  /** Primary line — contact name or WA profile name or phone */
  displayName: string;
  /** Secondary line — E.164 or wa id (only when different from title, e.g. shows under a real name) */
  subtitleLine: string | null;
  /** Secondary line — E.164 or wa id (always; for search) */
  phoneLine: string;
  /** Initials for avatar fallback */
  initials: string;
  /** Remote avatar: device contact photo or future API URL */
  avatarUri?: string;
  /** True if this thread matches a CRM lead */
  isLead: boolean;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function initialsForRow(displayName: string, phoneLine: string): string {
  if (samePhoneDigits(displayName, phoneLine)) {
    const d = digitsOnly(phoneLine);
    return d.length >= 2 ? d.slice(-2) : d || "?";
  }
  return initialsFromName(displayName);
}

function formatPhoneLine(c: InboxConversation): string {
  return (
    c.customer_phone_e164?.trim() ||
    (c.customer_wa_id.startsWith("+") ? c.customer_wa_id : `+${c.customer_wa_id}`)
  );
}

function defaultDisplayTitle(c: InboxConversation): string {
  return formatPhoneLine(c);
}

/**
 * Resolves display identity: device contact → optional backend profile fields → phone.
 * WhatsApp does not expose profile photos to third-party apps; use `customer_avatar_url`
 * when the backend caches it from webhooks.
 */
export function enrichConversation(
  c: InboxConversation,
  contacts: ContactIndex,
  leads: Lead[]
): EnrichedConversation {
  const phoneLine = formatPhoneLine(c);
  const contact = lookupContact(contacts, c.customer_phone_e164, c.customer_wa_id);

  const isLead = leads.some((lead) => {
    if (isWhatsAppLead(lead) && lead.conversation_id === c.id) return true;
    if (isWhatsAppLead(lead)) {
      const a = (lead.customer_phone_e164 || "").replace(/\D/g, "");
      const b = (c.customer_phone_e164 || "").replace(/\D/g, "");
      if (a && b && a === b) return true;
    }
    return false;
  });

  const waName = c.customer_profile_name?.trim() || null;

  const displayName =
    contact?.name ||
    waName ||
    defaultDisplayTitle(c);

  const avatarUri = contact?.imageUri || c.customer_avatar_url || undefined;

  const subtitleLine = samePhoneDigits(displayName, phoneLine) ? null : phoneLine;

  return {
    conversation: c,
    displayName,
    subtitleLine,
    phoneLine,
    initials: initialsForRow(displayName, phoneLine),
    avatarUri,
    isLead,
  };
}
