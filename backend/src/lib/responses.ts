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
