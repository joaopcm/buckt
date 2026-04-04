export class BucktError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BucktError";
    this.status = status;
  }
}

export class NotFoundError extends BucktError {
  constructor(message = "Not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends BucktError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends BucktError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends BucktError {
  constructor(message = "Validation failed") {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class PaymentRequiredError extends BucktError {
  constructor(message = "Payment required") {
    super(message, 402);
    this.name = "PaymentRequiredError";
  }
}

export class TimeoutError extends BucktError {
  constructor(message = "Request timeout") {
    super(message, 408);
    this.name = "TimeoutError";
  }
}

export class ConflictError extends BucktError {
  constructor(message = "Conflict") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends BucktError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}
