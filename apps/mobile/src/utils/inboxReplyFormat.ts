/**
 * Client-side “quoted reply” encoding when the API has no native reply_id.
 * Format: ↪ one-line preview\n\nuser message
 */
const REPLY_REGEX = /^↪\s+(.+?)\r?\n\r?\n([\s\S]*)$/;

export function formatMessageWithReplyQuote(preview: string, userText: string): string {
  const one = preview.replace(/\s+/g, " ").trim().slice(0, 280);
  return `↪ ${one}\n\n${userText.trim()}`;
}

export function splitReplyFromBody(body: string): { quote: string | null; main: string } {
  const m = body.match(REPLY_REGEX);
  if (!m || !m[2]) return { quote: null, main: body };
  return { quote: m[1]!.trim(), main: m[2] };
}
