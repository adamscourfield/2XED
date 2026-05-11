const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicit root keeps tracing stable across workspace/tooling contexts.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/150/**',
      },
    ],
  },
  allowedDevOrigins: [
    '*.replit.dev',
    '*.janeway.replit.dev',
    '127.0.0.1',
  ],
};

module.exports = nextConfig;
