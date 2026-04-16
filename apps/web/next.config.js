/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prol/ui", "@prol/shared", "@prol/email", "@prol/ai", "@prol/content-factory"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudflarestream.com" },
    ],
  },
};

export default nextConfig;
