export function titleCaseWords(s: string) {
  return s
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function displayNameFromIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return "User";
  const local = trimmed.includes("@") ? trimmed.split("@")[0]! : trimmed;
  const named = titleCaseWords(local.replace(/\d+/g, " ").trim());
  return named || "User";
}

export function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}
