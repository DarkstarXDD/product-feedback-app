import type {
  ClientErrorStatusCode,
  ContentlessStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode,
} from "hono/utils/http-status"
import type { Context } from "hono"

import { HTTPException } from "hono/http-exception"

import type { ERROR_CODES } from "@/lib/consts"

// ------------------------- Success Response ----------------------------
export interface JsonSuccessBody<T> {
  data: T
  meta?: Record<string, unknown>
}

type JsonSuccessOptions = {
  status: Exclude<SuccessStatusCode, ContentlessStatusCode>
}

/**
 * Sends a standardized JSON success response with a consistent envelope.
 * If no status is provided, Hono defaults to 200.
 */
export function jsonSuccess<T>(
  c: Context,
  body: JsonSuccessBody<T>,
  options?: JsonSuccessOptions
) {
  return c.json(body, options?.status)
}

// ------------------------- Error Response ----------------------------
export type ErrorCode = (typeof ERROR_CODES)[number]

export interface JsonErrorBody {
  message: string
  code: ErrorCode
  errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
}

type JsonErrorOptions = {
  status: ClientErrorStatusCode | ServerErrorStatusCode
}

/**
 * Throws a Hono HTTPException with a JSON body.
 * Use in route handlers to return a consistent error response and stop execution.
 */
export function jsonError(
  c: Context,
  body: JsonErrorBody,
  options?: JsonErrorOptions
): never {
  throw new HTTPException(options?.status, {
    res: c.json(body, options?.status),
    message: body.message,
  })
}

/** A thin wrapper for `notFound` errors. Returns 404. Wraps `jsonError`. */
export function notFound(c: Context, message = "Not found"): never {
  return jsonError(c, { message, code: "NOT_FOUND" }, { status: 404 })
}

/** A thin wrapper for `unauthorized` errors. Returns 401. Wraps `jsonError`. */
export function unauthorized(
  c: Context,
  message = "Unauthorized",
  errors?: JsonErrorBody["errors"]
): never {
  return jsonError(c, { message, code: "UNAUTHORIZED", errors }, { status: 401 })
}

/** A thin wrapper for `forbidden` errors. Returns 403. Wraps `jsonError`. */
export function forbidden(c: Context, message = "Forbidden"): never {
  return jsonError(c, { message, code: "FORBIDDEN" }, { status: 403 })
}

/** A thin wrapper for `conflict` errors. Returns 409. Wraps `jsonError`. */
export function conflict(
  c: Context,
  message = "Conflict",
  errors?: JsonErrorBody["errors"]
): never {
  return jsonError(c, { message, code: "CONFLICT", errors }, { status: 409 })
}

/** A thin wrapper for `internalError` errors. Returns 500. Wraps `jsonError`. */
export function internalError(
  c: Context,
  message = "Internal server error"
): never {
  return jsonError(c, { message, code: "INTERNAL_ERROR" }, { status: 500 })
}
