import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle for the Docker
  // production image (docs/docker.md) — only the files actually needed at
  // runtime are copied into the final stage.
  output: "standalone",
};

export default nextConfig;
