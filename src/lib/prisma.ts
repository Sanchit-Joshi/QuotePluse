import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    // Default 5s/2s (maxWait/timeout) is too tight for a hosted Postgres
    // reached over the public internet (e.g. Supabase's pooler from a
    // Vercel region on the other side of the world) — numbering allocation
    // + document + line items + version snapshot all happen in one
    // transaction, so a few hundred ms of added round-trip latency per
    // statement can blow the default budget. See docs/decision-log.md ADR-012.
    transactionOptions: { maxWait: 15000, timeout: 20000 },
  });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
