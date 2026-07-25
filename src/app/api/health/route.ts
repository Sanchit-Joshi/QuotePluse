import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      // Confirms which commit is actually live — came in handy diagnosing
      // a production-only deploy issue (ADR-015) and is cheap to keep.
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
    });
  } catch {
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
