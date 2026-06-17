import type { NextConfig } from "next";
import path from "path";

// Next embeds `polyfill-module` (core-js) into the client bundle unconditionally,
// ignoring browserslist → PageSpeed flags "legacy JavaScript". Alias it to an empty
// module. Cover BOTH bundlers (turbopack for `next build`, webpack for `--webpack`).
// See lesson: nextjs_unconditional_polyfills.
const POLYFILL_MODULE = "next/dist/build/polyfills/polyfill-module";
const EMPTY_POLYFILLS = path.resolve(__dirname, "src/lib/empty-polyfills.js");

// Content-Security-Policy — pragmatic enforce that hardens without breaking prod.
// Next.js injects inline bootstrap scripts and we have no nonce pipeline, so
// `'unsafe-inline'` stays in script/style-src. We still allowlist only the
// external hosts actually loaded today (GTM/GA analytics, unpkg for Swagger UI on
// /api-docs, Sentry) instead of a `https:` wildcard. img-src/connect-src stay
// permissive so avatars, GA pixels, and tenant integrations keep working.
// frame-ancestors/object-src/base-uri give real, cheap wins.
// ⚠️ Must be validated E2E in prod (EasyPanel) — adjust the allowlist if a page
// loads an external script that isn't listed here.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://unpkg.com https://*.sentry.io",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'self'",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // frame-ancestors above already blocks clickjacking on modern browsers; keep
  // X-Frame-Options for legacy ones. No Polaris page is embedded in 3rd-party
  // iframes (the widget injects DOM via script, it is not an iframe), so SAMEORIGIN is safe.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No includeSubDomains/preload: white-label tenants run on their own custom
  // domains — we must not force HSTS onto subdomains we don't control.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    // Was `hostname: "**"` (open to any host). next/image only loads local
    // `/logos/*` today; the only external avatars come from Google OAuth login.
    // Keep a conservative allowlist (Google avatars + own/white-label domains).
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "polarisia.com.br" },
      { protocol: "https", hostname: "*.polarisia.com.br" },
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
