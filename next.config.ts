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
  webpack: (config, { webpack }) => {
    // Make @ai-sdk/anthropic optional - ignore if not available
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@ai-sdk\/anthropic$/,
        contextRegExp: /lib\/ai\/providers/,
      })
    );
    return config;
  },
};

export default nextConfig;
