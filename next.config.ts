import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://cricket-bet-app-75a4b.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
