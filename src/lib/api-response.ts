import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ConflictError,
  ImmutableDocumentError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

function errorBody(code: string, message: string, fields?: Record<string, string>) {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}

/**
 * Wraps a Next.js route handler with: CSRF header check for mutating
 * methods, a rate limit, request logging, and mapping of typed domain
 * errors to HTTP status codes (see docs/backend-architecture.md).
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now();
    const method = req.method;
    const path = new URL(req.url).pathname;

    try {
      const mutating = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
      if (mutating && req.headers.get("x-requested-with") !== "XMLHttpRequest") {
        return NextResponse.json(
          errorBody("CSRF_CHECK_FAILED", "Missing required request header"),
          { status: 403 },
        );
      }

      const rate = checkRateLimit(req);
      if (!rate.allowed) {
        return NextResponse.json(
          errorBody("RATE_LIMITED", "Too many requests, please slow down"),
          { status: 429 },
        );
      }

      const res = await handler(req, ctx);
      logger.request({ method, path, status: res.status, durationMs: Date.now() - start });
      return res;
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          fields[issue.path.join(".") || "_"] = issue.message;
        }
        logger.request({ method, path, status: 422, durationMs: Date.now() - start });
        return NextResponse.json(errorBody("VALIDATION_ERROR", "Invalid input", fields), {
          status: 422,
        });
      }
      if (err instanceof ValidationError) {
        logger.request({ method, path, status: 422, durationMs: Date.now() - start });
        return NextResponse.json(
          errorBody("VALIDATION_ERROR", err.message, err.fields),
          { status: 422 },
        );
      }
      if (err instanceof NotFoundError) {
        logger.request({ method, path, status: 404, durationMs: Date.now() - start });
        return NextResponse.json(errorBody("NOT_FOUND", err.message), { status: 404 });
      }
      if (err instanceof ConflictError || err instanceof ImmutableDocumentError) {
        logger.request({ method, path, status: 409, durationMs: Date.now() - start });
        return NextResponse.json(errorBody("CONFLICT", err.message), { status: 409 });
      }

      logger.error("unhandled_route_error", {
        method,
        path,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return NextResponse.json(
        errorBody("INTERNAL_ERROR", "Something went wrong. Please try again."),
        { status: 500 },
      );
    }
  };
}
