import { randomUUID } from "node:crypto"
import * as z from "zod"

/** Formats the given zod error object using flattenError and return fieldErrors and formErrors in a client friendly manner. */
export function formatZodErrors(errorObj: z.ZodError) {
  return z.flattenError(errorObj)
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
