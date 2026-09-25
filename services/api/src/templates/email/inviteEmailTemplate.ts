import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailAttachment } from "../../modules/shared/communications/mailer.js";
import {
  EMAIL_ASSETS_BASE_URL,
  hostedEmailAssetUrl,
  inviteEmailInlineAttachments,
} from "./curvvtechEmailLogo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveTemplatePath(): string {
  const candidates = [
    join(__dirname, "invite-email.html"),
    join(process.cwd(), "src/templates/email/invite-email.html"),
    join(process.cwd(), "dist/templates/email/invite-email.html"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error("invite-email.html not found");
}

/** Variables for invite-email.html — see HTML comment block for full docs. */
export type InviteEmailVars = {
  clientName: string;
  companyName: string;
  industry: string;
  projectCount: string | number;
  contractValue: string;
  portalRole: string;
  inviteUrl: string;
  year?: string | number;
  /** White logo for dark header/footer. Defaults to cid:ct-logo-white when using inline mode. */
  logoUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
};

export type InviteEmailBundle = {
  html: string;
  attachments: EmailAttachment[];
};

const DEFAULTS: Required<Pick<InviteEmailVars, "linkedinUrl" | "instagramUrl" | "websiteUrl" | "year">> = {
  linkedinUrl: "https://www.linkedin.com/company/curvvtech",
  instagramUrl: "https://www.instagram.com/curvvtech",
  websiteUrl: "https://curvvtech.com",
  year: new Date().getFullYear(),
};

let cachedTemplate: string | null = null;

function loadTemplate(): string {
  if (!cachedTemplate) {
    cachedTemplate = readFileSync(resolveTemplatePath(), "utf8");
  }
  return cachedTemplate;
}

/** Escape HTML entities in user-supplied values. */
export function escapeInviteHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mergeVars(vars: InviteEmailVars, logoUrl: string): Record<string, string> {
  return {
    clientName: escapeInviteHtml(vars.clientName),
    companyName: escapeInviteHtml(vars.companyName),
    industry: escapeInviteHtml(vars.industry || "—"),
    projectCount: String(vars.projectCount),
    contractValue: escapeInviteHtml(vars.contractValue),
    portalRole: escapeInviteHtml(vars.portalRole),
    inviteUrl: vars.inviteUrl,
    year: String(vars.year ?? DEFAULTS.year),
    logoUrl,
    linkedinUrl: vars.linkedinUrl ?? DEFAULTS.linkedinUrl,
    instagramUrl: vars.instagramUrl ?? DEFAULTS.instagramUrl,
    websiteUrl: vars.websiteUrl ?? DEFAULTS.websiteUrl,
    assetsBaseUrl: EMAIL_ASSETS_BASE_URL,
  };
}

function applyVars(html: string, merged: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(merged)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

/**
 * Production send bundle — CID inline logos (Gmail/Outlook safe).
 */
export function buildInviteEmail(vars: InviteEmailVars): InviteEmailBundle {
  const html = applyVars(
    loadTemplate(),
    mergeVars(vars, vars.logoUrl ?? "cid:ct-logo-white"),
  );
  return { html, attachments: inviteEmailInlineAttachments() };
}

/**
 * Replace {{variable}} placeholders in invite-email.html.
 * Uses hosted HTTPS asset URLs (no inline attachments).
 */
export function renderInviteEmail(vars: InviteEmailVars): string {
  return applyVars(
    loadTemplate(),
    mergeVars(vars, vars.logoUrl ?? hostedEmailAssetUrl("curvvtech-logo-white.png")),
  );
}

/** Format paise/cents as Indian locale rupees string without ₹ prefix. */
export function formatInviteContractValue(cents: number | null | undefined): string {
  const rupees = Math.round(Number(cents ?? 0) / 100);
  return rupees.toLocaleString("en-IN");
}

/** Human-readable portal role label. */
export function formatPortalRole(role: string): string {
  const map: Record<string, string> = {
    owner: "Owner",
    manager: "Manager",
    finance: "Finance",
    viewer: "Viewer",
  };
  return map[role.toLowerCase()] ?? role.charAt(0).toUpperCase() + role.slice(1);
}
