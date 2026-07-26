import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's own build/deploy pipeline expects to trace and package each
  // route as its own function; `output: "standalone"` makes Next produce a
  // single self-contained server bundle instead, which conflicts with that
  // (observed as `vercel build` failing with "Unable to find lambda for
  // route: /invoices/new", and as the deployed PDF routes missing
  // playwright-core's browsers.json at runtime — see ADR-015). Standalone
  // output is only needed for the Docker production image (docs/docker.md);
  // Vercel must use its own default output instead.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  // These ship native binaries / dynamic requires that Next's bundler
  // shouldn't try to trace or inline — keep them as real Node dependencies.
  // See src/services/pdf/pdf.service.ts for why both Playwright variants
  // are present (local/Docker vs. Vercel serverless).
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  // `serverExternalPackages` alone isn't enough for @sparticuz/chromium: it
  // resolves its own bundled binary via a *relative path from its own file*
  // at runtime, which breaks the moment webpack touches it at all (their
  // docs: "must be marked as external ... relies on relative path
  // resolution"). Push it onto webpack's own `externals` list directly so
  // it's `require()`d from node_modules as-is, never relocated/rewritten.
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "@sparticuz/chromium"];
    return config;
  },
  // Marking a package external only stops webpack from bundling its JS —
  // Vercel's file tracer independently decides which of the package's
  // *actual files* get copied into each route's deployed function, and
  // still misses @sparticuz/chromium's bin/ directory (the Chromium
  // archive itself) by default. Force-include both packages' full
  // directories for exactly the two routes that use them.
  outputFileTracingIncludes: {
    "/api/quotations/[id]/pdf": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
    "/api/invoices/[id]/pdf": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
    "/api/purchase-orders/[id]/pdf": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;
