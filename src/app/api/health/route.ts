import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      // TEMP diagnostic (ADR-015) — confirms which commit is actually
      // deployed. Remove once the production PDF issue is resolved.
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
    });
  } catch {
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
