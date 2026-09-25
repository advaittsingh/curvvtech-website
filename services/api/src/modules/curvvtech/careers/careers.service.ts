import { randomUUID } from "node:crypto";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { logger } from "../../../logger.js";
import { config } from "../../../config.js";
import { emailConfigured, sendEmail } from "../../shared/communications/mailer.js";
import {
  createGoogleMeetEvent,
  isGoogleCalendarConnected,
} from "../integrations/googleCalendar.js";
import { buildInterviewInviteEmail, buildRejectionEmail } from "./careers.mail.js";
import {
  buildInterviewIcs,
  clampInterviewDuration,
  formatInterviewIst,
  parseInterviewStart,
} from "./careers.schedule.js";
import { getCareerRole, CAREER_ROLES } from "./careers.roles.js";
import { loadCareerResume, type ResumeStorage } from "./careers.storage.js";
import { CAREER_RESUME_MAX_BYTES, CAREER_RESUME_MIN_BYTES, type MultipartFile } from "./multipart.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9()\-\s]{8,24}$/;
const URL_RE = /^https?:\/\/\S+$/i;

export type CareerApplicationStatus = "new" | "shortlisted" | "rejected";

export type CareerApplicationRow = {
  id: string;
  role_slug: string;
  role_title: string;
  team: string | null;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  message: string | null;
  resume_storage: ResumeStorage;
  resume_key: string;
  resume_filename: string;
  resume_content_type: string;
  resume_size_bytes: number | null;
  status: CareerApplicationStatus;
  rejected_at: string | null;
  shortlisted_at: string | null;
  interview_at: string | null;
  interview_duration_min: number | null;
  interview_meet_url: string | null;
  google_event_id: string | null;
  interview_note: string | null;
  interview_email_sent_at: string | null;
  rejection_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerRoleSummary = {
  slug: string;
  title: string;
  team: string;
  new_count: number;
  shortlisted_count: number;
  rejected_count: number;
  total_count: number;
  latest_at: string | null;
};

function sniffResume(buffer: Buffer): { mime: string; ext: string } | null {
  let start = 0;
  while (start < 4 && start < buffer.length && (buffer[start] === 0x0d || buffer[start] === 0x0a)) {
    start += 1;
  }
  const head = buffer.subarray(start);
  if (head.length >= 4 && head.subarray(0, 4).toString("ascii") === "%PDF") {
    return { mime: "application/pdf", ext: "pdf" };
  }
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    head.length >= 8 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    head.length >= 12 &&
    head.subarray(0, 4).toString("ascii") === "RIFF" &&
    head.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function clean(value: string | undefined, max: number): string {
  return (value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

export function validateApplyInput(input: {
  fields: Record<string, string>;
  files: MultipartFile[];
}): { ok: true; data: {
  roleSlug: string;
  roleTitle: string;
  team: string;
  name: string;
  email: string;
  phone: string;
  linkedin: string | null;
  message: string | null;
  resume: MultipartFile;
  resumeMime: string;
  resumeExt: string;
} } | { ok: false; message: string } {
  const roleSlug = clean(input.fields.role_slug, 80);
  const catalog = getCareerRole(roleSlug);
  if (!catalog) return { ok: false, message: "Unknown role. Apply from a listed careers opening." };

  const name = clean(input.fields.name, 120);
  if (name.length < 2) return { ok: false, message: "Please enter your full name." };

  const email = clean(input.fields.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Please enter a valid email address." };

  const phone = clean(input.fields.phone, 24);
  if (!PHONE_RE.test(phone)) return { ok: false, message: "Please enter a valid phone number." };

  const linkedinRaw = clean(input.fields.linkedin, 400);
  let linkedin: string | null = linkedinRaw || null;
  if (linkedin && !URL_RE.test(linkedin)) {
    if (/^[\w.-]+\.[a-z]{2,}/i.test(linkedin)) linkedin = `https://${linkedin}`;
    else return { ok: false, message: "LinkedIn / portfolio must be a valid URL." };
  }

  const messageRaw = clean(input.fields.message, 4000);
  const message = messageRaw || null;

  const resume = input.files.find((f) => f.fieldName === "resume") ?? input.files[0];
  if (!resume?.buffer.length) return { ok: false, message: "Please upload your CV as a PDF or image." };
  if (resume.buffer.length > CAREER_RESUME_MAX_BYTES) {
    return { ok: false, message: "CV must be 8 MB or smaller." };
  }
  if (resume.buffer.length < CAREER_RESUME_MIN_BYTES) {
    return { ok: false, message: "That CV file looks empty. Please upload the original PDF or image." };
  }

  const sniffed = sniffResume(resume.buffer);
  if (!sniffed) {
    return { ok: false, message: "CV must be a PDF, JPG, PNG, or WEBP file." };
  }

  return {
    ok: true,
    data: {
      roleSlug: catalog.slug,
      roleTitle: catalog.title,
      team: catalog.team,
      name,
      email,
      phone,
      linkedin,
      message,
      resume,
      resumeMime: sniffed.mime,
      resumeExt: sniffed.ext,
    },
  };
}

export async function createCareerApplication(input: {
  fields: Record<string, string>;
  files: MultipartFile[];
}): Promise<{ ok: true; id: string } | { ok: false; message: string; status?: number }> {
  const v = validateApplyInput(input);
  if (!v.ok) return { ok: false, message: v.message, status: 400 };

  const id = randomUUID();
  const originalName = v.data.resume.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const filename = originalName.toLowerCase().endsWith(`.${v.data.resumeExt}`)
    ? originalName
    : `${originalName || "resume"}.${v.data.resumeExt}`;

  const rows = await sql`
    INSERT INTO career_applications (
      id, role_slug, role_title, team, name, email, phone, linkedin, message,
      resume_storage, resume_key, resume_filename, resume_content_type, resume_size_bytes,
      resume_bytes, status
    ) VALUES (
      ${id}::uuid, ${v.data.roleSlug}, ${v.data.roleTitle}, ${v.data.team},
      ${v.data.name}, ${v.data.email}, ${v.data.phone}, ${v.data.linkedin}, ${v.data.message},
      'db', ${id}, ${filename}, ${v.data.resumeMime},
      ${v.data.resume.buffer.length}, ${v.data.resume.buffer}, 'new'
    )
    RETURNING id::text AS id
  `;
  const saved = firstRow<{ id: string }>(rows);
  if (!saved?.id) return { ok: false, message: "Could not save application.", status: 500 };

  void notifyNewApplication({
    id: saved.id,
    name: v.data.name,
    email: v.data.email,
    phone: v.data.phone,
    roleTitle: v.data.roleTitle,
  }).catch((err) => logger.warn({ err }, "career_application_notify_failed"));

  return { ok: true, id: saved.id };
}

async function notifyNewApplication(opts: {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleTitle: string;
}): Promise<void> {
  const to = process.env.CAREERS_NOTIFY_EMAIL?.trim() || "info@curvvtech.com";
  await sendEmail({
    to,
    subject: `New careers application — ${opts.roleTitle}`,
    text: [
      `${opts.name} applied for ${opts.roleTitle}.`,
      `Email: ${opts.email}`,
      `Phone: ${opts.phone}`,
      `Application ID: ${opts.id}`,
      `Review it in Curvvtech OS → People → Careers.`,
    ].join("\n"),
  });
}

export async function listCareerRoleSummaries(): Promise<CareerRoleSummary[]> {
  const counts = (await sql`
    SELECT
      role_slug,
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE status = 'new')::int AS new_count,
      COUNT(*) FILTER (WHERE status = 'shortlisted')::int AS shortlisted_count,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_count,
      MAX(created_at) AS latest_at
    FROM career_applications
    GROUP BY role_slug
  `) as Array<{
    role_slug: string;
    total_count: number;
    new_count: number;
    shortlisted_count: number;
    rejected_count: number;
    latest_at: string | null;
  }>;

  const bySlug = new Map(counts.map((row) => [row.role_slug, row]));
  const extra = counts.filter((row) => !CAREER_ROLES.some((r) => r.slug === row.role_slug));

  return [
    ...CAREER_ROLES.map((role) => {
      const row = bySlug.get(role.slug);
      return {
        slug: role.slug,
        title: role.title,
        team: role.team,
        new_count: row?.new_count ?? 0,
        shortlisted_count: row?.shortlisted_count ?? 0,
        rejected_count: row?.rejected_count ?? 0,
        total_count: row?.total_count ?? 0,
        latest_at: row?.latest_at ?? null,
      };
    }),
    ...extra.map((row) => ({
      slug: row.role_slug,
      title: row.role_slug,
      team: "",
      new_count: row.new_count,
      shortlisted_count: row.shortlisted_count,
      rejected_count: row.rejected_count,
      total_count: row.total_count,
      latest_at: row.latest_at,
    })),
  ];
}

export async function listCareerApplications(opts: {
  roleSlug?: string;
  status?: CareerApplicationStatus | "all";
}): Promise<CareerApplicationRow[]> {
  const status = opts.status && opts.status !== "all" ? opts.status : null;
  const roleSlug = opts.roleSlug?.trim() || null;
  const rows = await sql`
    SELECT
      id::text AS id, role_slug, role_title, team, name, email, phone, linkedin, message,
      resume_storage, resume_key, resume_filename, resume_content_type, resume_size_bytes,
      status, rejected_at::text AS rejected_at,
      shortlisted_at::text AS shortlisted_at, interview_at::text AS interview_at,
      interview_duration_min, interview_meet_url, google_event_id, interview_note,
      interview_email_sent_at::text AS interview_email_sent_at,
      rejection_email_sent_at::text AS rejection_email_sent_at,
      created_at::text AS created_at, updated_at::text AS updated_at
    FROM career_applications
    WHERE (${roleSlug}::text IS NULL OR role_slug = ${roleSlug})
      AND (${status}::text IS NULL OR status = ${status})
    ORDER BY created_at DESC
  `;
  return rows as CareerApplicationRow[];
}

export async function getCareerApplication(id: string): Promise<CareerApplicationRow | null> {
  return firstRow<CareerApplicationRow>(
    await sql`
      SELECT
        id::text AS id, role_slug, role_title, team, name, email, phone, linkedin, message,
        resume_storage, resume_key, resume_filename, resume_content_type, resume_size_bytes,
        status, rejected_at::text AS rejected_at,
        shortlisted_at::text AS shortlisted_at, interview_at::text AS interview_at,
        interview_duration_min, interview_meet_url, google_event_id, interview_note,
        interview_email_sent_at::text AS interview_email_sent_at,
        rejection_email_sent_at::text AS rejection_email_sent_at,
        created_at::text AS created_at, updated_at::text AS updated_at
      FROM career_applications
      WHERE id = ${id}::uuid
      LIMIT 1
    `,
  );
}

export async function setCareerApplicationStatus(
  id: string,
  status: CareerApplicationStatus,
): Promise<CareerApplicationRow | null> {
  const rejectedAt = status === "rejected" ? new Date().toISOString() : null;
  return firstRow<CareerApplicationRow>(
    await sql`
      UPDATE career_applications
      SET
        status = ${status},
        rejected_at = ${rejectedAt}::timestamptz,
        updated_at = now()
      WHERE id = ${id}::uuid
      RETURNING
        id::text AS id, role_slug, role_title, team, name, email, phone, linkedin, message,
        resume_storage, resume_key, resume_filename, resume_content_type, resume_size_bytes,
        status, rejected_at::text AS rejected_at,
        shortlisted_at::text AS shortlisted_at, interview_at::text AS interview_at,
        interview_duration_min, interview_meet_url, google_event_id, interview_note,
        interview_email_sent_at::text AS interview_email_sent_at,
        rejection_email_sent_at::text AS rejection_email_sent_at,
        created_at::text AS created_at, updated_at::text AS updated_at
    `,
  );
}

function organizerEmail(): string {
  return (
    config.emailReplyTo?.replace(/^.*<([^>]+)>.*$/, "$1").trim() ||
    config.demoCalendarFromEmail ||
    "advaitsingh@curvvtech.in"
  );
}

export async function careersInterviewSetup(userId: string): Promise<{
  email_configured: boolean;
  calendar_connected: boolean;
  from_address: string;
  reply_to: string;
}> {
  return {
    email_configured: emailConfigured(),
    calendar_connected: await isGoogleCalendarConnected(userId),
    from_address: config.emailFrom,
    reply_to: config.emailReplyTo || organizerEmail(),
  };
}

export async function shortlistCareerApplication(
  id: string,
  actorUserId: string,
  opts: { startsAt: string; durationMin?: unknown; note?: string | null },
): Promise<
  | { ok: true; application: CareerApplicationRow; meet_created: boolean; calendar_error: string | null }
  | { ok: false; status: number; message: string }
> {
  const row = await getCareerApplication(id);
  if (!row) return { ok: false, status: 404, message: "Application not found" };
  if (!emailConfigured()) {
    return {
      ok: false,
      status: 503,
      message: "Email is not configured. Set RESEND_API_KEY (or DEMO_SMTP_*) on the API.",
    };
  }

  let start: Date;
  try {
    start = parseInterviewStart(opts.startsAt);
  } catch (e) {
    return { ok: false, status: 400, message: (e as Error).message };
  }
  if (start.getTime() < Date.now() - 60_000) {
    return { ok: false, status: 400, message: "Interview time must be in the future" };
  }

  const durationMin = clampInterviewDuration(opts.durationMin);
  const note = (opts.note ?? "").trim().slice(0, 2000) || null;
  const whenLabel = formatInterviewIst(start, durationMin);
  const title = `Interview — ${row.role_title} · ${row.name}`;
  const description = [
    `Interview for ${row.role_title} at Curvvtech.`,
    `Candidate: ${row.name} <${row.email}>`,
    row.phone ? `Phone: ${row.phone}` : "",
    note ? `Note: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let meetUrl: string | null = null;
  let googleEventId: string | null = null;
  let calendarError: string | null = null;
  const meet = await createGoogleMeetEvent({
    userId: actorUserId,
    title,
    description,
    start,
    durationMin,
    attendeeEmail: row.email,
    attendeeName: row.name,
  });
  if (meet.ok) {
    meetUrl = meet.meetUrl;
    googleEventId = meet.eventId;
  } else {
    calendarError = meet.error;
  }

  const mail = buildInterviewInviteEmail({
    candidateName: row.name,
    roleTitle: row.role_title,
    whenLabel,
    meetUrl,
    note,
  });
  const ics = buildInterviewIcs({
    uid: `${row.id}@careers.curvvtech.in`,
    title,
    description: [description, meetUrl ? `Meet: ${meetUrl}` : ""].filter(Boolean).join("\n"),
    start,
    durationMin,
    attendeeName: row.name,
    attendeeEmail: row.email,
    organizerEmail: organizerEmail(),
    organizerName: config.demoCalendarOrganizerName || "Curvvtech",
    meetUrl,
  });

  const sent = await sendEmail({
    to: row.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    replyTo: config.emailReplyTo || organizerEmail(),
    attachments: [
      {
        filename: "curvvtech-interview.ics",
        content: ics,
        contentType: "text/calendar; method=REQUEST; charset=UTF-8",
      },
    ],
  });
  if (!sent.ok) {
    return { ok: false, status: 502, message: sent.error || "Could not send the interview email" };
  }

  const now = new Date().toISOString();
  const updated = firstRow<CareerApplicationRow>(
    await sql`
      UPDATE career_applications
      SET
        status = 'shortlisted',
        rejected_at = NULL,
        shortlisted_at = ${now}::timestamptz,
        interview_at = ${start.toISOString()}::timestamptz,
        interview_duration_min = ${durationMin},
        interview_meet_url = ${meetUrl},
        google_event_id = ${googleEventId},
        interview_note = ${note},
        interview_email_sent_at = ${now}::timestamptz,
        updated_at = now()
      WHERE id = ${id}::uuid
      RETURNING
        id::text AS id, role_slug, role_title, team, name, email, phone, linkedin, message,
        resume_storage, resume_key, resume_filename, resume_content_type, resume_size_bytes,
        status, rejected_at::text AS rejected_at,
        shortlisted_at::text AS shortlisted_at, interview_at::text AS interview_at,
        interview_duration_min, interview_meet_url, google_event_id, interview_note,
        interview_email_sent_at::text AS interview_email_sent_at,
        rejection_email_sent_at::text AS rejection_email_sent_at,
        created_at::text AS created_at, updated_at::text AS updated_at
    `,
  );
  if (!updated) return { ok: false, status: 404, message: "Application not found" };
  return { ok: true, application: updated, meet_created: meet.ok, calendar_error: calendarError };
}

export async function rejectCareerApplication(
  id: string,
  opts: { sendEmail: boolean; note?: string | null },
): Promise<
  | { ok: true; application: CareerApplicationRow; email_sent: boolean }
  | { ok: false; status: number; message: string }
> {
  const row = await getCareerApplication(id);
  if (!row) return { ok: false, status: 404, message: "Application not found" };
  const note = (opts.note ?? "").trim().slice(0, 2000) || null;

  if (opts.sendEmail) {
    if (!emailConfigured()) {
      return {
        ok: false,
        status: 503,
        message: "Email is not configured. Set RESEND_API_KEY (or DEMO_SMTP_*) on the API.",
      };
    }
    const mail = buildRejectionEmail({
      candidateName: row.name,
      roleTitle: row.role_title,
      note,
    });
    const sent = await sendEmail({
      to: row.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: config.emailReplyTo || organizerEmail(),
    });
    if (!sent.ok) {
      return { ok: false, status: 502, message: sent.error || "Could not send the rejection email" };
    }
  }

  const now = new Date().toISOString();
  const updated = await setCareerApplicationStatus(id, "rejected");
  if (!updated) return { ok: false, status: 404, message: "Application not found" };

  if (opts.sendEmail) {
    await sql`
      UPDATE career_applications
      SET rejection_email_sent_at = ${now}::timestamptz, interview_note = COALESCE(${note}, interview_note)
      WHERE id = ${id}::uuid
    `;
    const reloaded = await getCareerApplication(id);
    return { ok: true, application: reloaded ?? updated, email_sent: true };
  }

  return { ok: true, application: updated, email_sent: false };
}

export function toPublicApplication(row: CareerApplicationRow) {
  return {
    id: row.id,
    role_slug: row.role_slug,
    role_title: row.role_title,
    team: row.team,
    name: row.name,
    email: row.email,
    phone: row.phone,
    linkedin: row.linkedin,
    message: row.message,
    resume_filename: row.resume_filename,
    resume_content_type: row.resume_content_type,
    resume_size_bytes: row.resume_size_bytes,
    status: row.status,
    rejected_at: row.rejected_at,
    shortlisted_at: row.shortlisted_at,
    interview_at: row.interview_at,
    interview_duration_min: row.interview_duration_min,
    interview_meet_url: row.interview_meet_url,
    interview_note: row.interview_note,
    interview_email_sent_at: row.interview_email_sent_at,
    rejection_email_sent_at: row.rejection_email_sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asResumeBuffer(value: unknown): Buffer | null {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value.length ? value : null;
  if (value instanceof Uint8Array) return value.length ? Buffer.from(value) : null;
  return null;
}

export async function loadApplicationResume(id: string) {
  const row = await getCareerApplication(id);
  if (!row) return null;
  const packed = firstRow<{ resume_bytes: unknown }>(
    await sql`SELECT resume_bytes FROM career_applications WHERE id = ${id}::uuid LIMIT 1`,
  );
  const fromDb = asResumeBuffer(packed?.resume_bytes);
  if (fromDb) {
    return {
      row,
      file: {
        body: fromDb,
        contentType: row.resume_content_type,
        filename: row.resume_filename,
      },
    };
  }
  if (row.resume_storage === "db") return { row, file: null };
  const file = await loadCareerResume({ storage: row.resume_storage, key: row.resume_key });
  if (!file) return { row, file: null };
  return {
    row,
    file: {
      body: file.body,
      contentType: file.contentType || row.resume_content_type,
      filename: row.resume_filename,
    },
  };
}
