/**
 * Push services/api/.env.aws into Vercel production env without printing values.
 * Usage: node scripts/sync-vercel-env.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const envFile = existsSync(path.join(root, ".env.aws"))
  ? path.join(root, ".env.aws")
  : path.join(root, ".env");

const SKIP_KEYS = new Set([
  "PORT",
  "HOST",
  "SKIP_AUTH",
  "NODE_ENV",
  "DEV_AUTH_EMAIL",
  "DEV_AUTH_SUB",
]);

const FORCED = {
  SKIP_AUTH: "false",
  AI_CALL_WORKER_ENABLED: "false",
  PG_POOL_MAX: "3",
};

function parseEnv(text) {
  const out = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function upsert(name, value) {
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production", "--scope", "curvvtech", "--yes", "--force"],
    {
      cwd: root,
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (r.status !== 0) {
    const err = `${r.stderr || r.stdout || ""}`.trim();
    throw new Error(`${name} failed: ${err || `exit ${r.status}`}`);
  }
}

if (!existsSync(envFile)) {
  console.error("No .env.aws or .env found — add vars in the Vercel dashboard.");
  process.exit(1);
}

const parsed = parseEnv(readFileSync(envFile, "utf8"));
const names = Object.keys(parsed).filter((k) => !SKIP_KEYS.has(k) && parsed[k] !== "");
for (const name of names) {
  upsert(name, parsed[name]);
  console.log(`set ${name}`);
}
for (const [name, value] of Object.entries(FORCED)) {
  upsert(name, value);
  console.log(`set ${name}`);
}
console.log(`synced ${names.length + Object.keys(FORCED).length} vars`);
