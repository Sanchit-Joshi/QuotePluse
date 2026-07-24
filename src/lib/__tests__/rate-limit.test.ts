import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../rate-limit";
import { NextRequest } from "next/server";

function requestFrom(ip: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const req = requestFrom("10.0.0.1");
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(req).allowed).toBe(true);
    }
  });

  it("blocks requests once the per-IP limit is exceeded", () => {
    const req = requestFrom("10.0.0.2");
    let lastResult = { allowed: true };
    for (let i = 0; i < 121; i++) {
      lastResult = checkRateLimit(req);
    }
    expect(lastResult.allowed).toBe(false);
  });

  it("tracks separate IPs independently", () => {
    const reqA = requestFrom("10.0.0.3");
    const reqB = requestFrom("10.0.0.4");
    for (let i = 0; i < 121; i++) checkRateLimit(reqA);
    expect(checkRateLimit(reqB).allowed).toBe(true);
  });
});
