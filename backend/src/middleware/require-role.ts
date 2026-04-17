import type { MiddlewareHandler } from "hono"

import type { HonoInstanceVariables, Role } from "@/lib/types"
import type {} from "@/lib/types"

import { unauthorized, forbidden } from "@/lib/responses"

type RequireRoleContext = {
  Variables: Pick<HonoInstanceVariables, "jwtPayload" | "user">
}

/**
 * Requires an authenticated user and enforces that the user's role is one of the allowed roles.
 * Returns 401 if unauthenticated and 403 if authenticated but not permitted.
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
