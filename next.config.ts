import type { NextConfig } from "next";
import { NEXT_IMAGE_REMOTE_HOSTS } from './lib/imageHosts'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: NEXT_IMAGE_REMOTE_HOSTS.map(hostname => ({ protocol: 'https', hostname })),
  },
};

export default nextConfig;
