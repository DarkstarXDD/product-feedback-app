// Arguments: Role needed for the route USER or ADMIN

import type { MiddlewareHandler } from "hono"

import type { AppContext } from "@/lib/types"

import { jsonError } from "@/lib/utils"
// Grab the current authed users route from context c.get("currentUser")

// role required will be an array. ["USER", "ADMIN"]

// Check if the current users role is in that array

// If not in that array, user is not authorized.

// For example, if user has role "USER" and array only contains ["ADMIN"], user is not authorized.

// If not authorized return a jsonError(unauthorized)

// If authorized, await next()

export function authorizationMw(
  roles: ("ADMIN" | "USER")[]
): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const user = c.get("user")

    if (!user) {
      return jsonError(
        c,
        { message: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const isAuthorized = roles.includes(user.role)

    console.log(c.get("user"))
    console.log(isAuthorized)

    if (!isAuthorized) {
      return jsonError(
        c,
        { message: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    await next()
  }
}
