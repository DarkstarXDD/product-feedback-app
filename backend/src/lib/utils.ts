import { randomUUID } from "node:crypto"
import * as z from "zod"

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
