import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project. Turbopack infers the root from the
    // nearest lockfile and was picking ~/Documents/Dev, which also holds a stale
    // Tailwind v3 postcss.config.js -- that config then failed to resolve
    // `tailwindcss` from a directory where it isn't installed, breaking dev.
    root: __dirname,
  },
};

export default nextConfig;
