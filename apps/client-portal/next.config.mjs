/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    return [{ source: "/api-proxy/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
