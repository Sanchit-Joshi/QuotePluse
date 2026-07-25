import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle for the Docker
  // production image (docs/docker.md) — only the files actually needed at
  // runtime are copied into the final stage.
  output: "standalone",
  // These ship native binaries / dynamic requires that Next's bundler
  // shouldn't try to trace or inline — keep them as real Node dependencies.
  // See src/services/pdf/pdf.service.ts for why both Playwright variants
  // are present (local/Docker vs. Vercel serverless).
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  // `serverExternalPackages` keeps Next's bundler from touching these
  // packages' JS, but Vercel's own file tracer (@vercel/nft) still decides
  // which of their *non-code* files (browsers.json, native binaries, the
  // bundled Chromium archive) get copied into each route's deployed
  // function — and misses some by default, causing a runtime
  // "Cannot find module '.../playwright-core/browsers.json'" on the PDF
  // routes specifically (see docs/decision-log.md ADR-015). Force-include
  // each package's full directory for exactly the two routes that use it.
  outputFileTracingIncludes: {
    "/api/quotations/[id]/pdf": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
    "/api/invoices/[id]/pdf": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;
