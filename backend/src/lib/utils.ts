import type {
  ContentlessStatusCode,
  ClientErrorStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode,
} from "hono/utils/http-status"
import type { Context } from "hono"

import { HTTPException } from "hono/http-exception"

// Success Shape
type JsonSuccessOptions<
  M extends Record<string, unknown> | undefined = undefined,
> = {
  status: Exclude<SuccessStatusCode, ContentlessStatusCode>
  meta?: M
}

/**
 * Returns a JSON response with a consistent success shape: `{ data, meta? }`.
 * Use for successful route handlers.
 *
 * @example
 * // In a Hono route handler:
 * app.get("/users/:id", async (c) => {
 *   const user = await db.getUser(c.req.param("id"))
 *   return jsonSuccess(c, user, { status: 200 })
 * })
 */
export function jsonSuccess<
  T,
  M extends Record<string, unknown> | undefined = undefined,
>(c: Context, data: T, options?: JsonSuccessOptions<M>) {
  return c.json({ meta: options?.meta, data }, options?.status)
}

// Error Shape
type ErrorCodes =
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INVALID_ID"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"

type JsonErrorBody = {
  errors?: { fieldErrors: Record<string, string[]>; formErrors: string[] }
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
 *   jsonError(c, { code: "VALIDATION_ERROR", message: "Server validation fails", errors: z.flattenError(parsed.error) }, { status: 404 })
 * }
 */
export function jsonError(
  c: Context,
  body: JsonErrorBody,
  options?: JsonErrorOptions
) {
  throw new HTTPException(options?.status, {
    res: c.json(body, options?.status),
  })
}
