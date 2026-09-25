import { sql, firstRow } from "../../../lib/sqlPool.js";
import { badRequest, notFound } from "../../../lib/errors.js";
import { config } from "../../../config.js";
import { sendClientEmail } from "../../shared/communications/emailService.js";
import { emitClientActivity } from "../../shared/activity/emitActivityEvent.js";

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  total_cents: number | null;
  amount_cents: number | null;
  status: string;
  due_at: string | null;
  client_id: string;
  project_id: string | null;
};

type ClientRow = {
  id: string;
  organization_id: string | null;
  email: string | null;
  name: string | null;
};

function formatInr(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDueLabel(dueAt: string | null): string {
  if (!dueAt) return "";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "";
  const overdue = due.getTime() < Date.now();
  const label = due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return overdue ? `Overdue since ${label}` : `Due ${label}`;
}

function buildReminderEmailHtml(input: {
  clientName: string;
  invoiceNumber: string;
  amountLabel: string;
  dueLabel: string;
  portalLink: string;
  customMessage?: string;
}): string {
  const intro = input.customMessage?.trim()
    ? `<p>${input.customMessage.replace(/\n/g, "<br/>")}</p>`
    : `<p>This is a friendly reminder that invoice <strong>${input.invoiceNumber}</strong> for <strong>${input.amountLabel}</strong> is pending payment.</p>`;

  const dueLine = input.dueLabel ? `<p style="color:#b45309;margin:12px 0 0;">${input.dueLabel}</p>` : "";

  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${input.clientName},</p>
  ${intro}
  ${dueLine}
  <p style="margin:20px 0 8px;">You can view the invoice and pay securely via Razorpay in your client portal:</p>
  <p><a href="${input.portalLink}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Pay in client portal</a></p>
  <p style="margin-top:16px;font-size:14px;color:#6b7280;">Or open this link: <a href="${input.portalLink}">${input.portalLink}</a></p>
  <p style="margin-top:24px;">Thank you,<br/>Curvvtech</p>
</body></html>`;
}

async function resolveInvoice(clientId: string, invoiceId?: string): Promise<InvoiceRow> {
  if (invoiceId) {
    const inv = firstRow<InvoiceRow>(
      await sql`
        SELECT id, invoice_number, total_cents, amount_cents, status, due_at, client_id::text, project_id::text
        FROM invoices
        WHERE id = ${invoiceId}::uuid AND client_id = ${clientId}::uuid
        LIMIT 1
      `,
    );
    if (!inv) throw notFound("Invoice not found for this client");
    if (["paid", "cancelled"].includes(inv.status)) throw badRequest("Invoice is already paid or cancelled");
    return inv;
  }

  const inv = firstRow<InvoiceRow>(
    await sql`
      SELECT id, invoice_number, total_cents, amount_cents, status, due_at, client_id::text, project_id::text
      FROM invoices
      WHERE client_id = ${clientId}::uuid AND status NOT IN ('paid', 'cancelled')
      ORDER BY
        CASE WHEN due_at IS NOT NULL AND due_at < NOW() THEN 0 ELSE 1 END,
        due_at ASC NULLS LAST,
        "createdAt" ASC
      LIMIT 1
    `,
  );
  if (!inv) throw notFound("No pending invoice found for this client");
  return inv;
}

export async function sendPaymentReminder(input: {
  clientId: string;
  invoiceId?: string;
  actorId: string;
  actorName: string;
  message?: string;
}): Promise<{
  ok: true;
  invoice_id: string;
  invoice_number: string;
  amount_cents: number;
  email_sent: boolean;
  notification_sent: boolean;
  portal_link: string;
}> {
  const client = firstRow<ClientRow>(
    await sql`SELECT id, organization_id, email, name FROM clients WHERE id = ${input.clientId}::uuid LIMIT 1`,
  );
  if (!client) throw notFound("Client not found");
  if (!client.organization_id) throw badRequest("Client has no organization");
  if (!client.email?.trim()) throw badRequest("Client has no email on file");

  const inv = await resolveInvoice(input.clientId, input.invoiceId);
  const amountCents = Number(inv.total_cents ?? inv.amount_cents ?? 0);
  const invoiceNumber = inv.invoice_number?.trim() || `INV-${inv.id.slice(0, 8)}`;
  const portalLink = `${config.clientPortalUrl.replace(/\/$/, "")}/billing`;
  const amountLabel = formatInr(amountCents);
  const dueLabel = formatDueLabel(inv.due_at);
  const clientName = client.name?.trim() || "there";

  const subject = dueLabel.toLowerCase().includes("overdue")
    ? `Payment reminder: ${invoiceNumber} is overdue`
    : `Payment reminder: ${invoiceNumber}`;

  const emailSent = await sendClientEmail({
    organizationId: client.organization_id,
    to: client.email.trim(),
    subject,
    html: buildReminderEmailHtml({
      clientName,
      invoiceNumber,
      amountLabel,
      dueLabel,
      portalLink,
      customMessage: input.message,
    }),
  }).catch(() => false);

  const notificationBody = dueLabel
    ? `${amountLabel} outstanding — ${dueLabel}. Pay securely in your client portal.`
    : `${amountLabel} outstanding. Pay securely in your client portal.`;

  const activity = await emitClientActivity(input.clientId, {
    actorId: input.actorId,
    actorName: input.actorName,
    eventType: "invoice.reminder",
    entityType: "invoice",
    entityId: inv.id,
    title: `Payment reminder: ${invoiceNumber}`,
    body: notificationBody,
    visibility: "client",
    metadata: { invoice_number: invoiceNumber, amount_cents: amountCents, portal_link: portalLink },
  });

  await sql`
    INSERT INTO client_communications (client_id, channel, subject, body, author_user_id)
    VALUES (
      ${input.clientId}::uuid,
      'reminder',
      ${subject},
      ${input.message?.trim() || notificationBody},
      ${input.actorId}
    )
  `;

  return {
    ok: true,
    invoice_id: inv.id,
    invoice_number: invoiceNumber,
    amount_cents: amountCents,
    email_sent: emailSent,
    notification_sent: Boolean(activity),
    portal_link: portalLink,
  };
}
