import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.postimg.cc", pathname: "/bJVXx1c3/qurbani-hat.png" },
      { protocol: "https", hostname: "i.postimg.cc", pathname: "/DZpVr1kg/dragon-news.png" },
      { protocol: "https", hostname: "certificates.cs50.io", pathname: "/009a021f-dd2c-40fc-8f4c-77b9e511e992.png", search: "?size=A4" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/AforArdi/mohammadardi/refs/heads/main/images/ROBOTICS.png" },
    ],
    formats: ["image/webp"],
  },
};

export default nextConfig;
