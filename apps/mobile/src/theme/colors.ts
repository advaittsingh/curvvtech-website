/**
 * Product palette — dark UI
 * Primary / accent: #A855F7 · Background: #0B0B0F · Card: #121218
 */
export const colors = {
  primary: "#A855F7",
  background: "#0B0B0F",
  card: "#121218",

  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",

  hot: "#EF4444",
  warm: "#F59E0B",
  cold: "#3B82F6",

  /** Text on primary (and other filled) buttons */
  onPrimary: "#FFFFFF",

  // —— Aliases used across screens (map to tokens above) ——
  bg: "#0B0B0F",
  bgSoft: "#0F0F14",
  surface: "#121218",
  surfaceElevated: "#1C1C26",
  surfaceHover: "#22222C",
  border: "#27272A",

  text: "#FFFFFF",
  textMuted: "#A1A1AA",
  /** Icon / ink on light accent fills (prefer onPrimary on purple) */
  black: "#0B0B0F",

  accent: "#A855F7",
  accentSecondary: "#A78BFA",
  accentMuted: "#5B21B6",
  /** Home “follow-ups today” emphasis */
  followUp: "#F59E0B",
  closed: "#A1A1AA",
} as const;
