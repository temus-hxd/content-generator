import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  turbopack: {
    // Empty config to silence the warning
    // Webpack config is still needed for react-pdf compatibility
  },
};

export default nextConfig;
