import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push({ "pdf-parse": "commonjs pdf-parse" });
    return config;
  }
};

export default nextConfig;
