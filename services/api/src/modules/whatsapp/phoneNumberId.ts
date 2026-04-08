/**
 * Meta WhatsApp Cloud API `phone_number_id` is a numeric string.
 * Normalize for consistent DB lookup (webhook vs PATCH).
 */
export function normalizeWhatsAppPhoneNumberId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/\s+/g, "");
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return null;
  return s;
}
