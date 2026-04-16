import type { MiddlewareHandler } from "hono"

import { getCookie } from "hono/cookie"
import { verify } from "hono/jwt"

import type { AppContext } from "@/lib/types"
import type { JwtPayload } from "@/lib/types"

import { prisma } from "@/db/client"
import env from "@/lib/env"

/**
 * Resolves the authenticated user from the JWT cookie and hydrates `user` in context.
 * This middleware is non-blocking for public routes: invalid/missing tokens are ignored.
 */
export const resolveAuthUser: MiddlewareHandler<AppContext> = async (
  c,
  next
) => {
  const token = getCookie(c, "token")

  if (!token) {
    await next()
    return
  }

  let jwtPayload: JwtPayload
  try {
    jwtPayload = (await verify(token, env.JWT_SECRET, {
      alg: "HS256",
    })) as JwtPayload
  } catch {
    c.set("jwtPayload", undefined)
    await next()
    return
  }

  const user = await prisma.user.findUnique({
    select: { username: true, email: true, role: true, name: true, id: true },
    where: { id: jwtPayload.userId },
  })

  if (user) {
    c.set("jwtPayload", jwtPayload)
    c.set("user", user)
  } else {
    c.set("jwtPayload", undefined)
  }

  await next()
}
