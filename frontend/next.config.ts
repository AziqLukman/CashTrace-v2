import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  experimental: {
    allowedDevOrigins: ["192.168.68.106:3000", "192.168.68.106"],
  },
};

export default withPWA(nextConfig);
