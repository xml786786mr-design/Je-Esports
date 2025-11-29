/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "anyimage.io",
      },
    ],
  },
  // Increase memory limit for the build process
  experimental: {
    turbo: {
      // Disable Turbopack if it's causing issues
      loaders: {
        // Adjust loaders if needed
      },
    },
    // Increase build memory limit
    memoryLimit: 8 * 1024, // 8GB
  },
};

module.exports = nextConfig;
