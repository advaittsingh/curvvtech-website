#!/usr/bin/env node
/**
 * Regenerate transparent email logos from the source PNG.
 * Source: src/templates/email/assets/curvvtech-logo-source.png (or existing curvvtech-logo.png)
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "../src/templates/email/assets");
const source = existsSync(join(assetsDir, "curvvtech-logo-source.png"))
  ? join(assetsDir, "curvvtech-logo-source.png")
  : join(assetsDir, "curvvtech-logo.png");

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function render(mode) {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = r + g + b;
    if (lum > 720 || (r > 235 && g > 235 && b > 235)) {
      out[i + 3] = 0;
      continue;
    }
    if (mode === "white") {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 255;
    } else {
      out[i] = 17;
      out[i + 1] = 24;
      out[i + 2] = 39;
      out[i + 3] = 255;
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().trim();
}

await render("black").toFile(join(assetsDir, "curvvtech-logo.png"));
await render("white").toFile(join(assetsDir, "curvvtech-logo-white.png"));
console.log("Generated transparent logos in", assetsDir);
