import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailAttachment } from "../../modules/shared/communications/mailer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ASSET_FILES = {
  logo: "curvvtech-logo.png",
  logoWhite: "curvvtech-logo-white.png",
} as const;

function resolveAssetPath(filename: string): string {
  const candidates = [
    join(__dirname, "assets", filename),
    join(process.cwd(), "src/templates/email/assets", filename),
    join(process.cwd(), "dist/templates/email/assets", filename),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(`${filename} not found`);
}

export function readEmailAsset(filename: string): Buffer {
  return readFileSync(resolveAssetPath(filename));
}

/** CID inline attachments so Gmail/Outlook render logos (data URIs are blocked). */
export function inviteEmailInlineAttachments(): EmailAttachment[] {
  return [
    {
      filename: ASSET_FILES.logoWhite,
      content: readEmailAsset(ASSET_FILES.logoWhite),
      contentType: "image/png",
      contentId: "ct-logo-white",
    },
    {
      filename: ASSET_FILES.logo,
      content: readEmailAsset(ASSET_FILES.logo),
      contentType: "image/png",
      contentId: "ct-logo",
    },
  ];
}

/** Hosted fallback after API deploy — Gmail-safe HTTPS URLs. */
export const EMAIL_ASSETS_BASE_URL =
  process.env.EMAIL_ASSETS_BASE_URL?.trim() || "https://api.curvvtech.in/v1/email-assets";

export function hostedEmailAssetUrl(filename: string): string {
  return `${EMAIL_ASSETS_BASE_URL}/${filename}`;
}
