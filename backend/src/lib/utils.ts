import type {
  ContentlessStatusCode,
  ClientErrorStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode,
} from "hono/utils/http-status"
import type { Context } from "hono"

import { HTTPException } from "hono/http-exception"
import * as z from "zod"

// ------------------------- Success Response ----------------------------
interface JsonSuccessBody<T> {
  meta?: Record<string, unknown>
  data: T
}

type JsonSuccessOptions = {
  status: Exclude<SuccessStatusCode, ContentlessStatusCode>
}

/**
 * Sends a standardized JSON success response with a consistent envelope.
 *
 * Wraps the response in a `{ data, meta? }` shape so all routes return
 * the same structure. If no status is provided, Hono defaults to 200.
 *
 * @typeParam T - Type of the response data payload.
 * @param c - Hono context.
 * @param body - Response body containing `data` and optional `meta`.
 * @param options - Optional HTTP status configuration.
 *
 * @example
 * return jsonSuccess(c, {
 *   data: user
 * })
 *
 * @example
 * return jsonSuccess(c, {
 *   data: users,
 *   meta: { total: 42, page: 1 }
 * }, { status: 200 })
 */
export function jsonSuccess<T>(
  c: Context,
  body: JsonSuccessBody<T>,
  options?: JsonSuccessOptions
) {
  return c.json(body, options?.status)
}

// ------------------------- Error Response ----------------------------
type ErrorCodes =
  | "VALIDATION_ERROR"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INVALID_ID"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"

export type JsonErrorBody = {
  errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
  code: ErrorCodes
  message: string
}

type JsonErrorOptions = {
  status: ClientErrorStatusCode | ServerErrorStatusCode
}

/**
 * Throws an HTTPException with a JSON body shaped as `{ code, message, errors? }`.
 * Use in route handlers to return a consistent error response and stop execution.
 *
 * @example
 * // In a Hono route handler:
 * if (!parsed.success) {
 *   jsonError(c, { code: "VALIDATION_ERROR", message: "Server validation fails", errors: z.flattenError(parsed.error) }, { status: 400 })
 * }
 */
export function jsonError(
  c: Context,
  body: JsonErrorBody,
  options?: JsonErrorOptions
): never {
  throw new HTTPException(options?.status, {
    res: c.json(body, options?.status),
  })
}

export function formatZodErrors(errorObj: z.ZodError) {
  return z.flattenError(errorObj)
}

/**
 * Prisma doesn't provide a way to retreive the exact field name that violates the unique constraint.
 * So we need to manually check whether there are existing entries for the given unique fields.
 * This function is a hack found here: https://github.com/prisma/prisma/issues/28281#issuecomment-3857604910
 */
export function getPrismaUniqueConstraintViolationField(err: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const fields = (err as any)?.meta?.driverAdapterError?.cause?.constraint
    ?.fields

  const message = Array.isArray(fields)
    ? fields.map((f: string) => f.replace(/"/g, "")).join(", ")
    : "unique constraint violation"

  return message
}
