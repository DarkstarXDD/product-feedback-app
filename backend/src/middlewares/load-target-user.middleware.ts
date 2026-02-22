import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"
import { prisma } from "@/db/client"

/** Loads the target user for routes that have :username. */
export const loadTargetUserByUsername: MiddlewareHandler<AppContext> = async (
  c,
  next
) => {
  const username = c.req.param("username")

  if (!username) {
    return jsonError(
      c,
      { message: "Server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }

  const user = await prisma.user.findUnique({
    select: { username: true, id: true },
    where: { username },
  })

  if (!user) {
    return jsonError(
      c,
      { message: "User not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  c.set("targetUser", user)
  console.log(user)
  await next()
}
