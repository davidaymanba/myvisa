import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const API_URL = process.env.API_URL ?? "http://localhost:4100";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myvisa.sa";
const HTTPS = SITE_URL.startsWith("https://");
/** Browsers upload documents straight to object storage with presigned URLs (S3/R2; SeaweedFS locally). */
const UPLOAD_ORIGIN = process.env.UPLOAD_ORIGIN ?? "http://localhost:9010";
const DEV = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy. Scripts and styles allow 'unsafe-inline' because Next.js injects inline bootstrap
 * scripts into statically generated pages (nonces would force every page to render dynamically); there is
 * no 'unsafe-eval' outside development, no third-party script origin, and nothing may frame the site.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "font-src 'self' data:",
  `connect-src 'self' ${UPLOAD_ORIGIN}${DEV ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(HTTPS ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  ...(HTTPS ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker builds ship the self-contained server (apps/web/Dockerfile); Vercel and `next start` don't need it.
  ...(process.env.NEXT_OUTPUT_STANDALONE ? { output: "standalone" as const } : {}),
  // Monorepo root, so file tracing includes workspace packages.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: ["@myvisa/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui", "motion"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The browser only ever talks to this origin: /api/v1/* is proxied to the NestJS API, so auth cookies
  // are first-party and no CORS is involved.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default withNextIntl(config);
