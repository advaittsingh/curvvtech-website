import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
