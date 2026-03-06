/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production" && process.env.STANDALONE === "true";

const nextConfig = {
  ...(isProd && { output: "standalone" }),
};

module.exports = nextConfig;
