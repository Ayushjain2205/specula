import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Set output tracing root to client directory to avoid workspace root warning
  // This tells Next.js to use the client directory as the root for file tracing
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
