import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"
import type { Role } from "@/lib/types"

import { jsonError } from "@/lib/utils"

export function requireRole(
  ...allowedRoles: Role[]
): MiddlewareHandler<AppContext> {
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
