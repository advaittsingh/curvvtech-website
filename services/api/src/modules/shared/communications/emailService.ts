import { sql, firstRow } from "../../../lib/sqlPool.js";
import { config } from "../../../config.js";
import { logger } from "../../../logger.js";
import { sendEmail, type EmailAttachment, type SmtpOverride } from "./mailer.js";

type OrgSmtp = {
  host?: string;
  port?: number;
  user?: string;
  pass_encrypted?: string;
};

type OrgRow = {
  name: string | null;
  domain_json: { email_from?: string; smtp?: OrgSmtp } | null;
  branding_json: { company_name?: string } | null;
};

type CompanySmtpRow = {
  email_from: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
};

/**
 * Send an email on behalf of an organization.
 * From/branding + optional white-label SMTP come from organizations.domain_json,
 * falling back to company_settings. If no org SMTP is set, the central mailer
 * uses Resend (default provider). Never throws — logs and returns false.
 */
export async function sendClientEmail(opts: {
  organizationId: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<boolean> {
  try {
    const org = firstRow<OrgRow>(
      await sql`SELECT name, domain_json, branding_json FROM organizations WHERE id = ${opts.organizationId} LIMIT 1`,
    );

    let from = org?.domain_json?.email_from;
    let smtp: SmtpOverride | undefined;

    const orgSmtp = org?.domain_json?.smtp;
    if (orgSmtp?.host && orgSmtp.user && orgSmtp.pass_encrypted) {
      smtp = { host: orgSmtp.host, port: orgSmtp.port, user: orgSmtp.user, pass: orgSmtp.pass_encrypted };
    }

    if (!from || !smtp) {
      const cs = firstRow<CompanySmtpRow>(
        await sql`
          SELECT email_from, smtp_host, smtp_port, smtp_user, smtp_pass
          FROM company_settings
          WHERE organization_id = ${opts.organizationId}
          LIMIT 1
        `,
      );
      from = from ?? cs?.email_from ?? undefined;
      if (!smtp && cs?.smtp_host && cs.smtp_user && cs.smtp_pass) {
        smtp = { host: cs.smtp_host, port: cs.smtp_port ?? undefined, user: cs.smtp_user, pass: cs.smtp_pass };
      }
    }

    // Build a nice From with the org/brand name when only a bare address is set.
    const brandName = org?.branding_json?.company_name || org?.name || "";
    let fromHeader = from ?? config.emailFrom;
    if (from && !from.includes("<") && brandName) {
      fromHeader = `${brandName} <${from}>`;
    }

    const res = await sendEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      from: fromHeader,
      attachments: opts.attachments,
      smtp,
    });

    if (!res.ok) {
      logger.warn({ organizationId: opts.organizationId, err: res.error }, "client_email_failed");
    }
    return res.ok;
  } catch (e) {
    logger.warn({ err: e }, "send_client_email_failed");
    return false;
  }
}
