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
      // Shop page's static Unsplash product photos
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Shop page's store-location static map thumbnails
      { protocol: 'https', hostname: 'staticmap.openstreetmap.de' },
    ],
    // Pet photos from RescueGroups (and any admin/user-pasted URL — sponsored
    // ads, store products) render via next/image with `unoptimized` rather
    // than being added here: RescueGroups' API doesn't guarantee every photo
    // comes from one fixed CDN host, and a strict allowlist miss would mean
    // a broken pet photo in production, which is worse than skipping
    // optimization for those specific images.
  },
};

export default nextConfig;
