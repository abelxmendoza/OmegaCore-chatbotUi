import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    turbo: {}, // ✅ FIXED: Must be an object, not a boolean
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Make @ai-sdk/anthropic optional for webpack
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@ai-sdk/anthropic': 'commonjs @ai-sdk/anthropic',
      });
    }
    return config;
  },
};

export default nextConfig;
