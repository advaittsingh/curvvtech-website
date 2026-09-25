import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

let _s3: S3Client | null = null;

function client(): S3Client | null {
  if (!config.s3Bucket) return null;
  if (!config.awsAccessKeyId || !config.awsSecretAccessKey) return null;
  if (!_s3) {
    _s3 = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });
  }
  return _s3;
}

export function s3Configured(): boolean {
  return client() !== null;
}

/** Returns true when the object exists in the configured bucket. */
export async function s3ObjectExists(key: string): Promise<boolean> {
  const s3 = client();
  if (!s3 || !key) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.s3Bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const name = (err as { name?: string })?.name;
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") return false;
    throw err;
  }
}

export async function presignProfileUpload(opts: {
  userId: string;
  purpose: "profile_photo" | "id_document";
  contentType: string;
}): Promise<{ url: string; key: string; expiresIn: number } | null> {
  const s3 = client();
  if (!s3) return null;

  const ext =
    opts.contentType === "image/png"
      ? "png"
      : opts.contentType === "image/webp"
        ? "webp"
        : "jpg";
  const key = `users/${opts.userId}/${opts.purpose}/${randomUUID()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: opts.contentType,
  });

  const expiresIn = 900;
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return { url, key, expiresIn };
}

export async function presignAdminFileUpload(opts: {
  userId: string;
  fileName: string;
  contentType: string;
  version?: number;
}): Promise<{ url: string; key: string; expiresIn: number } | null> {
  const s3 = client();
  if (!s3) return null;

  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `admin/${opts.userId}/${randomUUID()}/${opts.version ?? 1}/${safeName}`;

  const cmd = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: opts.contentType,
  });

  const expiresIn = 900;
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return { url, key, expiresIn };
}

export async function presignFileDownload(
  key: string,
  opts?: { inline?: boolean; contentType?: string | null },
): Promise<{ url: string; expiresIn: number } | null> {
  const s3 = client();
  if (!s3 || !key) return null;
  if (!(await s3ObjectExists(key))) return null;
  const expiresIn = 900;
  const cmd = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ...(opts?.inline
      ? {
          ResponseContentDisposition: "inline",
          ...(opts.contentType ? { ResponseContentType: opts.contentType } : {}),
        }
      : {}),
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return { url, expiresIn };
}

/** Client Portal — upload into the client's project inbox namespace. */
export async function presignClientFileUpload(opts: {
  clientId: string;
  projectId: string;
  fileName: string;
  contentType: string;
}): Promise<{ url: string; key: string; expiresIn: number } | null> {
  const s3 = client();
  if (!s3) return null;

  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `client/${opts.clientId}/${opts.projectId}/${randomUUID()}/${safeName}`;

  const cmd = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: opts.contentType,
  });

  const expiresIn = 900;
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return { url, key, expiresIn };
}

/** Client Portal — download a file the caller already verified as client-visible + owned. */
export async function presignClientFileDownload(opts: {
  key: string;
  clientId: string;
  fileId: string;
}): Promise<{ url: string; expiresIn: number } | null> {
  return presignFileDownload(opts.key);
}

export async function putObjectBytes(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<boolean> {
  const s3 = client();
  if (!s3) return false;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
  return true;
}

export async function getObjectBytes(
  key: string,
): Promise<{ body: Buffer; contentType?: string } | null> {
  const s3 = client();
  if (!s3 || !key) return null;
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }));
    const bytes = out.Body ? Buffer.from(await out.Body.transformToByteArray()) : Buffer.alloc(0);
    return { body: bytes, contentType: out.ContentType };
  } catch {
    return null;
  }
}
