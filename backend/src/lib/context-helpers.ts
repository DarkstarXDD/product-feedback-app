import type { Context } from "hono"

import type { AppContext } from "@/lib/types"

import { internalError } from "@/lib/responses"

/**
 * Returns the `user` set by middleware (for example `resolveAuthUser`).
 * Throws a standardized internal error if middleware wiring is missing.
 * If middleware wiring is correct ideally this function should never throw.
 */
export function getUserOrThrow(c: Context<AppContext>) {
  const user = c.get("user")

  if (!user) {
    // Should never happen in production.
    // If it does, `resolveAuthUser` middleware was not run before this route handler.
    return internalError(c)
  }
  return user
}

/**
 * Returns the `targetUser` set by middleware (for example `withTargetAccess`).
 * Throws a standardized internal error if middleware wiring is missing.
 */
export function getTargetUserOrThrow(c: Context<AppContext>) {
  const targetUser = c.get("targetUser")

  if (!targetUser) {
    // Should never happen in production.
    // If it does, `withTargetAccess` middleware was not run before this route handler.
    return internalError(c)
  }
  return targetUser
}
