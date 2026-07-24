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
};

export default nextConfig;
