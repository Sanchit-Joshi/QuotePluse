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
};

export default nextConfig;
