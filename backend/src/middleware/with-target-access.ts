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

type Options = {
  requireSelfOrAdmin?: boolean
}

/**
 * Looks up targetUser and sets it in context. If `targetUser` is not found throws an error.
 * Computes and sets `isSelf` and `isAdmin`.
 * If `requireSelfOrAdmin` is true and user is not self or admin, throws an error.
 *
 * This middleware should be mounted on a route that has a `:username` param. Otherwise this will throw an error.
 */
export function withTargetAccess(
  options: Options = {}
): MiddlewareHandler<WithTargetAccessContext> {
  return async (c, next) => {
    const username = c.req.param("username")

    if (!username) {
      return internalError(c)
    }

    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    })

    if (!targetUser) {
      return notFound(c, "User not found")
    }

    const user = c.get("user")
    const isAdmin = !!user && user.role === "ADMIN"
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
