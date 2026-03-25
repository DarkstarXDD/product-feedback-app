/** Set JWT and Cookie expiration for 7 days. */
export const JWT_TTL_SECONDS = 60 * 60 * 24 * 7

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "INVALID_ID",
  "NOT_FOUND",
  "FORBIDDEN",
  "CONFLICT",
] as const
