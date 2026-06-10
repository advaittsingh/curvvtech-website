import * as fs from "node:fs";
import * as path from "node:path";
import type { ExpoConfig } from "expo/config";

/** Walk up from Gradle cwd (`android/`) to the folder that has the Expo app. */
function findExpoProjectRoot(start: string): string {
  let dir = path.resolve(start);
  for (let i = 0; i < 10; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const j = JSON.parse(fs.readFileSync(pkg, "utf8")) as { dependencies?: Record<string, string> };
        if (j.dependencies?.expo) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start);
}

function parseExpoPublicApiUrlFromDotEnv(contents: string): string {
  for (const line of contents.split("\n")) {
    const m = line.match(/^\s*EXPO_PUBLIC_API_URL\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1]!.split("#")[0]!.trim().replace(/\/$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return "";
}

function readApiUrlFromEnvFiles(projectRoot: string): string {
  let last = "";
  /** `.env.production` last so release URL wins over `.env.local` dev overrides. */
  for (const name of [".env", ".env.local", ".env.production"]) {
    const p = path.join(projectRoot, name);
    if (!fs.existsSync(p)) continue;
    const v = parseExpoPublicApiUrlFromDotEnv(fs.readFileSync(p, "utf8"));
    if (v) last = v;
  }
  return last;
}

const projectRoot = findExpoProjectRoot(process.cwd());
/** Env from shell, then from disk (Gradle often runs with cwd `android/` and no dotenv in process). */
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "").trim() || readApiUrlFromEnvFiles(projectRoot);

const config: ExpoConfig = {
  name: "Follow-up",
  slug: "followup-mobile",
  version: "1.0.2",
  orientation: "portrait",
  icon: "./icons/app-icon.png",
  userInterfaceStyle: "dark",
  scheme: "followup",
  extra: {
    apiUrl: apiUrl || undefined,
  },
  splash: {
    image: "./icons/app-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0B0B0F",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.followup.mobile",
    infoPlist: {
      /** Dev / LAN API over HTTP (EXPO_PUBLIC_API_URL); avoids ATS blocking private IPs. */
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ["ShareText"],
        },
      ],
    },
  },
  android: {
    versionCode: 3,
    package: "com.followup.mobile",
    usesCleartextTraffic: true,
    /** Lets the window resize with the keyboard so inputs stay visible (works with KeyboardAwareScrollView). */
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#0B0B0F",
      foregroundImage: "./icons/app-icon.png",
    },
    intentFilters: [
      {
        action: "android.intent.action.SEND",
        category: ["android.intent.category.DEFAULT"],
        data: {
          mimeType: "text/plain",
        },
      },
    ],
  },
  web: {
    favicon: "./icons/app-icon.png",
  },
  plugins: [
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Follow-up to access your photos for your profile picture and ID verification.",
      },
    ],
    [
      "expo-contacts",
      {
        contactsPermission:
          "FollowUp matches your chats with people saved in your contacts so names and photos show when available.",
      },
    ],
  ],
};

export default config;
