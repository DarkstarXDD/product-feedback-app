import type { MiddlewareHandler } from "hono"

import type { AppContext, Role } from "@/lib/types"

import { jsonError } from "@/lib/utils"

export function requireRole(
  ...allowedRoles: Role[]
): MiddlewareHandler<AppContext> {
  if (allowedRoles.length === 0) {
    throw new Error("requireRole requires at least one allowed role.")
  }

  return async (c, next) => {
    const user = c.get("user")

    if (!user) {
      return jsonError(
        c,
        { message: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    if (!allowedRoles.includes(user.role)) {
      return jsonError(
        c,
        { message: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      )
    }

    await next()
  }
}
