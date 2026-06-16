import type { NextConfig } from "next";
import path from "path";

// Next embeds `polyfill-module` (core-js) into the client bundle unconditionally,
// ignoring browserslist → PageSpeed flags "legacy JavaScript". Alias it to an empty
// module. Cover BOTH bundlers (turbopack for `next build`, webpack for `--webpack`).
// See lesson: nextjs_unconditional_polyfills.
const POLYFILL_MODULE = "next/dist/build/polyfills/polyfill-module";
const EMPTY_POLYFILLS = path.resolve(__dirname, "src/lib/empty-polyfills.js");

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  serverExternalPackages: ["bcryptjs", "pg"],
  // Tree-shake heavy barrel-export libs so only the icons/charts actually used
  // ship to the client.
  experimental: {
    optimizePackageImports: [
      "recharts",
      "framer-motion",
      "react-syntax-highlighter",
      "lucide-react",
    ],
  },
  turbopack: {
    resolveAlias: {
      [POLYFILL_MODULE]: EMPTY_POLYFILLS,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      [POLYFILL_MODULE]: EMPTY_POLYFILLS,
    };
    return config;
  },
};

// Wrap with Sentry only when DSN is configured and package is available
let config: NextConfig = nextConfig;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withSentryConfig } = require("@sentry/nextjs");
    config = withSentryConfig(nextConfig, {
      silent: true,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
      disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
    });
  } catch {
    // @sentry/nextjs not installed or DSN not configured — skip silently
  }
}

export default config;
