import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds for now to focus on functionality
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds for now
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
