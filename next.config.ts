import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
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
