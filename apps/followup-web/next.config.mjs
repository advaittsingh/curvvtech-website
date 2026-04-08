/** @type {import('next').NextConfig} */

/** Origin only — same rules as `lib/followup-api.ts` `getApiOrigin()`. */
function stripApiOriginSuffix(u) {
  let s = String(u || '')
    .trim()
    .replace(/\/+$/, '')
  for (let i = 0; i < 4; i++) {
    const before = s
    if (s.endsWith('/api/v1')) s = s.slice(0, -7).replace(/\/+$/, '')
    else if (s.endsWith('/api')) s = s.slice(0, -4).replace(/\/+$/, '')
    if (s === before) break
  }
  return s
}

const unifiedApiOrigin = stripApiOriginSuffix(
  process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ''
)

if (process.env.VERCEL_ENV === 'production' && !unifiedApiOrigin) {
  throw new Error(
    'followup-web production build: set API_PROXY_TARGET or NEXT_PUBLIC_API_URL to the unified API origin (e.g. https://api.curvvtech.in).'
  )
}

const nextConfig = {
  /** Inlines at build so client `getApiOrigin()` matches rewrite target when only API_PROXY_TARGET is set. */
  env: {
    NEXT_PUBLIC_UNIFIED_API_ORIGIN: unifiedApiOrigin,
  },
  reactStrictMode: true,
  /** ESLint 9 + eslint-config-next 14 use incompatible CLI options during `next build`. */
  eslint: { ignoreDuringBuilds: true },
  /**
   * Proxy `/api/v1/*` to the unified API **before** filesystem / App Route matching.
   * Without this, some deployments only matched `app/api/v1/[[...path]]` inconsistently → 404.
   * Do not add `/api/auth/*` here: this app has local `app/api/auth/*` (Cognito); clients use
   * `getApiOrigin() + '/api/auth/*'` for the Express API.
   */
  async rewrites() {
    if (!unifiedApiOrigin) return []
    return {
      beforeFiles: [
        {
          source: '/api/v1/:path*',
          destination: `${unifiedApiOrigin}/api/v1/:path*`,
        },
      ],
    }
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: 'removeViewBox',
                  active: false,
                },
              ],
            },
          },
        },
      ],
    })
    return config
  },
}

export default nextConfig
