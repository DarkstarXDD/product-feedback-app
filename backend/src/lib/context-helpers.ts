import type { Context } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"

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
