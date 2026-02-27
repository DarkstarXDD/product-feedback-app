import type { Context } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"

/**
 * Returns the `user` set by middleware (for example `resolveAuthUser`).
 * Throws a standardized internal error if middleware wiring is missing.
 * If middleware wiring is correct ideally this function should never throw.
 */
export function getUserOrThrow(c: Context<AppContext>) {
  const user = c.get("user")

  if (!user) {
    return jsonError(
      c,
      { message: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
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
    return jsonError(
      c,
      { message: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }

  return targetUser
}
