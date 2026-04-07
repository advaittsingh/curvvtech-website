/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** ESLint 9 + eslint-config-next 14 use incompatible CLI options during `next build`. */
  eslint: { ignoreDuringBuilds: true },
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
