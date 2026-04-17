import type { MiddlewareHandler } from "hono"

import type { HonoInstanceVariables, Role } from "@/lib/types"
import type {} from "@/lib/types"

import { unauthorized, forbidden } from "@/lib/responses"

type RequireRoleContext = {
  Variables: Pick<HonoInstanceVariables, "user">
}

/**
 * Guarantees that `user` exists with the required roles.
 * If user doesn't exist returns 401. If user doesn't have the role returns 403.
 */
export function requireRole(
  ...allowedRoles: Role[]
): MiddlewareHandler<RequireRoleContext> {
  if (allowedRoles.length === 0) {
    throw new Error("requireRole requires at least one allowed role.")
  }

  return async (c, next) => {
    const user = c.get("user")

    if (!user) {
      return unauthorized(c)
    }

    if (!allowedRoles.includes(user.role)) {
      return forbidden(c)
    }

    await next()
  }
}
