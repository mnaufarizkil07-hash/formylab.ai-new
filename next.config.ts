import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/**/*"],
  },
  allowedDevOrigins: [
    "**.run.app",
    "*.run.app",
    "**.google.com",
    "**.googlers.com",
    "**.googleusercontent.com",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;

