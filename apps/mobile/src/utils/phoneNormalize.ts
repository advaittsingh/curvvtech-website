/** Normalize to digits-only for loose matching across E.164 vs local formats. */
export function digitsOnly(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/** Last 10 digits (common for IN/US matching). */
export function phoneMatchKey(phone: string | null | undefined): string {
  const d = digitsOnly(phone);
  if (d.length <= 10) return d;
  return d.slice(-10);
}

function uniqStrings(keys: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * Keys to index / lookup so saved contacts match API phones across formats:
 * +91…, 91…, 0-prefixed national, last-10 national, full digit string.
 */
export function phoneMatchKeys(phone: string | null | undefined): string[] {
  let d = digitsOnly(phone);
  if (!d) return [];
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  const keys: string[] = [d];
  if (d.length >= 10) keys.push(d.slice(-10));
  if (d.length >= 11) keys.push(d.slice(-11));
  if (d.length >= 12 && d.startsWith("91")) {
    const national = d.slice(2);
    keys.push(national);
    if (national.length >= 10) keys.push(national.slice(-10));
  }
  if (d.length >= 11 && d.startsWith("1")) {
    const national = d.slice(1);
    keys.push(national);
    if (national.length >= 10) keys.push(national.slice(-10));
  }
  return uniqStrings(keys);
}

/** True when two strings refer to the same number (digits-only equality). */
export function samePhoneDigits(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const ta = da.length >= 10 ? da.slice(-10) : da;
  const tb = db.length >= 10 ? db.slice(-10) : db;
  return ta.length >= 7 && ta === tb;
}
