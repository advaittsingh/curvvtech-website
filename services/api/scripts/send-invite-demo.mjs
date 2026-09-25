#!/usr/bin/env node
/**
 * Send a demo Client Portal invite email.
 * Usage: node scripts/send-invite-demo.mjs [recipient]
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(apiRoot, ".env.aws"))) {
  loadEnv({ path: join(apiRoot, ".env.aws") });
} else {
  loadEnv({ path: join(apiRoot, ".env") });
}

const { sendEmail, emailConfigured } = await import("../dist/modules/shared/communications/mailer.js");
const { buildInviteEmail } = await import("../dist/templates/email/inviteEmailTemplate.js");

const to = (process.argv[2] || "advaitsingh@curvvtech.in").trim().toLowerCase();

if (!emailConfigured()) {
  console.error("Email not configured. Add RESEND_API_KEY to services/api/.env.aws or .env.");
  process.exit(1);
}

const { html, attachments } = buildInviteEmail({
  clientName: "Advait",
  companyName: "Young Boy Toyz",
  industry: "Events",
  projectCount: 2,
  contractValue: "45,000",
  portalRole: "Owner",
  inviteUrl: "https://client.curvvtech.com/invite/demo-preview-token",
});

const result = await sendEmail({
  to,
  subject: "You're invited to your curvvtech Client Portal",
  html,
  attachments,
  from: process.env.EMAIL_FROM || "curvvtech <noreply@curvvtech.in>",
});

if (!result.ok) {
  console.error("Send failed:", result.error);
  process.exit(1);
}

console.log(`Demo invite sent to ${to} via ${result.provider} (id: ${result.id ?? "n/a"})`);
