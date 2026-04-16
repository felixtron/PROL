import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@prol/ui",
    "@prol/shared",
    "@prol/email",
    "@prol/ai",
    "@prol/content-factory",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudflarestream.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "**.vimeocdn.com" },
    ],
  },
};

export default nextConfig;
