import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,

  // Allow external images from user profile sources and backend
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.kumandra.org',
        pathname: '/files/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
