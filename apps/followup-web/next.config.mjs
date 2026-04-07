function stripApiOriginSuffix(s) {
  let out = String(s).trim().replace(/\/+$/, '')
  for (let i = 0; i < 4; i++) {
    const before = out
    if (out.endsWith('/api/v1')) out = out.slice(0, -7).replace(/\/+$/, '')
    else if (out.endsWith('/api')) out = out.slice(0, -4).replace(/\/+$/, '')
    if (out === before) break
  }
  return out
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** ESLint 9 + eslint-config-next 14 use incompatible CLI options during `next build`. */
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    const raw =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3001' : '')
    const origin = stripApiOriginSuffix(raw)
    if (!origin) return []
    return [{ source: '/api/v1/:path*', destination: `${origin}/api/v1/:path*` }]
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
