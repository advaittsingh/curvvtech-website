/** Interpret a wall-clock time as India Standard Time (no DST). */
export function istWallTimeToUtc(ymd: string, hm: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  if (![y, mo, d, h, mi].every((n) => Number.isFinite(n))) {
    throw new Error("Invalid IST datetime");
  }
  return new Date(Date.UTC(y, mo - 1, d, h - 5, mi - 30));
}

/**
 * Parse an interview start. ISO with offset/Z is used as-is.
 * Naive `YYYY-MM-DDTHH:mm` is treated as Asia/Kolkata.
 */
export function parseInterviewStart(input: string): Date {
  const trimmed = input.trim();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid interview start time");
    return d;
  }
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!m) throw new Error("starts_at must be YYYY-MM-DDTHH:mm (IST) or an ISO timestamp");
  return istWallTimeToUtc(m[1], m[2]);
}

export function clampInterviewDuration(minutes: unknown): number {
  const n = typeof minutes === "number" ? minutes : Number.parseInt(String(minutes ?? ""), 10);
  if (!Number.isFinite(n)) return 45;
  return Math.min(120, Math.max(15, Math.round(n)));
}

function icsUtc(dt: Date): string {
  return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function icsEscapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function formatInterviewIst(start: Date, durationMin: number): string {
  const end = new Date(start.getTime() + durationMin * 60_000);
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const startLabel = fmt.format(start);
  const endTime = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(end);
  return `${startLabel} – ${endTime} IST`;
}

export function buildInterviewIcs(opts: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  durationMin: number;
  attendeeName: string;
  attendeeEmail: string;
  organizerEmail: string;
  organizerName: string;
  meetUrl: string | null;
}): string {
  const end = new Date(opts.start.getTime() + opts.durationMin * 60_000);
  const loc = icsEscapeText(opts.meetUrl || "Online interview");
  const orgCn = icsEscapeText(opts.organizerName);
  const attendeeCn = icsEscapeText(opts.attendeeName);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Curvvtech//Careers Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(opts.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscapeText(opts.title)}`,
    `DESCRIPTION:${icsEscapeText(opts.description)}`,
    `LOCATION:${loc}`,
    `ORGANIZER;CN=${orgCn}:mailto:${opts.organizerEmail}`,
    `ATTENDEE;CN=${attendeeCn};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${opts.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
