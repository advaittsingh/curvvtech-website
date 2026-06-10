import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/images/home/brand/clients");

/** Make light pixels transparent (white / cream backgrounds) */
async function removeLightBackground(file, { threshold = 238, feather = 18 } = {}) {
  const input = path.join(dir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const lightness = (r + g + b) / 3;

    if (lightness >= threshold && max - min < 40) {
      data[i + 3] = 0;
      continue;
    }

    if (lightness >= threshold - feather) {
      const fade =
        1 - (lightness - (threshold - feather)) / Math.max(feather, 1);
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, fade)));
    }
  }

  const tmp = `${input}.tmp.png`;
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, input);
}

/** Make dark pixels transparent (black backgrounds) */
async function removeDarkBackground(file, { threshold = 42, feather = 20 } = {}) {
  const input = path.join(dir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const darkness = (r + g + b) / 3;

    if (darkness <= threshold) {
      data[i + 3] = 0;
      continue;
    }

    if (darkness <= threshold + feather) {
      const fade = (darkness - threshold) / Math.max(feather, 1);
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, fade)));
    }
  }

  const tmp = `${input}.tmp.png`;
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, input);
}

const lightLogos = [
  ["blaaze.png", { threshold: 210, feather: 25 }],
  ["dreamz.png", { threshold: 235, feather: 20 }],
  ["masako-india.png", { threshold: 232, feather: 22 }],
  ["lifeset.png", { threshold: 240, feather: 18 }],
  ["treadtrails.png", { threshold: 242, feather: 16 }],
];

for (const [file, opts] of lightLogos) {
  await removeLightBackground(file, opts);
  console.log("processed light:", file);
}

// PAATA keeps its gradient tile — only strip outer white if present
await removeLightBackground("paata-ai.png", { threshold: 248, feather: 8 });
console.log("processed light:", "paata-ai.png");

await removeDarkBackground("youngboyztoyz.png", { threshold: 38, feather: 22 });
console.log("processed dark:", "youngboyztoyz.png");
