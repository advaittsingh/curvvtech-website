import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/images/home/brand/clients");
const assets = path.join(
  process.env.USERPROFILE ?? "",
  ".cursor",
  "projects",
  "c-Users-MY-PC-Desktop-Curvvtech",
  "assets",
);

const SOURCES = {
  dreamz:
    "c__Users_MY_PC_AppData_Roaming_Cursor_User_workspaceStorage_4af22df959d83cd7b1e252e0ec97e867_images_image-dcfbe52c-01f3-4a71-befa-856f6a131dda.png",
  masako:
    "c__Users_MY_PC_AppData_Roaming_Cursor_User_workspaceStorage_4af22df959d83cd7b1e252e0ec97e867_images_WhatsApp_Image_2026-06-10_at_1.12.22_PM__1_-a870726d-5ab6-43d6-b675-7127e13ed7cc.png",
  lifeset:
    "c__Users_MY_PC_AppData_Roaming_Cursor_User_workspaceStorage_4af22df959d83cd7b1e252e0ec97e867_images_WhatsApp_Image_2026-06-10_at_1.15.34_PM__1_-ffab9c35-4b52-41d5-b021-80d73c45924d.png",
  paata:
    "c__Users_MY_PC_AppData_Roaming_Cursor_User_workspaceStorage_4af22df959d83cd7b1e252e0ec97e867_images_WhatsApp_Image_2026-06-10_at_1.15.34_PM-9946b783-a03c-41ae-af5a-f918a9ed740b.png",
};

async function writeRaw(input, data, info) {
  const tmp = `${input}.tmp.png`;
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, input);
}

async function trim(file) {
  const input = path.join(dir, file);
  const tmp = `${input}.trim.png`;
  await sharp(input).trim({ threshold: 8 }).png().toFile(tmp);
  fs.renameSync(tmp, input);
  const m = await sharp(input).metadata();
  return { width: m.width, height: m.height };
}

function restoreFromAssets(key, destFile) {
  const src = path.join(assets, SOURCES[key]);
  const dest = path.join(dir, destFile);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return fs.existsSync(dest);
}

async function processDreamz() {
  const file = "dreamz.png";
  if (!restoreFromAssets("dreamz", file)) return null;
  const input = path.join(dir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;

    const lightness = (r + g + b) / 3;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);

    // Remove black backdrop
    if (lightness <= 42 && spread < 35) {
      data[i + 3] = 0;
      continue;
    }

    // Dark grey wordmark + dots -> soft white for dark UI
    if (lightness < 95 && spread < 45) {
      data[i] = 245;
      data[i + 1] = 245;
      data[i + 2] = 248;
      continue;
    }

    // Boost pink icon saturation slightly
    if (g < 120 && r > 140) {
      data[i] = Math.min(255, r + 10);
      data[i + 1] = Math.min(255, g + 4);
      data[i + 2] = Math.min(255, b + 4);
    }
  }

  await writeRaw(input, data, info);
  return trim(file);
}

async function processMasako() {
  const file = "masako-india.png";
  if (!restoreFromAssets("masako", file)) return null;
  const input = path.join(dir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lightness = (r + g + b) / 3;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);

    // Remove cream / white backdrop
    if (lightness >= 225 && spread < 55) {
      data[i + 3] = 0;
      continue;
    }

    if (lightness >= 205 && spread < 65) {
      const fade = 1 - (lightness - 205) / 25;
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, fade));
    }

    // Lift gold marks for dark backgrounds
    if (data[i + 3] > 0) {
      data[i] = Math.min(255, r + 18);
      data[i + 1] = Math.min(255, g + 12);
      data[i + 2] = Math.min(255, b + 4);
    }
  }

  await writeRaw(input, data, info);
  return trim(file);
}

async function processLifeset() {
  const file = "lifeset.png";
  if (!restoreFromAssets("lifeset", file)) return null;
  const input = path.join(dir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lightness = (r + g + b) / 3;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);

    // Remove white backdrop
    if (lightness >= 235 && spread < 40) {
      data[i + 3] = 0;
      continue;
    }

    // Black text/lines -> light for dark UI; keep yellow ring
    const isYellow = r > 170 && g > 130 && b < 90;
    if (!isYellow && lightness < 90 && spread < 50) {
      data[i] = 248;
      data[i + 1] = 248;
      data[i + 2] = 250;
    }
  }

  await writeRaw(input, data, info);
  return trim(file);
}

async function processPaata() {
  const file = "paata-ai.png";
  if (!restoreFromAssets("paata", file)) return null;
  const input = path.join(dir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lightness = (r + g + b) / 3;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);

    // Keep only near-white logo marks (ai, PAATA, book outline)
    const isLogoMark = lightness >= 175 && spread < 55;
    if (!isLogoMark) {
      data[i + 3] = 0;
      continue;
    }

    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = Math.min(
      255,
      Math.round(200 + ((lightness - 175) / 80) * 55),
    );
  }

  await writeRaw(input, data, info);
  return trim(file);
}

const results = {
  dreamz: await processDreamz(),
  masako: await processMasako(),
  lifeset: await processLifeset(),
  paata: await processPaata(),
};

console.log(JSON.stringify(results, null, 2));
