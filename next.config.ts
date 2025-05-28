const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/favicon\.ico$/],
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
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.twimg.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "challenges.cloudflare.com",
        pathname: "**",
      },
      // IPFS Gateways
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "gateway.ipfs.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.mypinata.cloud",
        pathname: "**",
      },
      // Alchemy NFT CDN
      {
        protocol: "https",
        hostname: "nft-cdn.alchemy.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
      // Common NFT image hosts
      {
        protocol: "https",
        hostname: "*.arweave.net",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.opensea.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "opensea.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.magiceden.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "magiceden.io",
        pathname: "**",
      },
      // Generic patterns for NFT metadata
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "**",
      },
      // Allow any HTTPS domain for NFT images (be careful with this in production)
      {
        protocol: "https",
        hostname: "**",
        pathname: "**",
      },
    ],
  },
  typescript: {
    // Exclude Supabase Edge Functions from TypeScript checking
    ignoreBuildErrors: true,
  },
  // Add redirect from /login to root
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/",
        permanent: true,
      },
    ];
  },
  // Add Privy-recommended Content Security Policy
  // https://docs.privy.io/guide/security/implementation/csp
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://privy.io https://*.privy.io https://challenges.cloudflare.com https://telegram.org;
              script-src-elem 'self' 'unsafe-inline' https://auth.privy.io https://privy.io https://*.privy.io https://challenges.cloudflare.com https://telegram.org;
              style-src 'self' 'unsafe-inline' https://privy.io https://*.privy.io;
              img-src 'self' data: blob: https: http:;
              font-src 'self' data:;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'none';
              child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org;
              frame-src https://auth.privy.io https://privy.io https://*.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://oauth.telegram.org;
              connect-src 'self' https://privy.io https://*.privy.io https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.relay.link https://api.testnets.relay.link https://*.supabase.co https://falling-practical-rain.monad-testnet.quiknode.pro https://testnet-rpc.monad.xyz https://rpc.zerodev.app https://*.zerodev.app https://paymaster.biconomy.io https://*.biconomy.io https://api.zerion.io;
              worker-src 'self';
              manifest-src 'self'
            `.replace(/\n\s*/g, ""),
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
