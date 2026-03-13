/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const internalApiUrl = process.env.INTERNAL_API_URL || "http://localhost:8000/api";

const nextConfig = {
  ...(isProd && { output: "standalone" }),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
