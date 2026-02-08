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

export function jsonSuccess<
  T,
  M extends Record<string, unknown> | undefined = undefined,
>(c: Context, data: T, options: JsonSuccessOptions<M>) {
  return c.json({ meta: options.meta, data }, options.status)
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
  fieldErrors?: Record<string, string[]>
  code: ErrorCodes
  message: string
}

type JsonErrorOptions = {
  status: ClientErrorStatusCode | ServerErrorStatusCode
}

export function jsonError(
  c: Context,
  body: JsonErrorBody,
  options: JsonErrorOptions
) {
  throw new HTTPException(options.status, { res: c.json(body, options.status) })
}
