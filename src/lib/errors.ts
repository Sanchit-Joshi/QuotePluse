/**
 * Typed domain errors thrown by services. Route handlers map these to HTTP
 * responses via `withErrorHandling` (see api-response.ts) so services never
 * need to know about HTTP status codes.
 */

export class ValidationError extends Error {
  readonly fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ImmutableDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImmutableDocumentError";
  }
}
