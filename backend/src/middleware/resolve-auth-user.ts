import type { MiddlewareHandler } from "hono"

import { getCookie } from "hono/cookie"

import type { HonoInstanceVariables } from "@/lib/types"

import { verifyJWT } from "@/lib/session"
import { prisma } from "@/db/client"

type ResolveAuthUserContext = {
  Variables: Pick<HonoInstanceVariables, "jwtPayload" | "user">
}

/**
 * Resolves the authenticated user from the JWT cookie and hydrates `user` in context.
 * This middleware is non-blocking for public routes: invalid/missing tokens are ignored.
 */
export const resolveAuthUser: MiddlewareHandler<
  ResolveAuthUserContext
> = async (c, next) => {
  const token = getCookie(c, "token")

  if (!token) {
    await next()
    return
  }

  const jwtPayload = await verifyJWT(token)

  if (!jwtPayload) {
    c.set("jwtPayload", undefined)
    await next()
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: jwtPayload.userId },
    select: { id: true, name: true, username: true, email: true, role: true },
  })

  if (user) {
    c.set("jwtPayload", jwtPayload)
    c.set("user", user)
  } else {
    c.set("jwtPayload", undefined)
  }

  await next()
}
