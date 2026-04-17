import type { MiddlewareHandler } from "hono"

import type { HonoInstanceVariables } from "@/lib/types"

import {
  internalError,
  unauthorized,
  forbidden,
  notFound,
} from "@/lib/responses"
import { prisma } from "@/db/client"

type WithTargetAccessContext = {
  Variables: Pick<HonoInstanceVariables, "targetUser" | "access" | "user">
}

type WithTargetAccessOptions = {
  requireSelfOrAdmin?: boolean
}

/**
 * Loads target user from :username, computes access flags, and optionally enforces self/admin access.
 *
 * - Always sets `targetUser` and `access` when target exists.
 * - If `requireSelfOrAdmin` is enabled, returns 401 (unauthenticated) or 403 (forbidden).
 */
export function withTargetAccess(
  options: WithTargetAccessOptions = {}
): MiddlewareHandler<WithTargetAccessContext> {
  return async (c, next) => {
    const username = c.req.param("username")

    if (!username) {
      // Should never happen in production.
      // If it does, this middleware was mounted on a route that does not have a :username param.
      return internalError(c)
    }

    const targetUser = await prisma.user.findUnique({
      select: { username: true, id: true },
      where: { username },
    })

    if (!targetUser) {
      return notFound(c, "User not found")
    }

    const user = c.get("user")
    const isAdmin = user?.role === "ADMIN"
    const isSelf = !!user && user.id === targetUser.id

    c.set("targetUser", targetUser)
    c.set("access", { isAdmin, isSelf })

    if (options.requireSelfOrAdmin) {
      if (!user) {
        return unauthorized(c)
      }

      if (!isAdmin && !isSelf) {
        return forbidden(c)
      }
    }

    await next()
  }
}
