import type { MiddlewareHandler } from "hono"

import type { AuthUser, Role } from "@/lib/types"

import { unauthorized, forbidden } from "@/lib/responses"

type RequireRoleContext = {
  Variables: { user: AuthUser }
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!user) {
      return unauthorized(c)
    }

    if (!allowedRoles.includes(user.role)) {
      return forbidden(c)
    }

    await next()
  }
}

/**
 * This middleware guarantees `user` is defined. If not, it returns 401 before calling next().
 * To reflect that guarantee, `user` is typed as `AuthUser` (not `AuthUser | undefined`) so
 * downstream handlers in the chain see a non-optional user after this middleware runs.
 *
 * The trade-off: TypeScript now considers `user` always defined inside this body too,
 * making the `if (!user)` guard above appear redundant. That's why the eslint-disable.
 */
