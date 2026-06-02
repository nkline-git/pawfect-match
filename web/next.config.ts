import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the local network IP during development (Android phone testing)
  ...(process.env.NODE_ENV === 'development' ? { allowedDevOrigins: ['192.168.1.130'] } : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
