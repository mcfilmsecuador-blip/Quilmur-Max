import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb", // PDFs técnicos de Quilmur pueden pesar varios MB
    },
  },
};

export default nextConfig;
