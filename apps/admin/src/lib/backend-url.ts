/**
 * Some production APIs are reverse-proxied without the `/api` segment
 * (e.g. only `/auth/*` and `/v1/*` are exposed, not `/api/auth/*`).
 *
 * - `VITE_STRIP_API_PREFIX=true` — use `/auth/login`, `/admin/blogs`, etc.
 * - `VITE_STRIP_API_PREFIX=false` — force `/api/auth/login`, `/api/admin/blogs`.
 * - Unset — strip automatically when `VITE_BACKEND_URL` contains `api.curvvtech.in`.
 */
const RAW_BASE = (
  import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

function stripApiPrefixEnabled(): boolean {
  const v = import.meta.env.VITE_STRIP_API_PREFIX
  if (v === 'true') return true
  if (v === 'false') return false
  return RAW_BASE.toLowerCase().includes('api.curvvtech.in')
}

/**
 * @param path Must start with `/api/...` for admin + auth calls from this app.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (!stripApiPrefixEnabled()) {
    return `${RAW_BASE}${p}`
  }
  if (p.startsWith('/api/')) {
    return `${RAW_BASE}${p.slice(4)}`
  }
  return `${RAW_BASE}${p}`
}

/**
 * Socket.IO must hit the API host root (path `/socket.io/`), not a REST prefix
 * like `.../api`. Strip a trailing `/api` if env was set that way.
 */
export function chatSocketUrl(): string {
  const base = RAW_BASE.replace(/\/api\/?$/i, '')
  try {
    const u = new URL(base)
    return u.origin
  } catch {
    return base
  }
}
