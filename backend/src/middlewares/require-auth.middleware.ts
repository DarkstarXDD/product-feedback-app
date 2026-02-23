import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"

/** Requires an authenticated user to be present in request context. */
export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const user = c.get("user")

  if (!user) {
    return jsonError(
      c,
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  await next()
}
