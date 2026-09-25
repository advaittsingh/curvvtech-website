import type { IncomingMessage } from "node:http";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

export type MultipartFile = {
  fieldName: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export type MultipartBody = {
  fields: Record<string, string>;
  files: MultipartFile[];
};

function headerValue(headers: string, name: string): string | undefined {
  const re = new RegExp(`^${name}\\s*:\\s*(.+)$`, "im");
  const m = re.exec(headers);
  return m?.[1]?.trim();
}

function parseContentDisposition(value: string | undefined): { name?: string; filename?: string } {
  if (!value) return {};
  const name = /(?:^|;)\s*name="([^"]*)"/i.exec(value)?.[1];
  const filenameStar = /(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i.exec(value)?.[1];
  const filenameQuoted = /(?:^|;)\s*filename="([^"]*)"/i.exec(value)?.[1];
  const filenameBare = /(?:^|;)\s*filename=([^;]+)/i.exec(value)?.[1];
  const raw =
    (filenameStar ? decodeURIComponent(filenameStar) : undefined) ??
    filenameQuoted ??
    filenameBare?.trim();
  return { name, filename: raw };
}

function stripTrailingCrlf(part: Buffer): Buffer {
  if (part.length >= 2 && part[part.length - 2] === 0x0d && part[part.length - 1] === 0x0a) {
    return part.subarray(0, part.length - 2);
  }
  if (part.length >= 1 && part[part.length - 1] === 0x0a) {
    return part.subarray(0, part.length - 1);
  }
  return part;
}

export function parseMultipartBuffer(buffer: Buffer, contentType: string): MultipartBody {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = (m?.[1] || m?.[2] || "").trim();
  if (!boundary) {
    throw Object.assign(new Error("Missing multipart boundary"), { status: 400 });
  }

  const delimiter = Buffer.from(`--${boundary}`);
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];

  let offset = buffer.indexOf(delimiter);
  if (offset < 0) {
    throw Object.assign(new Error("Malformed multipart body"), { status: 400 });
  }

  offset += delimiter.length;
  while (offset < buffer.length) {
    if (buffer[offset] === 0x2d && buffer[offset + 1] === 0x2d) break;
    if (buffer[offset] === 0x0d) offset += 1;
    if (buffer[offset] === 0x0a) offset += 1;

    const next = buffer.indexOf(delimiter, offset);
    if (next < 0) break;
    let part = buffer.subarray(offset, next);
    part = stripTrailingCrlf(part);

    const headerEndCrlf = part.indexOf(Buffer.from("\r\n\r\n"));
    const headerEndLf = headerEndCrlf < 0 ? part.indexOf(Buffer.from("\n\n")) : -1;
    const headerSep = headerEndCrlf >= 0 ? 4 : 2;
    const headerEnd = headerEndCrlf >= 0 ? headerEndCrlf : headerEndLf;
    if (headerEnd < 0) {
      offset = next + delimiter.length;
      continue;
    }

    const headers = part.subarray(0, headerEnd).toString("utf8");
    const body = part.subarray(headerEnd + headerSep);
    const disposition = parseContentDisposition(headerValue(headers, "content-disposition"));
    const name = disposition.name;
    if (!name) {
      offset = next + delimiter.length;
      continue;
    }

    if (disposition.filename != null && disposition.filename !== "") {
      files.push({
        fieldName: name,
        filename: disposition.filename,
        contentType: headerValue(headers, "content-type") || "application/octet-stream",
        buffer: body,
      });
    } else {
      fields[name] = body.toString("utf8");
    }

    offset = next + delimiter.length;
  }

  return { fields, files };
}

type BufferedRequest = IncomingMessage & { body?: unknown; rawBody?: Buffer };

function alreadyBuffered(req: BufferedRequest): Buffer | null {
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length) return req.rawBody;
  if (Buffer.isBuffer(req.body) && req.body.length) return req.body;
  if (typeof req.body === "string" && req.body.length) return Buffer.from(req.body);
  return null;
}

export async function readRequestBuffer(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<Buffer> {
  const existing = alreadyBuffered(req as BufferedRequest);
  if (existing) {
    if (existing.length > maxBytes) {
      throw Object.assign(new Error("File too large. Maximum size is 8 MB."), { status: 413 });
    }
    return existing;
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw Object.assign(new Error("File too large. Maximum size is 8 MB."), { status: 413 });
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export const CAREER_RESUME_MAX_BYTES = MAX_BODY_BYTES;
/** Real CVs are tens of KB+. Rejects the 45-byte "%PDF…%%EOF" test stub. */
export const CAREER_RESUME_MIN_BYTES = 1024;
