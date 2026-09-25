import { describe, expect, it } from "vitest";
import { parseMultipartBuffer } from "../src/modules/curvvtech/careers/multipart.js";
import { validateApplyInput } from "../src/modules/curvvtech/careers/careers.service.js";

function buildMultipart(fields: Record<string, string>, file: { name: string; filename: string; type: string; body: Buffer }) {
  const boundary = "----CurvvTestBoundary";
  const chunks: Buffer[] = [];
  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }
  chunks.push(
    Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,
      ),
      file.body,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  );
  return {
    buffer: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

const STUB_PDF = Buffer.from("%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

function paddedPdf(bytes = 2048): Buffer {
  const header = Buffer.from("%PDF-1.4\n");
  const footer = Buffer.from("\n%%EOF\n");
  const pad = Buffer.alloc(Math.max(0, bytes - header.length - footer.length), 0x20);
  return Buffer.concat([header, pad, footer]);
}

const fields = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+91 98765 43210",
  role_slug: "frontend-developer-intern",
  linkedin: "https://linkedin.com/in/ada",
  message: "I would like to intern.",
};

describe("career application multipart", () => {
  it("parses fields and a PDF resume", () => {
    const { buffer, contentType } = buildMultipart(
      fields,
      { name: "resume", filename: "ada.pdf", type: "application/pdf", body: paddedPdf() },
    );
    const parsed = parseMultipartBuffer(buffer, contentType);
    expect(parsed.fields.name).toBe("Ada Lovelace");
    expect(parsed.files[0]?.filename).toBe("ada.pdf");
    expect(parsed.files[0]?.buffer.subarray(0, 5).toString()).toBe("%PDF-");

    const v = validateApplyInput(parsed);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.data.email).toBe("ada@example.com");
      expect(v.data.resumeMime).toBe("application/pdf");
    }
  });

  it("rejects the empty PDF stub", () => {
    const { buffer, contentType } = buildMultipart(
      fields,
      { name: "resume", filename: "priya-sharma-cv.pdf", type: "application/pdf", body: STUB_PDF },
    );
    const parsed = parseMultipartBuffer(buffer, contentType);
    const v = validateApplyInput(parsed);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toMatch(/empty/i);
  });
});
