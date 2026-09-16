import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/hadi-heydari-profile.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    // Allow both 75 (default) and 80 (used by bento-card covers + modal
    // cover for slightly higher quality on retina displays). Next.js 16
    // requires every `quality` value used in <Image> to be explicitly
    // listed here, otherwise it logs a warning in dev and can error in
    // production builds.
    qualities: [75, 80],
  },
};

export default nextConfig;
