import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { prisma } from "@/db/client"

/** Fetches user data based on the userId from auth token and add that data to the request context. */
export const hydrateUser: MiddlewareHandler<AppContext> = async (c, next) => {
  const jwtPayload = c.get("jwtPayload")

  if (jwtPayload) {
    const user = await prisma.user.findUnique({
      select: { username: true, email: true, role: true, name: true, id: true },
      where: { id: jwtPayload.userId },
    })

    if (user) {
      c.set("user", user)
    } else {
      c.set("jwtPayload", undefined)
    }
  }

  await next()
}
