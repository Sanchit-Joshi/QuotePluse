/**
 * Structured JSON logger. Categories map to security.md's four log types:
 * request, error, audit, pdf-generation. Field names in REDACTED_KEYS are
 * never logged in full, as defense-in-depth against accidental secret leakage.
 */

type LogCategory = "request" | "error" | "audit" | "pdf" | "info";

const REDACTED_KEYS = new Set(["password", "secret", "token", "key"]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        REDACTED_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v),
      ]),
    );
  }
  return value;
}

function write(category: LogCategory, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    category,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (category === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  request: (meta: Record<string, unknown>) => write("request", "http_request", meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
  audit: (meta: Record<string, unknown>) => write("audit", "audit_event", meta),
  pdf: (meta: Record<string, unknown>) => write("pdf", "pdf_generated", meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
};
