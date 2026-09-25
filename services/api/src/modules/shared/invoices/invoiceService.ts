import { sql, firstRow } from "../../../lib/sqlPool.js";
import type { ClientPortalContext } from "../../client-portal/clientAuth.middleware.js";
import { emitActivityEvent } from "../activity/emitActivityEvent.js";
import { createRazorpayOrder, razorpayErrorStatus, verifyRazorpayPaymentSignature } from "../../billing/razorpayCheckout.js";
import { AppError } from "../../../lib/errors.js";
import {
  buildInvoiceDocumentHtml,
  buildReceiptDocumentHtml,
  type CompanyDocumentInput,
  type InvoiceLineItem,
} from "../../curvvtech/services/invoiceDocumentHtml.js";

const CLIENT_VISIBLE_STATUSES = ["sent", "viewed", "paid", "overdue", "partial"];

export type ClientInvoiceDTO = {
  id: string;
  invoice_number: string;
  title: string | null;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
  project_id: string | null;
  created_at: string;
  payment_method: string | null;
  payment_reference: string | null;
};

type InvoiceRow = ClientInvoiceDTO & Record<string, unknown>;

/** Derive a human-readable payment method + reference from the stored link. */
function paymentInfo(paymentLink: unknown, status: string): { method: string | null; reference: string | null } {
  const link = String(paymentLink ?? "");
  if (link.startsWith("razorpay:")) return { method: "Razorpay", reference: link.slice("razorpay:".length) };
  if (link) return { method: "Online", reference: null };
  if (status === "paid") return { method: "Manual", reference: null };
  return { method: null, reference: null };
}

function toClientInvoice(row: InvoiceRow): ClientInvoiceDTO {
  const { method, reference } = paymentInfo(row.payment_link, String(row.status));
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : null;
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    title,
    status: row.status,
    subtotal_cents: Number(row.subtotal_cents ?? 0),
    tax_cents: Number(row.tax_cents ?? 0),
    discount_cents: Number(row.discount_cents ?? 0),
    total_cents: Number(row.total_cents ?? row.amount_cents ?? 0),
    amount_cents: Number(row.amount_cents ?? 0),
    due_at: row.due_at,
    paid_at: row.paid_at,
    project_id: row.project_id,
    created_at: row.created_at,
    payment_method: method,
    payment_reference: reference,
  };
}

export async function listInvoicesForClient(ctx: ClientPortalContext): Promise<ClientInvoiceDTO[]> {
  const rows = (await sql`
    SELECT i.id, i.invoice_number, i.status, i.subtotal_cents, i.tax_cents, i.discount_cents,
           i.total_cents, i.amount_cents, i.due_at, i.paid_at, i.project_id, i.payment_link,
           i."createdAt" AS created_at, it.description AS title
    FROM invoices i
    LEFT JOIN LATERAL (
      SELECT description FROM invoice_items WHERE invoice_id = i.id ORDER BY "createdAt" ASC LIMIT 1
    ) it ON true
    WHERE i.client_id = ${ctx.clientId}
      AND i.organization_id = ${ctx.organizationId}
      AND i.status = ANY(${CLIENT_VISIBLE_STATUSES})
    ORDER BY i."createdAt" DESC
  `) as InvoiceRow[];
  return rows.map(toClientInvoice);
}

export async function getInvoiceForClient(
  ctx: ClientPortalContext,
  invoiceId: string,
): Promise<(ClientInvoiceDTO & { items: unknown[]; razorpay_order_id: string | null }) | null> {
  const row = firstRow<InvoiceRow & { razorpay_order_id: string | null }>(
    await sql`
      SELECT i.id, i.invoice_number, i.status, i.subtotal_cents, i.tax_cents, i.discount_cents,
             i.total_cents, i.amount_cents, i.due_at, i.paid_at, i.project_id, i.razorpay_order_id,
             i.payment_link, i."createdAt" AS created_at, it.description AS title
      FROM invoices i
      LEFT JOIN LATERAL (
        SELECT description FROM invoice_items WHERE invoice_id = i.id ORDER BY "createdAt" ASC LIMIT 1
      ) it ON true
      WHERE i.id = ${invoiceId}
        AND i.client_id = ${ctx.clientId}
        AND i.organization_id = ${ctx.organizationId}
        AND i.status = ANY(${CLIENT_VISIBLE_STATUSES})
      LIMIT 1
    `,
  );
  if (!row) return null;
  const items = (await sql`
    SELECT id, description, quantity, unit_price_cents
    FROM invoice_items
    WHERE invoice_id = ${invoiceId}
    ORDER BY "createdAt" ASC
  `) as unknown[];
  return { ...toClientInvoice(row), items, razorpay_order_id: row.razorpay_order_id };
}

function paymentGatewayError(err: unknown): AppError {
  const e = err as Error & { code?: string };
  if (e.code === "NOT_CONFIGURED") {
    return new AppError(503, "INTERNAL", "Online payments are not configured yet. Please contact your account manager.");
  }
  if (e.code === "INVALID_AMOUNT") {
    return new AppError(400, "VALIDATION_ERROR", e.message);
  }
  const { status, message } = razorpayErrorStatus(err);
  if (status === 401) {
    return new AppError(
      503,
      "INTERNAL",
      "Payment gateway is temporarily unavailable. Please try again later or contact support.",
    );
  }
  const httpStatus = status >= 400 && status < 600 ? status : 503;
  return new AppError(httpStatus, "INTERNAL", message);
}

/** Create (or reuse) a Razorpay order for a client-owned unpaid invoice. */
export async function createPaymentOrder(
  ctx: ClientPortalContext,
  invoiceId: string,
): Promise<{ order_id: string; amount: number; currency: string; key_id: string } | null> {
  const inv = await getInvoiceForClient(ctx, invoiceId);
  if (!inv) return null;
  if (inv.status === "paid") return null;
  const amount = inv.total_cents || inv.amount_cents;
  if (amount < 100) return null;

  try {
    const order = await createRazorpayOrder({
      amount,
      currency: "INR",
      receipt: `inv_${invoiceId.replace(/-/g, "").slice(0, 32)}`,
      notes: { invoice_id: invoiceId, client_id: ctx.clientId },
    });

    await sql`
      UPDATE invoices SET razorpay_order_id = ${order.order_id}, "updatedAt" = now()
      WHERE id = ${invoiceId}
    `;
    return order;
  } catch (err) {
    throw paymentGatewayError(err);
  }
}

/** Verify signature and mark invoice paid (reconciliation). Idempotent. */
export async function verifyAndMarkPaid(
  ctx: ClientPortalContext,
  invoiceId: string,
  payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const row = firstRow<{ id: string; status: string; project_id: string | null; invoice_number: string }>(
    await sql`
      SELECT id, status, project_id, invoice_number FROM invoices
      WHERE id = ${invoiceId}
        AND client_id = ${ctx.clientId}
        AND organization_id = ${ctx.organizationId}
      LIMIT 1
    `,
  );
  if (!row) return { ok: false };
  if (row.status === "paid") return { ok: true, alreadyPaid: true };

  const valid = verifyRazorpayPaymentSignature(
    payload.razorpay_order_id,
    payload.razorpay_payment_id,
    payload.razorpay_signature,
  );
  if (!valid) return { ok: false };

  await sql`
    UPDATE invoices
    SET status = 'paid', paid_at = now(), "updatedAt" = now(),
        payment_link = ${`razorpay:${payload.razorpay_payment_id}`}
    WHERE id = ${invoiceId}
  `;

  await emitActivityEvent({
    organizationId: ctx.organizationId,
    clientId: ctx.clientId,
    projectId: row.project_id,
    actorType: "client",
    actorId: ctx.clientUserId,
    actorName: ctx.email,
    eventType: "invoice.paid",
    entityType: "invoice",
    entityId: invoiceId,
    title: `Invoice ${row.invoice_number} paid`,
    body: `Payment received via Razorpay`,
    metadata: { razorpay_payment_id: payload.razorpay_payment_id },
    visibility: "client",
  });

  return { ok: true };
}

/** Full invoice row + client + company + items, scoped to the portal client. */
type FullInvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  subtotal_cents: number | null;
  tax_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;
  amount_cents: number | null;
  due_at: string | null;
  paid_at: string | null;
  payment_link: string | null;
  created_at: string | null;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  client_gst: string | null;
  client_pan: string | null;
  project_name: string | null;
};

async function loadInvoiceForDocument(
  ctx: ClientPortalContext,
  invoiceId: string,
): Promise<{ invoice: FullInvoiceRow; company: CompanyDocumentInput; items: InvoiceLineItem[] } | null> {
  const invoice = firstRow<FullInvoiceRow>(
    await sql`
      SELECT
        i.id, i.invoice_number, i.status, i.subtotal_cents, i.tax_cents, i.discount_cents,
        i.total_cents, i.amount_cents, i.due_at, i.paid_at, i.payment_link,
        i."createdAt" AS created_at,
        c.name AS client_name, c.company AS client_company, c.email AS client_email,
        c.phone AS client_phone, c.address AS client_address, c.gst_number AS client_gst,
        c.pan_number AS client_pan, p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.id = ${invoiceId}
        AND i.client_id = ${ctx.clientId}
        AND i.organization_id = ${ctx.organizationId}
        AND i.status = ANY(${CLIENT_VISIBLE_STATUSES})
      LIMIT 1
    `,
  );
  if (!invoice) return null;
  const company = (firstRow<CompanyDocumentInput>(
    await sql`SELECT * FROM company_settings ORDER BY "createdAt" ASC LIMIT 1`,
  )) ?? {};
  const items = (await sql`
    SELECT description, quantity, unit_price_cents, tax_percent, discount_cents
    FROM invoice_items WHERE invoice_id = ${invoiceId} ORDER BY "createdAt" ASC
  `) as InvoiceLineItem[];
  return { invoice, company, items };
}

/** Render the invoice PDF/HTML for a portal client. Returns null if not visible. */
export async function getInvoiceDocumentForClient(
  ctx: ClientPortalContext,
  invoiceId: string,
): Promise<string | null> {
  const data = await loadInvoiceForDocument(ctx, invoiceId);
  if (!data) return null;
  const { invoice, company, items } = data;
  return buildInvoiceDocumentHtml(
    {
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      created_at: invoice.created_at,
      due_at: invoice.due_at,
      paid_at: invoice.paid_at,
      subtotal_cents: invoice.subtotal_cents,
      tax_cents: invoice.tax_cents,
      discount_cents: invoice.discount_cents,
      total_cents: invoice.total_cents,
      amount_cents: invoice.amount_cents,
      payment_link: invoice.payment_link,
      client_name: invoice.client_name,
      client_company: invoice.client_company,
      client_email: invoice.client_email,
      client_phone: invoice.client_phone,
      client_address: invoice.client_address,
      client_gst: invoice.client_gst,
      client_pan: invoice.client_pan,
      project_name: invoice.project_name,
      items,
    },
    company,
  );
}

/** Render the payment receipt for a paid portal-client invoice. Null if unpaid/not visible. */
export async function getReceiptDocumentForClient(
  ctx: ClientPortalContext,
  invoiceId: string,
): Promise<string | null> {
  const data = await loadInvoiceForDocument(ctx, invoiceId);
  if (!data) return null;
  const { invoice, company } = data;
  if (invoice.status !== "paid") return null;
  const link = invoice.payment_link ?? "";
  const method = link.startsWith("razorpay:") ? "Razorpay" : link ? "Online" : "Manual";
  const reference = link.startsWith("razorpay:") ? link.slice("razorpay:".length) : null;
  return buildReceiptDocumentHtml(
    {
      invoice_number: invoice.invoice_number,
      amount_cents: Number(invoice.total_cents ?? invoice.amount_cents ?? 0),
      paid_at: invoice.paid_at,
      method,
      payment_reference: reference,
      client_name: invoice.client_name,
      client_company: invoice.client_company,
      client_email: invoice.client_email,
      project_name: invoice.project_name,
    },
    company,
  );
}

export async function listPaymentsForClient(ctx: ClientPortalContext): Promise<unknown[]> {
  return (await sql`
    SELECT i.id, i.invoice_number, i.total_cents, i.amount_cents, i.paid_at,
           CASE WHEN i.payment_link LIKE 'razorpay:%' THEN 'Razorpay' ELSE 'Manual' END AS method,
           CASE WHEN i.payment_link LIKE 'razorpay:%' THEN substring(i.payment_link from 10) ELSE NULL END AS payment_reference,
           it.description AS title
    FROM invoices i
    LEFT JOIN LATERAL (
      SELECT description FROM invoice_items WHERE invoice_id = i.id ORDER BY "createdAt" ASC LIMIT 1
    ) it ON true
    WHERE i.client_id = ${ctx.clientId}
      AND i.organization_id = ${ctx.organizationId}
      AND i.status = 'paid'
    ORDER BY i.paid_at DESC NULLS LAST
  `) as unknown[];
}
