import { Resend } from "resend";
import nodemailer from "nodemailer";
import { config } from "../../../config.js";
import { logger } from "../../../logger.js";

export type EmailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  /** Inline image CID — reference in HTML as src="cid:your-id" */
  contentId?: string;
};

export type SmtpOverride = {
  host: string;
  port?: number;
  user: string;
  pass: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Overrides config.emailFrom. Must be on a Resend-verified domain when using Resend. */
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  /** Force SMTP for this send (e.g. org-specific SMTP from company settings). */
  smtp?: SmtpOverride;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  provider: "resend" | "smtp" | "none";
  error?: string;
};

let _resend: Resend | null = null;
function resend(): Resend | null {
  if (!config.resendApiKey) return null;
  if (!_resend) _resend = new Resend(config.resendApiKey);
  return _resend;
}

export function emailConfigured(): boolean {
  return Boolean(config.resendApiKey || (config.demoSmtpHost && config.demoSmtpUser && config.demoSmtpPass));
}

function toArray(v: string | string[] | undefined): string[] | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v : [v];
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  const client = resend();
  if (!client) return { ok: false, provider: "none", error: "Resend not configured" };
  const replyTo = input.replyTo ?? (config.emailReplyTo || undefined);
  // Guarantee at least one content field so the payload satisfies Resend's union type.
  const text = input.text ?? (input.html ? undefined : input.subject);
  const payload = {
    from: input.from ?? config.emailFrom,
    to: toArray(input.to)!,
    subject: input.subject,
    html: input.html,
    text,
    replyTo,
    cc: toArray(input.cc),
    bcc: toArray(input.bcc),
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: typeof a.content === "string" ? Buffer.from(a.content) : a.content,
      contentType: a.contentType,
      contentId: a.contentId,
    })),
  } as Parameters<typeof client.emails.send>[0];
  const { data, error } = await client.emails.send(payload);
  if (error) return { ok: false, provider: "resend", error: error.message };
  return { ok: true, provider: "resend", id: data?.id };
}

async function sendViaSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const smtp = input.smtp ?? (
    config.demoSmtpHost && config.demoSmtpUser && config.demoSmtpPass
      ? { host: config.demoSmtpHost, port: config.demoSmtpPort, user: config.demoSmtpUser, pass: config.demoSmtpPass }
      : null
  );
  if (!smtp) return { ok: false, provider: "none", error: "SMTP not configured" };

  const port = smtp.port ?? 587;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  const info = await transporter.sendMail({
    from: input.from ?? config.emailFrom,
    to: toArray(input.to),
    cc: toArray(input.cc),
    bcc: toArray(input.bcc),
    replyTo: input.replyTo ?? (config.emailReplyTo || undefined),
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
  return { ok: true, provider: "smtp", id: info.messageId };
}

/**
 * Single email primitive for the whole API.
 * Priority: explicit SMTP override → Resend → default SMTP fallback.
 * Never throws — returns a result. Use sendEmailOrThrow when a failure must surface.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  // An explicit per-org SMTP override always wins (white-label deliverability).
  if (input.smtp) {
    try {
      return await sendViaSmtp(input);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      logger.warn({ err: error }, "mailer_smtp_override_failed");
      // fall through to Resend if available
    }
  }

  if (config.resendApiKey) {
    try {
      const res = await sendViaResend(input);
      if (res.ok) return res;
      logger.warn({ err: res.error }, "mailer_resend_failed");
    } catch (e) {
      logger.warn({ err: e instanceof Error ? e.message : String(e) }, "mailer_resend_threw");
    }
  }

  // Default SMTP fallback (demo creds) when Resend unset or failed.
  try {
    const res = await sendViaSmtp(input);
    if (res.ok) return res;
    if (!config.resendApiKey && !input.smtp) {
      logger.warn({ to: input.to }, "mailer_no_provider_configured");
    }
    return res;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logger.warn({ err: error }, "mailer_smtp_failed");
    return { ok: false, provider: "smtp", error };
  }
}

export async function sendEmailOrThrow(input: SendEmailInput): Promise<SendEmailResult> {
  const res = await sendEmail(input);
  if (!res.ok) throw new Error(res.error ?? "Email send failed");
  return res;
}
