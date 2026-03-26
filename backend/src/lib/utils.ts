import type {
  ContentlessStatusCode,
  ClientErrorStatusCode,
  ServerErrorStatusCode,
  SuccessStatusCode,
} from "hono/utils/http-status"
import type { Context } from "hono"

import { HTTPException } from "hono/http-exception"
import { randomUUID } from "node:crypto"
import * as z from "zod"

import { ERROR_CODES } from "@/lib/consts"

// ------------------------- Success Response ----------------------------
export interface JsonSuccessBody<T> {
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
export type ErrorCode = (typeof ERROR_CODES)[number]

export type JsonErrorBody = {
  errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
  code: ErrorCode
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
    message: body.message,
  })
}

/** Formats the given zod error object using flattenError and return fieldErrors and formErrors in a client friendly manner. */
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

/**
 * Generates a URL friendly slug from a post title.
 *
 * The title is normalized by lowercasing, removing special characters,
 * converting spaces to hyphens, collapsing repeated hyphens, and truncating
 * to a fixed length. A short random suffix derived from a UUID is appended
 * to ensure uniqueness.
 *
 * Example:
 * "My First Feature Request!" →
 * "my-first-feature-request-9f3a1c2d"
 *
 * @param title - The post title provided by the client.
 * @returns A slug suitable for storing in the database and using in URLs.
 */
export function generateSlug(title: string): string {
  const MAX_TITLE_LENGTH = 80
  const SUFFIX_LENGTH = 8

  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-") // collapse hyphens
    .slice(0, MAX_TITLE_LENGTH)
    .replace(/-$/, "") // remove trailing hyphen

  const suffix = randomUUID().replace(/-/g, "").slice(0, SUFFIX_LENGTH)

  return `${base}-${suffix}`
}
