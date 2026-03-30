import type { JwtVariables } from "hono/jwt"

export type JwtPayload = { userId: string; exp: number }

export type Role = "ADMIN" | "USER"

type AuthUser = {
  username: string
  email: string
  name: string
  id: string
  role: Role
}

type HonoInstanceVariables = {
  access?: {
    isAdmin: boolean
    isSelf: boolean
  }

  targetUser?: {
    username: string
    id: string
  }

  user?: AuthUser
} & JwtVariables<JwtPayload | undefined>

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
