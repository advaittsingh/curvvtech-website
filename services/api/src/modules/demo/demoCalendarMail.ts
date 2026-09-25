import { config } from "../../config.js";
import { logger } from "../../logger.js";
import { emailConfigured, sendEmail } from "../shared/communications/mailer.js";

export type DemoCalendarBooking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  date: string;
  time: string;
};

export class DemoMailConfigurationError extends Error {
  override name = "DemoMailConfigurationError";
  constructor(message: string) {
    super(message);
  }
}

export function isDemoMailConfigured(): boolean {
  // Resend (preferred) or SMTP both satisfy the requirement to send the invite.
  return emailConfigured();
}

/** Interpret slot date+time as India Standard Time (no DST). */
function istWallTimeToUtc(ymd: string, hm: string): { start: Date; end: Date } {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, h - 5, mi - 30);
  const start = new Date(utcMs);
  const end = new Date(utcMs + 30 * 60 * 1000);
  return { start, end };
}

function icsUtc(dt: Date): string {
  return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function icsEscapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcs(booking: DemoCalendarBooking): string {
  const { start, end } = istWallTimeToUtc(booking.date, booking.time);
  const uid = `${booking.id}@curvvtech.in`;
  const dtStamp = icsUtc(new Date());
  const org = config.demoCalendarFromEmail;
  const orgCn = icsEscapeText(config.demoCalendarOrganizerName);
  const title = icsEscapeText(config.demoMeetingTitle);
  const loc = icsEscapeText(config.demoMeetingLocation);
  const attendeeCn = icsEscapeText(booking.name || "Guest");
  const descLines = [
    "30-minute FollowUp product demo with Curvvtech.",
    "",
    `Guest: ${booking.name}`,
    booking.company ? `Company: ${booking.company}` : "",
    booking.phone ? `Phone: ${booking.phone}` : "",
    `Email: ${booking.email}`,
    "",
    `Slot (IST): ${booking.date} ${booking.time}`,
  ]
    .filter(Boolean)
    .join("\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Curvvtech//Demo Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${icsEscapeText(descLines)}`,
    `LOCATION:${loc}`,
    `ORGANIZER;CN=${orgCn}:mailto:${org}`,
    `ATTENDEE;CN=${attendeeCn};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${booking.email}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export async function sendDemoConfirmationInvite(booking: DemoCalendarBooking): Promise<void> {
  if (!isDemoMailConfigured()) {
    throw new DemoMailConfigurationError(
      "Email is not configured. Set RESEND_API_KEY (preferred) or DEMO_SMTP_* on the API (see .env.example).",
    );
  }

  const ics = buildIcs(booking);
  const from = `${config.demoCalendarOrganizerName} <${config.demoCalendarFromEmail}>`;
  const subject = `Demo confirmed — ${booking.date} ${booking.time} IST · FollowUp / Curvvtech`;

  const text = [
    `Hi ${booking.name},`,
    "",
    "Your FollowUp demo is confirmed.",
    "",
    `When: ${booking.date} at ${booking.time} IST (30 minutes)`,
    `Where: ${config.demoMeetingLocation}`,
    "",
    "A calendar invite is attached — open it to add the meeting to your calendar.",
    "",
    `— ${config.demoCalendarOrganizerName}`,
    config.demoCalendarFromEmail,
  ].join("\n");

  const res = await sendEmail({
    from,
    to: booking.email,
    replyTo: config.demoCalendarFromEmail,
    subject,
    text,
    attachments: [
      {
        filename: "curvvtech-followup-demo.ics",
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
      },
    ],
  });

  if (!res.ok) {
    logger.error({ err: res.error, demoRequestId: booking.id }, "demo_confirmation_invite_failed");
    throw new Error(`Failed to send calendar invite: ${res.error ?? "unknown error"}`);
  }
  logger.info({ demoRequestId: booking.id, to: booking.email, provider: res.provider }, "demo_confirmation_invite_sent");
}

/** Production requires an email provider; dev skips silently when unset. */
export async function maybeSendDemoConfirmationInvite(booking: DemoCalendarBooking): Promise<void> {
  if (!isDemoMailConfigured()) {
    if (config.nodeEnv === "production") {
      throw new DemoMailConfigurationError(
        "Email is not configured. Set RESEND_API_KEY (preferred) or DEMO_SMTP_* on the API.",
      );
    }
    logger.warn({ demoRequestId: booking.id }, "demo_invite_skipped_email_unconfigured");
    return;
  }
  await sendDemoConfirmationInvite(booking);
}
