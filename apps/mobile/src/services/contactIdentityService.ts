import * as Contacts from "expo-contacts";
import { phoneMatchKeys } from "../utils/phoneNormalize";

export type ContactIndex = Map<string, { name: string; imageUri?: string }>;

let cached: ContactIndex | null = null;
let loadPromise: Promise<ContactIndex> | null = null;

/**
 * Loads device contacts (permission prompt on first use) and builds a map
 * keyed by multiple normalized digit forms per number → display name + optional image.
 */
export async function loadContactIndex(): Promise<ContactIndex> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    const map: ContactIndex = new Map();
    if (status !== "granted") {
      cached = map;
      return map;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
    });

    for (const c of data) {
      const name =
        [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
        c.name ||
        "";
      if (!name) continue;
      const phones = c.phoneNumbers ?? [];
      for (const p of phones) {
        const raw = p.number ?? "";
        const keys = phoneMatchKeys(raw);
        const entry = {
          name,
          imageUri: c.imageAvailable && c.image?.uri ? c.image.uri : undefined,
        };
        for (const key of keys) {
          if (!map.has(key)) {
            map.set(key, entry);
          }
        }
      }
    }

    cached = map;
    return map;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

/** Drops cache and reloads contacts (e.g. after returning from OS settings). */
export async function refreshContactIndex(): Promise<ContactIndex> {
  cached = null;
  return loadContactIndex();
}

/** Clears cache (e.g. after sign-out) — optional. */
export function clearContactCache(): void {
  cached = null;
}

export function lookupContact(
  index: ContactIndex,
  phoneE164: string | null | undefined,
  waId: string
): { name: string; imageUri?: string } | null {
  const tryKeys = new Set<string>();
  for (const k of phoneMatchKeys(phoneE164)) tryKeys.add(k);
  for (const k of phoneMatchKeys(waId)) tryKeys.add(k);
  for (const key of tryKeys) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return null;
}
