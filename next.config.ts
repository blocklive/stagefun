const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "*.supabase.co",
        pathname: "**",
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
