/** @type {import('next').NextConfig} */
const internalApiBase =
  process.env.INTERNAL_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://backend:8000/api"
    : "http://localhost:8100/api");

const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
