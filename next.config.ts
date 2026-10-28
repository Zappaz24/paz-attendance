import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components stay off: every screen is session-scoped (admin-only), so
   * request-time rendering is the honest model here. See docs/adr/0002.
   */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
