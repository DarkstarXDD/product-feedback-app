import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

/** Fetches user data based on the userId from auth token and add that data to the request context. */
export const currentUserMw: MiddlewareHandler<AppContext> = async (c, next) => {
  const jwtPayload = c.get("jwtPayload")

  if (!jwtPayload.userId) {
    return jsonError(
      c,
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    select: { username: true, email: true, role: true, name: true, id: true },
    where: { id: jwtPayload.userId },
  })

  if (!user) {
    return jsonError(
      c,
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  c.set("user", user)
  await next()
}
