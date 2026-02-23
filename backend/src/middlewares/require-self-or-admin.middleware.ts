import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"

/**
 * Self or admin. Requires auth.
 * Use after loadTargetUserByUsername (and optionally computeAccessFlags).
 */
export const requireSelfOrAdmin: MiddlewareHandler<AppContext> = async (
  c,
  next
) => {
  const user = c.get("user")

  if (!user) {
    return jsonError(
      c,
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  const target = c.get("targetUser")
  if (!target) {
    return jsonError(
      c,
      { message: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }

  if (user.role === "ADMIN" || user.id === target.id) {
    await next()
    return
  }

  return jsonError(
    c,
    { message: "Forbidden", code: "FORBIDDEN" },
    { status: 403 }
  )
}
