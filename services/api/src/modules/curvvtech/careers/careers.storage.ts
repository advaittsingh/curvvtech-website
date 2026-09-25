import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getObjectBytes, putObjectBytes, s3Configured } from "../../../services/s3Presign.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISK_ROOT = path.resolve(__dirname, "../../../../uploads/career-applications");

export type ResumeStorage = "disk" | "s3" | "db";

export type StoredResume = {
  storage: ResumeStorage;
  key: string;
};

function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid resume key");
  }
  return normalized;
}

function diskPathFor(key: string): string {
  const safe = assertSafeKey(key);
  const full = path.resolve(DISK_ROOT, safe);
  if (full !== DISK_ROOT && !full.startsWith(`${DISK_ROOT}${path.sep}`)) {
    throw new Error("Invalid resume path");
  }
  return full;
}

export async function storeCareerResume(opts: {
  applicationId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
}): Promise<StoredResume> {
  const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "resume";
  const key = `${opts.applicationId}/${safeName}`;

  if (s3Configured()) {
    const s3Key = `careers/${key}`;
    try {
      const ok = await putObjectBytes({
        key: s3Key,
        body: opts.buffer,
        contentType: opts.contentType,
      });
      if (ok) return { storage: "s3", key: s3Key };
    } catch (err) {
      if (process.env.VERCEL) throw err;
    }
  }

  if (process.env.VERCEL) {
    throw new Error("CV storage is not available.");
  }

  const full = diskPathFor(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, opts.buffer);
  return { storage: "disk", key };
}

export async function loadCareerResume(opts: {
  storage: ResumeStorage;
  key: string;
}): Promise<{ body: Buffer; contentType?: string } | null> {
  if (opts.storage === "db") return null;
  if (opts.storage === "s3") {
    return getObjectBytes(opts.key);
  }
  try {
    const body = await readFile(diskPathFor(opts.key));
    return { body };
  } catch {
    if (!s3Configured()) return null;
    const s3Key = opts.key.startsWith("careers/") ? opts.key : `careers/${opts.key}`;
    return getObjectBytes(s3Key);
  }
}
