import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow your local network IP to trigger auto-refreshes
  allowedDevOrigins: ['172.22.64.1', 'localhost'],
};

export default nextConfig;