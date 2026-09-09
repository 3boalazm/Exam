/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
