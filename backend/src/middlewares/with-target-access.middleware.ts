import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/responses"
import { prisma } from "@/db/client"

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
): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const username = c.req.param("username")

    if (!username) {
      return jsonError(
        c,
        { message: "Invalid route configuration", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      select: { username: true, id: true },
      where: { username },
    })

    if (!targetUser) {
      return jsonError(
        c,
        { message: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    const user = c.get("user")
    const isAdmin = user?.role === "ADMIN"
    const isSelf = !!user && user.id === targetUser.id

    c.set("targetUser", targetUser)
    c.set("access", { isAdmin, isSelf })

    if (options.requireSelfOrAdmin) {
      if (!user) {
        return jsonError(
          c,
          { message: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 }
        )
      }

      if (!isAdmin && !isSelf) {
        return jsonError(
          c,
          { message: "Forbidden", code: "FORBIDDEN" },
          { status: 403 }
        )
      }
    }

    await next()
  }
}
