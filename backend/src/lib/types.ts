import type { JwtVariables } from "hono/jwt"

import type { JWTPayload } from "@/lib/session"

export type Role = "ADMIN" | "USER"

export type AuthUser = {
  username: string
  email: string
  name: string
  id: string
  role: Role
}

export type HonoInstanceVariables = {
  user?: AuthUser
  access: { isAdmin: boolean; isSelf: boolean }
  targetUser: { id: string; username: string }
} & JwtVariables<JWTPayload | undefined>

export type AppContext = {
  Variables: HonoInstanceVariables
}

/**
 * Recursively replaces `Date` with `string` to model JSON serialization.
 * Prisma returns `Date` objects, but they serialize to ISO strings over HTTP.
 */
export type Serialize<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<Serialize<U>>
    : T extends object
      ? { [K in keyof T]: Serialize<T[K]> }
      : T
