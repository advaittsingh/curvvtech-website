/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel Image Optimization returns 402 once the monthly transform
    // quota is hit. These assets already live in /public — serve them as-is.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.curvvtech.in", pathname: "/**" },
      { protocol: "https", hostname: "**.curvvtech.com", pathname: "/**" },
      { protocol: "https", hostname: "**.vercel.app", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
    ],
  },
};

export default nextConfig;
