import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything here is live data read from disk per request, so no static prerendering.
  cacheComponents: false,
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
