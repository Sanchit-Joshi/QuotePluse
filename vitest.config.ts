import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { config } from "dotenv";

config();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Service-layer integration tests run several sequential Prisma
    // transactions (createDraft -> finalize -> status change, etc.)
    // against a real Postgres instance. Against a hosted DB reached over
    // the public internet (see docs/decision-log.md ADR-012) that can
    // comfortably exceed vitest's 5s default per-test timeout.
    testTimeout: 20000,
    // Each test file gets its own PrismaClient (module state isn't shared
    // across vitest's worker threads/processes), so running files in
    // parallel opens many simultaneous connections to the hosted Supabase
    // pooler — enough to exceed its connection limit and cause sporadic
    // "Unable to start a transaction" failures under full-suite runs (see
    // docs/decision-log.md ADR-012). Running files sequentially trades
    // suite wall-clock time for reliability, which matters more here.
    fileParallelism: false,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/services/**", "src/validators/**", "src/lib/**"],
      exclude: ["src/generated/**"],
    },
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
