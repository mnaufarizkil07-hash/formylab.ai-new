import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["tesseract.js"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./data/**/*",
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./eng.traineddata",
    ],
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

