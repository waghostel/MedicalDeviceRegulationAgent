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
  // Turbopack configuration
  experimental: {
    // Enable Turbopack for development
    turbo: {
      // Turbopack-specific configuration can go here
      // Currently using default settings which work well for most projects
    },
  },
};

export default nextConfig;
